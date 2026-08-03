"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { invalidarBar } from "@cerveza/_lib/datos";
import { accion, dec, redondear, type Resultado } from "@/lib/servidor";

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

const esquemaProducto = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Poné el nombre del producto"),
  presentacion: z.string().trim().min(1, "Poné la presentación (330ML, 1L…)"),
  categoriaId: z.string().min(1, "Elegí una categoría"),
  precio: z.coerce.number().positive("El precio debe ser mayor a cero"),
  costo: z.coerce.number().min(0).default(0),
  deBarril: z.coerce.boolean().default(false),
  litros: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().min(0).default(0),
  stockMinimo: z.coerce.number().min(0).default(6),
  color: z.string().trim().default("#FFC200"),
  /** Ruta de la foto dentro de `public/`, o vacío si no tiene. */
  imagen: z.string().trim().optional(),
  activo: z.coerce.boolean().default(true),
});

export async function guardarProducto(datos: FormData): Promise<Resultado<{ id: string }>> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const crudo = Object.fromEntries(datos);
    const p = esquemaProducto.parse({
      ...crudo,
      // Los checkbox no mandan nada cuando están apagados.
      deBarril: crudo.deBarril === "on" || crudo.deBarril === "true",
      activo: crudo.activo === undefined ? true : crudo.activo === "on" || crudo.activo === "true",
    });

    if (p.deBarril && p.litros <= 0) {
      throw new Error("Un producto de barril tiene que decir cuántos litros sirve.");
    }

    const comunes = {
      nombre: p.nombre,
      presentacion: p.presentacion,
      categoriaId: p.categoriaId,
      precio: dec(p.precio),
      costo: dec(p.costo),
      deBarril: p.deBarril,
      litros: p.deBarril ? p.litros : 0,
      stockMinimo: p.stockMinimo,
      color: p.color,
      imagen: p.imagen || null,
      activo: p.activo,
    };

    let id = p.id;
    if (id) {
      // El stock no se toca acá: se mueve por ingreso, ajuste o merma, así
      // siempre queda el porqué asentado en movimientos.
      await prisma.productoBebida.update({ where: { id }, data: comunes });
    } else {
      const ultimo = await prisma.productoBebida.findFirst({ orderBy: { orden: "desc" } });
      const creado = await prisma.productoBebida.create({
        data: {
          ...comunes,
          stock: p.deBarril ? 0 : p.stock,
          orden: (ultimo?.orden ?? 0) + 1,
        },
      });
      id = creado.id;

      if (!p.deBarril && p.stock > 0) {
        await prisma.movimientoStock.create({
          data: {
            tipo: "INGRESO",
            productoId: creado.id,
            cantidad: p.stock,
            unidad: "u",
            saldo: p.stock,
            motivo: "Alta del producto",
            usuario: sesion.nombre,
          },
        });
      }
    }
    return { id };
  }, invalidarBar);
}

/**
 * Baja de un producto. Si ya se vendió alguna vez no se borra —se llevaría
 * puesto el historial—: se deja inactivo y desaparece del POS.
 */
export async function borrarProducto(id: string): Promise<Resultado<{ desactivado: boolean }>> {
  return accion(async () => {
    await requerirSesion();
    const vendido = await prisma.lineaVentaBebida.count({ where: { productoId: id } });

    if (vendido > 0) {
      await prisma.productoBebida.update({ where: { id }, data: { activo: false } });
      return { desactivado: true };
    }

    await prisma.productoBebida.delete({ where: { id } });
    return { desactivado: false };
  }, invalidarBar);
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

const esquemaAjuste = z.object({
  productoId: z.string().min(1),
  tipo: z.enum(["INGRESO", "MERMA", "AJUSTE"]),
  cantidad: z.coerce.number(),
  motivo: z.string().trim().max(200).optional(),
});

/**
 * Mueve el stock de un producto y deja el porqué asentado.
 *
 * `INGRESO` suma lo que llegó, `MERMA` descuenta lo que se rompió o se
 * regaló y `AJUSTE` fija el número que salió del conteo físico.
 */
export async function ajustarStock(datos: {
  productoId: string;
  tipo: "INGRESO" | "MERMA" | "AJUSTE";
  cantidad: number;
  motivo?: string;
}): Promise<Resultado<{ stock: number }>> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const p = esquemaAjuste.parse(datos);
    if (p.cantidad < 0) throw new Error("La cantidad no puede ser negativa.");
    if (p.tipo !== "AJUSTE" && p.cantidad === 0) {
      throw new Error("Poné una cantidad mayor a cero.");
    }

    const producto = await prisma.productoBebida.findUnique({ where: { id: p.productoId } });
    if (!producto) throw new Error("El producto no existe.");
    if (producto.deBarril) {
      throw new Error("Los productos de barril se reponen cargando el barril.");
    }

    const nuevo =
      p.tipo === "INGRESO"
        ? producto.stock + p.cantidad
        : p.tipo === "MERMA"
          ? producto.stock - p.cantidad
          : p.cantidad;

    if (nuevo < 0) throw new Error("No podés dejar el stock en negativo.");

    const delta = redondear(nuevo - producto.stock);
    await prisma.$transaction([
      prisma.productoBebida.update({ where: { id: p.productoId }, data: { stock: nuevo } }),
      prisma.movimientoStock.create({
        data: {
          tipo: p.tipo,
          productoId: p.productoId,
          cantidad: delta,
          unidad: "u",
          saldo: nuevo,
          motivo: p.motivo || null,
          usuario: sesion.nombre,
        },
      }),
    ]);
    return { stock: nuevo };
  }, invalidarBar);
}

