import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { dec, redondear } from "@/lib/servidor";

/**
 * Lo propio de las acciones de la cervecería: numeración de tickets y los
 * movimientos de stock. El manejo de errores y los decimales son los mismos
 * de todo el sistema y viven en `@/lib/servidor`.
 */

/**
 * Número de ticket correlativo por año.
 *
 * El contador vive en `config` y se incrementa con un solo UPDATE atómico: dos
 * cajas cobrando a la vez no pueden sacar el mismo número. La primera vez del
 * año arranca del ticket más alto que ya exista, así no choca con los que
 * dejó la semilla.
 */
export async function siguienteTicket(tx: Prisma.TransactionClient): Promise<string> {
  const anio = new Date().getFullYear();
  const clave = `ticket_bar_${anio}`;
  const prefijo = `CV-${anio}-%`;

  const filas = await tx.$queryRaw<{ valor: string }[]>`
    INSERT INTO config (clave, valor)
    VALUES (
      ${clave},
      (SELECT (coalesce(max(split_part(ticket, '-', 3)::int), 0) + 1)::text
       FROM ventas_bebida WHERE ticket LIKE ${prefijo})
    )
    ON CONFLICT (clave) DO UPDATE SET valor = (config.valor::int + 1)::text
    RETURNING valor
  `;

  return `CV-${anio}-${String(Number(filas[0].valor)).padStart(5, "0")}`;
}

/**
 * Margen para las transacciones del bar. El límite que trae Prisma es de 5 s y
 * una venta hace una docena de idas y vueltas a bilbo, que está a unos 200 ms:
 * un pedido grande se pasaba y la venta se caía sin motivo visible.
 */
export const TX = { timeout: 30_000, maxWait: 15_000 };

export type ItemPedido = { productoId: string; cantidad: number };

export const esquemaItems = z
  .array(
    z.object({
      productoId: z.string().min(1),
      cantidad: z.number().int().positive().max(999),
    }),
  )
  .min(1, "No hay productos en el pedido.");

export type LineaArmada = {
  productoId: string;
  nombre: string;
  precioUnit: Prisma.Decimal;
  cantidad: number;
  total: Prisma.Decimal;
};

/**
 * Descuenta el stock de un pedido y deja asentado cada movimiento.
 *
 * Los productos de barril sacan litros de los barriles conectados —del más
 * lleno al más vacío, para no dejar puntas sin servir— y el resto descuenta
 * unidades. Va siempre dentro de una transacción: si un producto no alcanza,
 * no se registra nada.
 */
