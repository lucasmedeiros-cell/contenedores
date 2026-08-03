import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ZONA_HORARIA, num } from "@/lib/format";
import type { CajaEnMenu } from "@cerveza/_componentes/ShellCerveceria";

/**
 * Datos de la cervecería. Mismo criterio que `datos.ts`: la base está lejos
 * (unos 200 ms por consulta), así que cada pantalla se resuelve en pocas
 * vueltas, se cachea con la etiqueta `cerveceria` y las acciones la invalidan
 * al escribir.
 */
export const TAG_CERVECERIA = "cerveceria";

const VIDA = 300;

/** Un solo argumento: la firma de dos no invalida `unstable_cache`. */
export function invalidarBar() {
  (revalidateTag as unknown as (t: string) => void)(TAG_CERVECERIA);
}

/** Medianoche de hoy, que es donde arranca la jornada de la caja. */
function inicioDelDia(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ---------------------------------------------------------------------------
// Punto de venta
// ---------------------------------------------------------------------------

export type ProductoPos = {
  id: string;
  nombre: string;
  presentacion: string;
  categoriaId: string;
  precio: number;
  litros: number;
  deBarril: boolean;
  stock: number;
  color: string;
  /** Foto del producto, servida desde `public/`. Sin ella se dibuja el chopp. */
  imagen: string | null;
};

export type CategoriaPos = { id: string; nombre: string; icono: string };

export type CatalogoPos = {
  categorias: CategoriaPos[];
  productos: ProductoPos[];
  litrosDisponibles: number;
  metodos: string[];
};

/**
 * Los métodos de cobro que ofrece el POS: los mismos dos del patio. Tarjeta y
 * transferencia salieron de la lista; las ventas viejas que las tengan siguen
 * mostrándose tal cual en el historial y en los reportes, que leen el método
 * de cada venta y no esta lista.
 */
export const METODOS_PAGO = ["Efectivo", "QR"];

/** Todo lo que el POS necesita para pintar: categorías, productos y litros. */
export const catalogoCerveceria = cache(
  unstable_cache(
    async (): Promise<CatalogoPos> => {
      const [categorias, productos, barriles] = await Promise.all([
        prisma.categoriaBebida.findMany({
          where: { activa: true },
          orderBy: { orden: "asc" },
          select: { id: true, nombre: true, icono: true },
        }),
        prisma.productoBebida.findMany({
          where: { activo: true },
          orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        }),
        prisma.barril.aggregate({
          _sum: { restanteL: true },
          where: { conectado: true },
        }),
      ]);

      return {
        categorias,
        productos: productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          presentacion: p.presentacion,
          categoriaId: p.categoriaId,
          precio: num(p.precio),
          litros: p.litros,
          deBarril: p.deBarril,
          stock: p.stock,
          color: p.color,
          imagen: p.imagen,
        })),
        litrosDisponibles: Math.round(barriles._sum.restanteL ?? 0),
        metodos: METODOS_PAGO,
      };
    },
    ["catalogo-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: VIDA },
  ),
);

// ---------------------------------------------------------------------------
// Resumen del día
// ---------------------------------------------------------------------------

export type ResumenBar = {
  ventasHoy: number;
  recaudadoHoy: number;
  ticketPromedio: number;
  litrosDisponibles: number;
  litrosServidosHoy: number;
  faltantes: number;
  porMetodo: { metodo: string; monto: number; cantidad: number }[];
  topProductos: { nombre: string; unidades: number; monto: number }[];
  /** Recaudación por hora de hoy, para la barrita del resumen */
  porHora: { hora: number; monto: number }[];
};

