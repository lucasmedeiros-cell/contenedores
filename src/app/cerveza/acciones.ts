"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { invalidarBar } from "@cerveza/_lib/datos";
import { accion, dec, redondear, type Resultado } from "@/lib/servidor";
import {
  descontarStock,
  esquemaItems,
  reponerStock,
  siguienteTicket,
  TX,
  type ItemPedido,
} from "@cerveza/_lib/servidor";

export type DatosVenta = {
  items: ItemPedido[];
  metodo?: string;
  descuento?: number;
  notas?: string;
};

const esquemaVenta = z.object({
  items: esquemaItems,
  metodo: z.string().trim().min(1).default("Efectivo"),
  descuento: z.number().min(0).default(0),
  notas: z.string().trim().max(300).optional(),
});

/**
 * Registra una venta de la cervecería y descuenta el stock.
 *
 * Todas las ventas son de mostrador: se cobran en el momento. El stock sale
 * junto con la venta —la cerveza ya se sirvió— y todo va en una transacción:
 * si un producto no alcanza, no se registra nada.
 */
export async function registrarVentaBebida(
  datos: DatosVenta,
): Promise<Resultado<{ id: string; ticket: string; total: number }>> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const p = esquemaVenta.parse({
      ...datos,
      items: (datos.items ?? []).filter((i) => i.cantidad > 0),
    });

    const venta = await prisma.$transaction(async (tx) => {
      const ticket = await siguienteTicket(tx);
      const { lineas, total } = await descontarStock(tx, p.items, {
        motivo: `Venta ${ticket}`,
        usuario: sesion.nombre,
      });

      const descuento = Math.min(p.descuento, total);
      const turno = await tx.cajaTurno.findFirst({ where: { cerradaEn: null } });

      const creada = await tx.ventaBebida.create({
        data: {
          ticket,
          total: dec(redondear(total - descuento)),
          descuento: dec(descuento),
          metodo: p.metodo,
          estado: "COMPLETADA",
          cajera: sesion.nombre,
          cajaId: turno?.id ?? null,
          notas: p.notas || null,
          lineas: { create: lineas },
        },
      });

      // Los movimientos se escribieron antes de existir la venta: recién ahora
      // se les puede colgar el ticket.
      await tx.movimientoStock.updateMany({
        where: { ventaId: null, motivo: `Venta ${ticket}` },
        data: { ventaId: creada.id },
      });

      return creada;
    }, TX);

    return { id: venta.id, ticket: venta.ticket, total: Number(venta.total) };
  }, invalidarBar);
}

/**
 * Anula una venta y devuelve todo al stock. No se borra: queda en el
 * historial marcada como anulada, que es lo que después permite explicar un
 * faltante de caja.
 */
export async function anularVenta(id: string, motivo?: string): Promise<Resultado> {
  return accion(async () => {
    const sesion = await requerirSesion();

    await prisma.$transaction(async (tx) => {
      const venta = await tx.ventaBebida.findUnique({ where: { id } });
      if (!venta) throw new Error("La venta ya no existe.");
      if (venta.estado === "ANULADA") throw new Error("Esa venta ya estaba anulada.");

      await reponerStock(tx, id, {
        motivo: `Anulación ${venta.ticket}${motivo ? ` · ${motivo}` : ""}`,
        usuario: sesion.nombre,
      });

      await tx.ventaBebida.update({
        where: { id },
        data: {
          estado: "ANULADA",
          notas: [venta.notas, motivo && `Anulada: ${motivo}`].filter(Boolean).join(" · ") || null,
        },
      });
    }, TX);
  }, invalidarBar);
}

// ---------------------------------------------------------------------------
// Caja
// ---------------------------------------------------------------------------

export async function abrirCaja(datos: {
  nombre: string;
  montoInicial: number;
}): Promise<Resultado> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const p = z
      .object({
        nombre: z.string().trim().min(1, "Poné el nombre de la caja").default("Caja 1"),
        montoInicial: z.number().min(0, "El fondo no puede ser negativo"),
      })
      .parse(datos);

    const abierta = await prisma.cajaTurno.findFirst({ where: { cerradaEn: null } });
    if (abierta) throw new Error("Ya hay un turno de caja abierto.");

    const turno = await prisma.cajaTurno.create({
      data: {
        nombre: p.nombre,
        montoInicial: dec(p.montoInicial),
        abiertaPor: sesion.nombre,
      },
    });

    // Las ventas sueltas de hoy que quedaron sin turno se enganchan a este.
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    await prisma.ventaBebida.updateMany({
      where: { cajaId: null, fecha: { gte: desde }, estado: "COMPLETADA" },
      data: { cajaId: turno.id },
    });
  }, invalidarBar);
}

/** Cierra el turno con el arqueo: lo contado contra lo que debería haber. */
export async function cerrarCaja(datos: {
  id: string;
  montoDeclarado: number;
  notas?: string;
}): Promise<Resultado<{ diferencia: number }>> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const p = z
      .object({
        id: z.string().min(1),
        montoDeclarado: z.number().min(0, "El monto contado no puede ser negativo"),
        notas: z.string().trim().max(300).optional(),
      })
      .parse(datos);

    const turno = await prisma.cajaTurno.findUnique({
      where: { id: p.id },
      include: { ventas: { where: { estado: "COMPLETADA" }, select: { total: true, metodo: true } } },
    });
    if (!turno) throw new Error("El turno no existe.");
    if (turno.cerradaEn) throw new Error("Ese turno ya está cerrado.");

    const efectivo = turno.ventas
      .filter((v) => v.metodo === "Efectivo")
      .reduce((s, v) => s + Number(v.total), 0);
    const esperado = Number(turno.montoInicial) + efectivo;

    await prisma.cajaTurno.update({
      where: { id: p.id },
      data: {
        cerradaEn: new Date(),
        montoDeclarado: dec(p.montoDeclarado),
        cerradaPor: sesion.nombre,
        notas: p.notas || null,
      },
    });
    return { diferencia: redondear(p.montoDeclarado - esperado) };
  }, invalidarBar);
}