export async function descontarStock(
  tx: Prisma.TransactionClient,
  pedidos: ItemPedido[],
  contexto: { ventaId?: string; motivo: string; usuario: string | null },
): Promise<{ lineas: LineaArmada[]; total: number; litros: number }> {
  const productos = await tx.productoBebida.findMany({
    where: { id: { in: pedidos.map((p) => p.productoId) } },
  });
  const porId = new Map(productos.map((p) => [p.id, p]));

  let total = 0;
  let litrosPedidos = 0;
  const lineas: LineaArmada[] = [];

  for (const p of pedidos) {
    const prod = porId.get(p.productoId);
    if (!prod) throw new Error("Un producto del pedido ya no existe.");

    if (prod.deBarril) {
      litrosPedidos += prod.litros * p.cantidad;
    } else if (prod.stock < p.cantidad) {
      throw new Error(`Sin stock de ${prod.nombre} (quedan ${prod.stock}).`);
    }

    const subtotal = Number(prod.precio) * p.cantidad;
    total += subtotal;
    lineas.push({
      productoId: prod.id,
      nombre: `${prod.nombre} ${prod.presentacion}`,
      precioUnit: prod.precio,
      cantidad: p.cantidad,
      total: dec(subtotal),
    });
  }

  if (litrosPedidos > 0) {
    const barriles = await tx.barril.findMany({
      where: { conectado: true },
      orderBy: { restanteL: "desc" },
    });
    const disponible = barriles.reduce((s, b) => s + b.restanteL, 0);
    if (disponible < litrosPedidos) {
      throw new Error(
        `No alcanzan los litros: pedís ${litrosPedidos.toFixed(2)} L y quedan ${disponible.toFixed(2)} L.`,
      );
    }
    let resta = litrosPedidos;
    for (const b of barriles) {
      if (resta <= 0.0001) break;
      const saca = Math.min(b.restanteL, resta);
      resta = redondear(resta - saca);
      const queda = redondear(b.restanteL - saca);
      await tx.barril.update({ where: { id: b.id }, data: { restanteL: queda } });
      await tx.movimientoStock.create({
        data: {
          tipo: "VENTA",
          barrilId: b.id,
          cantidad: -redondear(saca),
          unidad: "L",
          saldo: queda,
          motivo: contexto.motivo,
          ventaId: contexto.ventaId ?? null,
          usuario: contexto.usuario,
        },
      });
    }
  }

  // Los de barril ya quedaron asentados arriba, contra el barril del que
  // salieron: anotarlos otra vez acá contaría los litros dos veces.
  for (const p of pedidos) {
    const prod = porId.get(p.productoId)!;
    if (prod.deBarril) continue;

    const actualizado = await tx.productoBebida.update({
      where: { id: prod.id },
      data: { stock: { decrement: p.cantidad } },
    });
    await tx.movimientoStock.create({
      data: {
        tipo: "VENTA",
        productoId: prod.id,
        cantidad: -p.cantidad,
        unidad: "u",
        saldo: actualizado.stock,
        motivo: contexto.motivo,
        ventaId: contexto.ventaId ?? null,
        usuario: contexto.usuario,
      },
    });
  }

  return { lineas, total: redondear(total), litros: redondear(litrosPedidos) };
}

/**
 * Devuelve al stock lo que tenía una venta anulada. Los litros vuelven a los
 * barriles conectados que más lugar tengan, sin pasarse de su capacidad.
 */
export async function reponerStock(
  tx: Prisma.TransactionClient,
  ventaId: string,
  contexto: { motivo: string; usuario: string | null },
) {
  const lineas = await tx.lineaVentaBebida.findMany({
    where: { ventaId },
    include: { producto: true },
  });

  let litros = 0;
  for (const l of lineas) {
    if (l.producto.deBarril) {
      // Se devuelve al barril más abajo, en una sola pasada.
      litros += l.producto.litros * l.cantidad;
    } else {
      const actualizado = await tx.productoBebida.update({
        where: { id: l.productoId },
        data: { stock: { increment: l.cantidad } },
      });
      await tx.movimientoStock.create({
        data: {
          tipo: "ANULACION",
          productoId: l.productoId,
          cantidad: l.cantidad,
          unidad: "u",
          saldo: actualizado.stock,
          motivo: contexto.motivo,
          ventaId,
          usuario: contexto.usuario,
        },
      });
    }
  }

  if (litros > 0.0001) {
    const barriles = await tx.barril.findMany({
      where: { conectado: true },
      orderBy: { restanteL: "asc" },
    });
    let resta = redondear(litros);
    for (const b of barriles) {
      if (resta <= 0.0001) break;
      const lugar = Math.max(0, b.capacidadL - b.restanteL);
      const vuelve = Math.min(lugar, resta);
      if (vuelve <= 0.0001) continue;
      resta = redondear(resta - vuelve);
      const queda = redondear(b.restanteL + vuelve);
      await tx.barril.update({ where: { id: b.id }, data: { restanteL: queda } });
      await tx.movimientoStock.create({
        data: {
          tipo: "ANULACION",
          barrilId: b.id,
          cantidad: redondear(vuelve),
          unidad: "L",
          saldo: queda,
          motivo: contexto.motivo,
          ventaId,
          usuario: contexto.usuario,
        },
      });
    }
  }
}