export const resumenDelDia = cache(
  unstable_cache(
    async (): Promise<ResumenBar> => {
      const desde = inicioDelDia();

      const [ventas, litros, faltantes, metodos, top, horas, servidos] =
        await Promise.all([
          prisma.ventaBebida.aggregate({
            _sum: { total: true },
            _count: true,
            where: { fecha: { gte: desde }, estado: "COMPLETADA" },
          }),
          prisma.barril.aggregate({ _sum: { restanteL: true }, where: { conectado: true } }),
          prisma.$queryRaw<{ n: bigint }[]>`
            SELECT count(*) AS n FROM productos_bebida
            WHERE activo AND NOT "deBarril" AND stock <= "stockMinimo"
          `,
          prisma.$queryRaw<{ metodo: string; monto: string; cantidad: bigint }[]>`
            SELECT metodo, sum(total)::text AS monto, count(*) AS cantidad
            FROM ventas_bebida
            WHERE estado = 'COMPLETADA' AND fecha >= ${desde}
            GROUP BY metodo ORDER BY sum(total) DESC
          `,
          prisma.$queryRaw<{ nombre: string; unidades: bigint; monto: string }[]>`
            SELECT l.nombre, sum(l.cantidad) AS unidades, sum(l.total)::text AS monto
            FROM lineas_venta_bebida l
            JOIN ventas_bebida v ON v.id = l."ventaId"
            WHERE v.estado = 'COMPLETADA' AND v.fecha >= ${desde}
            GROUP BY l.nombre ORDER BY sum(l.cantidad) DESC LIMIT 5
          `,
          prisma.$queryRaw<{ hora: number; monto: string }[]>`
            SELECT extract(hour FROM fecha AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA})::int AS hora,
                   sum(total)::text AS monto
            FROM ventas_bebida
            WHERE estado = 'COMPLETADA' AND fecha >= ${desde}
            GROUP BY 1 ORDER BY 1
          `,
          prisma.$queryRaw<{ litros: number | null }[]>`
            SELECT coalesce(sum(-cantidad), 0)::float AS litros
            FROM movimientos_stock
            WHERE unidad = 'L' AND tipo = 'VENTA' AND fecha >= ${desde}
          `,
        ]);

      const recaudado = num(ventas._sum.total);

      return {
        ventasHoy: ventas._count,
        recaudadoHoy: recaudado,
        ticketPromedio: ventas._count > 0 ? recaudado / ventas._count : 0,
        litrosDisponibles: Math.round(litros._sum.restanteL ?? 0),
        litrosServidosHoy: Math.round((servidos[0]?.litros ?? 0) * 10) / 10,
        faltantes: Number(faltantes[0]?.n ?? 0),
        porMetodo: metodos.map((m) => ({
          metodo: m.metodo,
          monto: num(m.monto),
          cantidad: Number(m.cantidad),
        })),
        topProductos: top.map((t) => ({
          nombre: t.nombre,
          unidades: Number(t.unidades),
          monto: num(t.monto),
        })),
        porHora: horas.map((h) => ({ hora: h.hora, monto: num(h.monto) })),
      };
    },
    ["resumen-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: 60 },
  ),
);

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export type ProductoInventario = {
  id: string;
  nombre: string;
  presentacion: string;
  categoriaId: string;
  categoria: string;
  precio: number;
  costo: number;
  litros: number;
  deBarril: boolean;
  stock: number;
  stockMinimo: number;
  color: string;
  imagen: string | null;
  activo: boolean;
  vendidos30: number;
};

export type BarrilInventario = {
  id: string;
  estilo: string;
  capacidadL: number;
  restanteL: number;
  conectado: boolean;
  pct: number;
};

export type Inventario = {
  productos: ProductoInventario[];
  barriles: BarrilInventario[];
  categorias: { id: string; nombre: string; icono: string; activa: boolean; productos: number }[];
  litrosDisponibles: number;
  litrosTotales: number;
  valorDeposito: number;
  faltantes: number;
};

export const inventario = cache(
  unstable_cache(
    async (): Promise<Inventario> => {
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - 30);

      const [productos, barriles, categorias, vendidos] = await Promise.all([
        prisma.productoBebida.findMany({
          orderBy: [{ activo: "desc" }, { orden: "asc" }, { nombre: "asc" }],
          include: { categoria: { select: { nombre: true } } },
        }),
        prisma.barril.findMany({ orderBy: [{ conectado: "desc" }, { estilo: "asc" }] }),
        prisma.categoriaBebida.findMany({
          orderBy: { orden: "asc" },
          include: { _count: { select: { productos: true } } },
        }),
        prisma.$queryRaw<{ productoId: string; unidades: bigint }[]>`
          SELECT l."productoId", sum(l.cantidad) AS unidades
          FROM lineas_venta_bebida l
          JOIN ventas_bebida v ON v.id = l."ventaId"
          WHERE v.estado = 'COMPLETADA' AND v.fecha >= ${hace30}
          GROUP BY 1
        `,
      ]);

      const porProducto = new Map(vendidos.map((v) => [v.productoId, Number(v.unidades)]));

      const lista = productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        presentacion: p.presentacion,
        categoriaId: p.categoriaId,
        categoria: p.categoria.nombre,
        precio: num(p.precio),
        costo: num(p.costo),
        litros: p.litros,
        deBarril: p.deBarril,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        color: p.color,
        imagen: p.imagen,
        activo: p.activo,
        vendidos30: porProducto.get(p.id) ?? 0,
      }));

      return {
        productos: lista,
        barriles: barriles.map((b) => ({
          id: b.id,
          estilo: b.estilo,
          capacidadL: b.capacidadL,
          restanteL: b.restanteL,
          conectado: b.conectado,
          pct: b.capacidadL > 0 ? Math.round((b.restanteL / b.capacidadL) * 100) : 0,
        })),
        categorias: categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          icono: c.icono,
          activa: c.activa,
          productos: c._count.productos,
        })),
        litrosDisponibles: Math.round(
          barriles.filter((b) => b.conectado).reduce((s, b) => s + b.restanteL, 0),
        ),
        litrosTotales: Math.round(barriles.reduce((s, b) => s + b.restanteL, 0)),
        valorDeposito:
          lista.filter((p) => !p.deBarril).reduce((s, p) => s + p.stock * p.costo, 0) +
          barriles.reduce((s, b) => s + b.restanteL * 8, 0),
        faltantes: lista.filter((p) => p.activo && !p.deBarril && p.stock <= p.stockMinimo).length,
      };
    },
    ["inventario-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: VIDA },
  ),
);