// ---------------------------------------------------------------------------
// Barriles
// ---------------------------------------------------------------------------

const esquemaBarril = z.object({
  id: z.string().optional(),
  estilo: z.string().trim().min(1, "Poné el estilo del barril"),
  capacidadL: z.coerce.number().positive("La capacidad debe ser mayor a cero"),
  restanteL: z.coerce.number().min(0).default(0),
  conectado: z.coerce.boolean().default(true),
});

export async function guardarBarril(datos: FormData): Promise<Resultado> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const crudo = Object.fromEntries(datos);
    const p = esquemaBarril.parse({
      ...crudo,
      conectado: crudo.conectado === "on" || crudo.conectado === "true",
    });
    if (p.restanteL > p.capacidadL) {
      throw new Error("No puede quedar más cerveza que la capacidad del barril.");
    }

    if (p.id) {
      const previo = await prisma.barril.findUnique({ where: { id: p.id } });
      if (!previo) throw new Error("El barril no existe.");

      await prisma.$transaction([
        prisma.barril.update({
          where: { id: p.id },
          data: {
            estilo: p.estilo,
            capacidadL: p.capacidadL,
            restanteL: p.restanteL,
            conectado: p.conectado,
          },
        }),
        ...(previo.restanteL !== p.restanteL
          ? [
              prisma.movimientoStock.create({
                data: {
                  tipo: "AJUSTE" as const,
                  barrilId: p.id,
                  cantidad: redondear(p.restanteL - previo.restanteL),
                  unidad: "L",
                  saldo: p.restanteL,
                  motivo: "Ajuste del barril",
                  usuario: sesion.nombre,
                },
              }),
            ]
          : []),
      ]);
    } else {
      const creado = await prisma.barril.create({
        data: {
          estilo: p.estilo,
          capacidadL: p.capacidadL,
          restanteL: p.restanteL,
          conectado: p.conectado,
        },
      });
      await prisma.movimientoStock.create({
        data: {
          tipo: "INGRESO",
          barrilId: creado.id,
          cantidad: p.restanteL,
          unidad: "L",
          saldo: p.restanteL,
          motivo: `Barril nuevo de ${p.estilo}`,
          usuario: sesion.nombre,
        },
      });
    }
  }, invalidarBar);
}

/** Recarga un barril a tope, que es lo que pasa al cambiarlo en la canilla. */
export async function reponerBarril(id: string, litros?: number): Promise<Resultado> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const barril = await prisma.barril.findUnique({ where: { id } });
    if (!barril) throw new Error("El barril no existe.");

    const suma = litros === undefined ? barril.capacidadL - barril.restanteL : litros;
    if (suma <= 0) throw new Error("Ese barril ya está lleno.");

    const nuevo = redondear(Math.min(barril.capacidadL, barril.restanteL + suma));
    await prisma.$transaction([
      prisma.barril.update({ where: { id }, data: { restanteL: nuevo, conectado: true } }),
      prisma.movimientoStock.create({
        data: {
          tipo: "INGRESO",
          barrilId: id,
          cantidad: redondear(nuevo - barril.restanteL),
          unidad: "L",
          saldo: nuevo,
          motivo: `Barril de ${barril.estilo} repuesto`,
          usuario: sesion.nombre,
        },
      }),
    ]);
  }, invalidarBar);
}

export async function conectarBarril(id: string, conectado: boolean): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    await prisma.barril.update({ where: { id }, data: { conectado } });
  }, invalidarBar);
}

export async function borrarBarril(id: string): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    await prisma.barril.delete({ where: { id } });
  }, invalidarBar);
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

const esquemaCategoria = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Poné el nombre de la categoría"),
  icono: z.string().trim().default("Beer"),
  orden: z.coerce.number().int().min(0).default(0),
  activa: z.coerce.boolean().default(true),
});

export async function guardarCategoria(datos: FormData): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    const crudo = Object.fromEntries(datos);
    const p = esquemaCategoria.parse({
      ...crudo,
      activa: crudo.activa === undefined ? true : crudo.activa === "on" || crudo.activa === "true",
    });

    const comunes = { nombre: p.nombre, icono: p.icono, orden: p.orden, activa: p.activa };
    if (p.id) await prisma.categoriaBebida.update({ where: { id: p.id }, data: comunes });
    else await prisma.categoriaBebida.create({ data: comunes });
  }, invalidarBar);
}

export async function borrarCategoria(id: string): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    const productos = await prisma.productoBebida.count({ where: { categoriaId: id } });
    if (productos > 0) {
      throw new Error(
        `Tiene ${productos} producto(s) adentro. Movelos o desactivá la categoría.`,
      );
    }
    await prisma.categoriaBebida.delete({ where: { id } });
  }, invalidarBar);
}