// ---------------------------------------------------------------------------
// Movimientos de stock
// ---------------------------------------------------------------------------

export type Movimiento = {
  id: string;
  tipo: string;
  concepto: string;
  cantidad: number;
  unidad: string;
  saldo: number | null;
  motivo: string | null;
  usuario: string | null;
  fecha: string;
};

export const movimientos = cache(
  unstable_cache(
    async (limite = 300): Promise<Movimiento[]> => {
      const filas = await prisma.movimientoStock.findMany({
        orderBy: { fecha: "desc" },
        take: limite,
        include: {
          producto: { select: { nombre: true, presentacion: true } },
          barril: { select: { estilo: true } },
        },
      });

      return filas.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        concepto: m.producto
          ? `${m.producto.nombre} ${m.producto.presentacion}`
          : m.barril
            ? `Barril ${m.barril.estilo}`
            : "—",
        cantidad: m.cantidad,
        unidad: m.unidad,
        saldo: m.saldo,
        motivo: m.motivo,
        usuario: m.usuario,
        fecha: m.fecha.toISOString(),
      }));
    },
    ["movimientos-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: VIDA },
  ),
);

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

export type LineaVenta = { nombre: string; cantidad: number; precioUnit: number; total: number };

export type Venta = {
  id: string;
  ticket: string;
  total: number;
  descuento: number;
  metodo: string;
  estado: "ABIERTA" | "COMPLETADA" | "ANULADA";
  cajera: string | null;
  fecha: string;
  abiertaEn: string;
  cliente: string | null;
  notas: string | null;
  lineas: LineaVenta[];
};

function aVenta(v: {
  id: string;
  ticket: string;
  total: unknown;
  descuento: unknown;
  metodo: string;
  estado: string;
  cajera: string | null;
  fecha: Date;
  abiertaEn: Date;
  notas: string | null;
  cliente: { nombre: string } | null;
  lineas: { nombre: string; cantidad: number; precioUnit: unknown; total: unknown }[];
}): Venta {
  return {
    id: v.id,
    ticket: v.ticket,
    total: num(v.total as never),
    descuento: num(v.descuento as never),
    metodo: v.metodo,
    estado: v.estado as Venta["estado"],
    cajera: v.cajera,
    fecha: v.fecha.toISOString(),
    abiertaEn: v.abiertaEn.toISOString(),
    cliente: v.cliente?.nombre ?? null,
    notas: v.notas,
    lineas: v.lineas.map((l) => ({
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioUnit: num(l.precioUnit as never),
      total: num(l.total as never),
    })),
  };
}

const INCLUIR_VENTA = {
  cliente: { select: { nombre: true } },
  lineas: { select: { nombre: true, cantidad: true, precioUnit: true, total: true } },
} as const;

/** Las ventas de los últimos días, para el historial de tickets. */
export const listaVentas = cache(
  unstable_cache(
    async (dias = 7): Promise<Venta[]> => {
      const desde = inicioDelDia();
      desde.setDate(desde.getDate() - (dias - 1));

      const ventas = await prisma.ventaBebida.findMany({
        where: { fecha: { gte: desde } },
        orderBy: { fecha: "desc" },
        take: 400,
        include: INCLUIR_VENTA,
      });
      return ventas.map(aVenta);
    },
    ["ventas-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: 60 },
  ),
);

// ---------------------------------------------------------------------------
// Caja
// ---------------------------------------------------------------------------

export type Turno = {
  id: string;
  nombre: string;
  abiertaEn: string;
  cerradaEn: string | null;
  montoInicial: number;
  montoDeclarado: number | null;
  abiertaPor: string | null;
  cerradaPor: string | null;
  notas: string | null;
  ventas: number;
  cobrado: number;
  efectivo: number;
  /** Lo que debería haber en el cajón: inicial + efectivo cobrado */
  esperado: number;
  porMetodo: { metodo: string; monto: number; cantidad: number }[];
};

const filasTurno = async (where: { cerradaEn?: null }, limite: number) => {
  const turnos = await prisma.cajaTurno.findMany({
    where,
    orderBy: { abiertaEn: "desc" },
    take: limite,
    include: {
      ventas: {
        where: { estado: "COMPLETADA" },
        select: { total: true, metodo: true },
      },
    },
  });

  return turnos.map((t): Turno => {
    const porMetodo = new Map<string, { monto: number; cantidad: number }>();
    let cobrado = 0;
    for (const v of t.ventas) {
      const monto = num(v.total);
      cobrado += monto;
      const acumulado = porMetodo.get(v.metodo) ?? { monto: 0, cantidad: 0 };
      acumulado.monto += monto;
      acumulado.cantidad++;
      porMetodo.set(v.metodo, acumulado);
    }
    const efectivo = porMetodo.get("Efectivo")?.monto ?? 0;
    const inicial = num(t.montoInicial);

    return {
      id: t.id,
      nombre: t.nombre,
      abiertaEn: t.abiertaEn.toISOString(),
      cerradaEn: t.cerradaEn ? t.cerradaEn.toISOString() : null,
      montoInicial: inicial,
      montoDeclarado: t.montoDeclarado === null ? null : num(t.montoDeclarado),
      abiertaPor: t.abiertaPor,
      cerradaPor: t.cerradaPor,
      notas: t.notas,
      ventas: t.ventas.length,
      cobrado,
      efectivo,
      esperado: inicial + efectivo,
      porMetodo: [...porMetodo.entries()]
        .map(([metodo, v]) => ({ metodo, ...v }))
        .sort((a, b) => b.monto - a.monto),
    };
  });
};

/**
 * Quedarse solo con lo que la barra lateral muestra del turno. Vive acá y no
 * en `ShellCerveceria` porque quienes lo llaman —el layout y el encabezado—
 * son componentes de servidor, y una función exportada desde un módulo
 * `"use client"` no se puede invocar desde el servidor.
 */
export function cajaDelMenu(turno: Turno | null): CajaEnMenu {
  return (
    turno && {
      nombre: turno.nombre,
      abiertaEn: turno.abiertaEn,
      cobrado: turno.cobrado,
      ventas: turno.ventas,
    }
  );
}

/** El turno abierto, si hay alguno. Lo usa la barra lateral. */
export const turnoAbierto = cache(
  unstable_cache(
    async (): Promise<Turno | null> => (await filasTurno({ cerradaEn: null }, 1))[0] ?? null,
    ["turno-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: 60 },
  ),
);

export const historialCajas = cache(
  unstable_cache(async (): Promise<Turno[]> => filasTurno({}, 30), ["cajas-cerveceria"], {
    tags: [TAG_CERVECERIA],
    revalidate: VIDA,
  }),
);

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

export type Reportes = {
  dias: number;
  total: number;
  tickets: number;
  ticketPromedio: number;
  unidades: number;
  margen: number;
  porDia: { dia: string; etiqueta: string; monto: number; tickets: number }[];
  porCategoria: { categoria: string; monto: number; unidades: number }[];
  porProducto: { nombre: string; unidades: number; monto: number }[];
  porMetodo: { metodo: string; monto: number; cantidad: number }[];
  porHora: { hora: number; monto: number }[];
  porCajera: { cajera: string; monto: number; tickets: number }[];
};

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export const reportes = cache(
  unstable_cache(
    async (dias = 30): Promise<Reportes> => {
      const desde = inicioDelDia();
      desde.setDate(desde.getDate() - (dias - 1));

      const [totales, porDia, porCategoria, porProducto, porMetodo, porHora, porCajera, margen] =
        await Promise.all([
          prisma.ventaBebida.aggregate({
            _sum: { total: true },
            _count: true,
            where: { estado: "COMPLETADA", fecha: { gte: desde } },
          }),
          // El día y el nombre del día salen ya resueltos en la zona del
          // negocio: pasarlos por `new Date()` los volvería a correr.
          prisma.$queryRaw<{ dia: string; dow: number; numero: number; monto: string; tickets: bigint }[]>`
            SELECT to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA}, 'YYYY-MM-DD') AS dia,
                   extract(dow FROM fecha AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA})::int AS dow,
                   extract(day FROM fecha AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA})::int AS numero,
                   sum(total)::text AS monto, count(*) AS tickets
            FROM ventas_bebida
            WHERE estado = 'COMPLETADA' AND fecha >= ${desde}
            GROUP BY 1, 2, 3 ORDER BY 1
          `,
          prisma.$queryRaw<{ categoria: string; monto: string; unidades: bigint }[]>`
            SELECT c.nombre AS categoria, sum(l.total)::text AS monto, sum(l.cantidad) AS unidades
            FROM lineas_venta_bebida l
            JOIN ventas_bebida v ON v.id = l."ventaId"
            JOIN productos_bebida p ON p.id = l."productoId"
            JOIN cat_bebidas c ON c.id = p."categoriaId"
            WHERE v.estado = 'COMPLETADA' AND v.fecha >= ${desde}
            GROUP BY 1 ORDER BY sum(l.total) DESC
          `,
          prisma.$queryRaw<{ nombre: string; unidades: bigint; monto: string }[]>`
            SELECT l.nombre, sum(l.cantidad) AS unidades, sum(l.total)::text AS monto
            FROM lineas_venta_bebida l
            JOIN ventas_bebida v ON v.id = l."ventaId"
            WHERE v.estado = 'COMPLETADA' AND v.fecha >= ${desde}
            GROUP BY 1 ORDER BY sum(l.cantidad) DESC LIMIT 12
          `,
          prisma.$queryRaw<{ metodo: string; monto: string; cantidad: bigint }[]>`
            SELECT metodo, sum(total)::text AS monto, count(*) AS cantidad
            FROM ventas_bebida
            WHERE estado = 'COMPLETADA' AND fecha >= ${desde}
            GROUP BY 1 ORDER BY sum(total) DESC
          `,
          prisma.$queryRaw<{ hora: number; monto: string }[]>`
            SELECT extract(hour FROM fecha AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA})::int AS hora,
                   sum(total)::text AS monto
            FROM ventas_bebida
            WHERE estado = 'COMPLETADA' AND fecha >= ${desde}
            GROUP BY 1 ORDER BY 1
          `,
          prisma.$queryRaw<{ cajera: string | null; monto: string; tickets: bigint }[]>`
            SELECT cajera, sum(total)::text AS monto, count(*) AS tickets
            FROM ventas_bebida
            WHERE estado = 'COMPLETADA' AND fecha >= ${desde}
            GROUP BY 1 ORDER BY sum(total) DESC
          `,
          prisma.$queryRaw<{ margen: string | null }[]>`
            SELECT sum(l.total - (p.costo * l.cantidad))::text AS margen
            FROM lineas_venta_bebida l
            JOIN ventas_bebida v ON v.id = l."ventaId"
            JOIN productos_bebida p ON p.id = l."productoId"
            WHERE v.estado = 'COMPLETADA' AND v.fecha >= ${desde}
          `,
        ]);

      const total = num(totales._sum.total);
      const unidades = porProducto.reduce((s, p) => s + Number(p.unidades), 0);

      return {
        dias,
        total,
        tickets: totales._count,
        ticketPromedio: totales._count > 0 ? total / totales._count : 0,
        unidades,
        margen: num(margen[0]?.margen ?? 0),
        porDia: porDia.map((d) => ({
          dia: d.dia,
          etiqueta: `${DIAS_CORTOS[d.dow]} ${d.numero}`,
          monto: num(d.monto),
          tickets: Number(d.tickets),
        })),
        porCategoria: porCategoria.map((c) => ({
          categoria: c.categoria,
          monto: num(c.monto),
          unidades: Number(c.unidades),
        })),
        porProducto: porProducto.map((p) => ({
          nombre: p.nombre,
          unidades: Number(p.unidades),
          monto: num(p.monto),
        })),
        porMetodo: porMetodo.map((m) => ({
          metodo: m.metodo,
          monto: num(m.monto),
          cantidad: Number(m.cantidad),
        })),
        porHora: porHora.map((h) => ({ hora: h.hora, monto: num(h.monto) })),
        porCajera: porCajera.map((c) => ({
          cajera: c.cajera ?? "Sin asignar",
          monto: num(c.monto),
          tickets: Number(c.tickets),
        })),
      };
    },
    ["reportes-cerveceria"],
    { tags: [TAG_CERVECERIA], revalidate: VIDA },
  ),
);
