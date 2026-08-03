import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MESES_CORTOS, num } from "@/lib/format";
import type {
  DatosPlano,
  EstadoPlano,
  GeoPuesto,
} from "@alquileres/_componentes/plano/tipos";

export type { DatosPlano };

/**
 * La base vive lejos (unos 200 ms por consulta), así que las lecturas se
 * resuelven en pocas vueltas y se cachean con etiqueta. Al escribir, las
 * acciones llaman a `invalidar()` y lo siguiente que se lea sale fresco.
 */
export const TAG_PATIO = "patio";

const VIDA = 300;

export function invalidar(etiqueta = TAG_PATIO) {
  (revalidateTag as unknown as (t: string) => void)(etiqueta);
}

// ---------------------------------------------------------------------------

export type PagoCliente = {
  id: string;
  fecha: string;
  monto: number;
  periodicidad: string;
  metodoPago: string;
  comprobante: string | null;
  estado: "COBRADO" | "PENDIENTE";
  concepto: string;
  registradoPor: string | null;
};

export type ArrendatarioCliente = {
  id: string;
  negocio: string;
  rubro: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  fechaInicio: string;
  proximoVencimiento: string;
  montoAcordado: number;
};

/** Lo que ve el cliente de un puesto: sus datos más su geometría en el plano. */
export type PuestoCliente = GeoPuesto & {
  id: string;
  numero: string;
  zonaId: string;
  zona: string;
  tamanoM2: number;
  precioBase: number;
  periodicidad: string;
  estado: "LIBRE" | "OCUPADO" | "PENDIENTE";
  servicios: string[];
  descripcion: string | null;
  /** Posición en el mapa de tarjetas arrastrables, en píxeles. */
  posX: number;
  posY: number;
  arrendatario: ArrendatarioCliente | null;
  historialPagos: PagoCliente[];
};

type FilaPuesto = Omit<PuestoCliente, "precioBase" | "arrendatario" | "historialPagos"> & {
  precioBase: string;
  arrendatario: (Omit<ArrendatarioCliente, "montoAcordado"> & { montoAcordado: string }) | null;
  historialPagos: (Omit<PagoCliente, "monto"> & { monto: string })[] | null;
};

/**
 * Todos los puestos con su arrendatario y su historial de pagos, en una sola
 * vuelta a la base. Es la consulta que alimenta a todas las pantallas.
 */
const leerPuestos = unstable_cache(
  async (): Promise<PuestoCliente[]> => {
    const filas = await prisma.$queryRaw<FilaPuesto[]>`
      SELECT
        p.id, p.numero, p."zonaId", z.nombre AS zona,
        p."tamanoM2", p."precioBase"::text AS "precioBase",
        p.periodicidad::text AS periodicidad, p.estado::text AS estado,
        p.servicios, p.descripcion, p."posX", p."posY",
        p."gridX", p."gridY", p.ancho, p.largo, p.alto, p.rotacion,
        p."colorBase", p.tipo, p."tieneToldo", p.icono,
        (
          SELECT to_jsonb(x) FROM (
            SELECT a.id, a.negocio, a.rubro, a.nombre, a.telefono, a.email,
                   a."fechaInicio", a."proximoVencimiento",
                   a."montoAcordado"::text AS "montoAcordado"
            FROM arrendatarios a WHERE a."puestoId" = p.id
          ) x
        ) AS arrendatario,
        (
          SELECT json_agg(y ORDER BY y.fecha DESC) FROM (
            SELECT g.id, g.fecha, g.monto::text AS monto,
                   g.periodicidad::text AS periodicidad, g."metodoPago",
                   g.comprobante, g.estado::text AS estado, g.concepto,
                   u.nombre AS "registradoPor"
            FROM pagos g LEFT JOIN usuarios u ON u.id = g."registradoPor"
            WHERE g."puestoId" = p.id
          ) y
        ) AS "historialPagos"
      FROM puestos p
      JOIN zonas z ON z.id = p."zonaId"
      ORDER BY p.numero
    `;

    return filas.map((f) => ({
      ...f,
      precioBase: num(f.precioBase),
      arrendatario: f.arrendatario
        ? {
            ...f.arrendatario,
            fechaInicio: String(f.arrendatario.fechaInicio),
            proximoVencimiento: String(f.arrendatario.proximoVencimiento),
            montoAcordado: num(f.arrendatario.montoAcordado),
          }
        : null,
      historialPagos: (f.historialPagos ?? []).map((g) => ({
        ...g,
        fecha: String(g.fecha),
        monto: num(g.monto),
      })),
    }));
  },
  ["puestos-v13"],
  { tags: [TAG_PATIO], revalidate: VIDA },
);

export const listaPuestos = cache(leerPuestos);

export const listaZonas = cache(
  unstable_cache(async () => prisma.zona.findMany({ orderBy: { orden: "asc" } }), ["zonas"], {
    tags: [TAG_PATIO],
    revalidate: VIDA,
  }),
);

// ---------------------------------------------------------------------------
// Métricas del dashboard
// ---------------------------------------------------------------------------

export type ResumenMes = {
  /** "2026-08" */
  clave: string;
  /** "Ago 2026" */
  etiqueta: string;
  /** Puestos con arrendatario en ese mes */
  conArrendatario: number;
  pagados: number;
  pendientes: number;
  total: number;
  cobrado: number;
  porCobrar: number;
  pct: number;
};

export type Metricas = {
  totalPuestos: number;
  ocupados: number;
  libres: number;
  pendientes: number;
  recaudadoMes: number;
  pagosRegistrados: number;
  conArrendatario: number;
  proyeccionMes: number;
  porCobrar: number;
  ocupacionPct: number;
  /** Un resumen por mes, para el panel de evolución y su carrusel. */
  meses: ResumenMes[];
  porMetodo: { metodo: string; monto: number; cantidad: number }[];
  porZona: { zona: string; monto: number }[];
};

export const metricas = cache(async (): Promise<Metricas> => {
  const puestos = await listaPuestos();
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const proyeccionMes = puestos.reduce((s, p) => s + (p.arrendatario?.montoAcordado ?? 0), 0);

  const cobrados = puestos.flatMap((p) =>
    p.historialPagos.filter((g) => g.estado === "COBRADO").map((g) => ({ ...g, zona: p.zona })),
  );

  const delMes = cobrados.filter((g) => {
    const d = new Date(g.fecha);
    return d.getMonth() === mesActual && d.getFullYear() === anioActual;
  });

  // Un resumen por cada uno de los últimos seis meses. Los puestos que cuentan
  // son los que ya tenían arrendatario en ese mes, y se considera pagado el que
  // tiene un cobro asentado dentro del mes.
  const meses: ResumenMes[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anioActual, mesActual - i, 1);
    const finDeMes = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const vigentes = puestos.filter(
      (p) => p.arrendatario && new Date(p.arrendatario.fechaInicio) <= finDeMes,
    );
    const total = vigentes.reduce((s, p) => s + (p.arrendatario?.montoAcordado ?? 0), 0);

    let pagados = 0;
    let cobrado = 0;
    if (i === 0) {
      // El mes corriente se mide por el estado del puesto —es lo que se está
      // cobrando ahora—, igual que las tarjetas de arriba.
      for (const p of vigentes) {
        if (p.estado !== "PENDIENTE") {
          pagados++;
          cobrado += p.arrendatario?.montoAcordado ?? 0;
        }
      }
    } else {
      // Los meses cerrados se miden por lo que quedó asentado en el historial.
      for (const p of vigentes) {
        const delMesPuesto = p.historialPagos.filter((g) => {
          const f = new Date(g.fecha);
          return (
            g.estado === "COBRADO" &&
            f.getMonth() === d.getMonth() &&
            f.getFullYear() === d.getFullYear()
          );
        });
        if (delMesPuesto.length > 0) pagados++;
        cobrado += delMesPuesto.reduce((s, g) => s + g.monto, 0);
      }
    }

    meses.push({
      clave,
      etiqueta: `${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`,
      conArrendatario: vigentes.length,
      pagados,
      pendientes: vigentes.length - pagados,
      total,
      cobrado,
      porCobrar: Math.max(0, total - cobrado),
      // Un mes puede cobrar de más (un ajuste, una deuda vieja), pero el
      // anillo de cumplimiento se lee como porcentaje: no pasa de 100.
      pct: total > 0 ? Math.min(100, Math.round((cobrado / total) * 100)) : 0,
    });
  }

  const metodos = new Map<string, { monto: number; cantidad: number }>();
  for (const g of delMes) {
    const m = metodos.get(g.metodoPago) ?? { monto: 0, cantidad: 0 };
    m.monto += g.monto;
    m.cantidad++;
    metodos.set(g.metodoPago, m);
  }

  const zonas = new Map<string, number>();
  for (const g of delMes) zonas.set(g.zona, (zonas.get(g.zona) ?? 0) + g.monto);

  const ocupados = puestos.filter((p) => p.estado === "OCUPADO").length;
  const pendientes = puestos.filter((p) => p.estado === "PENDIENTE").length;
  const porCobrar = puestos
    .filter((p) => p.estado === "PENDIENTE")
    .reduce((s, p) => s + (p.arrendatario?.montoAcordado ?? 0), 0);

  return {
    totalPuestos: puestos.length,
    ocupados,
    libres: puestos.filter((p) => p.estado === "LIBRE").length,
    pendientes,
    // Como en el prototipo: lo cobrado del mes es lo de los puestos que están al
    // día, o sea el total pactado menos lo que falta cobrar.
    recaudadoMes: proyeccionMes - porCobrar,
    /** Lo efectivamente asentado en el historial de pagos del mes. */
    pagosRegistrados: delMes.reduce((s, g) => s + g.monto, 0),
    conArrendatario: puestos.filter((p) => p.arrendatario).length,
    proyeccionMes,
    porCobrar,
    ocupacionPct: puestos.length ? Math.round(((ocupados + pendientes) / puestos.length) * 100) : 0,
    meses,
    porMetodo: [...metodos.entries()]
      .map(([metodo, v]) => ({ metodo, ...v }))
      .sort((a, b) => b.monto - a.monto),
    porZona: [...zonas.entries()]
      .map(([zona, monto]) => ({ zona, monto }))
      .sort((a, b) => b.monto - a.monto),
  };
});

// ---------------------------------------------------------------------------
// Plano isométrico
// ---------------------------------------------------------------------------

export const datosPlano = cache(async (): Promise<DatosPlano> => {
  const [zonas, puestos] = await Promise.all([listaZonas(), listaPuestos()]);

  const mapeados = puestos.map((p) => ({
    id: p.id,
    numero: p.numero,
    nombre: p.arrendatario?.negocio ?? null,
    rubro: p.arrendatario?.rubro ?? null,
    tipo: p.tipo,
    icono: p.icono,
    colorBase: p.colorBase,
    gridX: p.gridX,
    gridY: p.gridY,
    ancho: p.ancho,
    largo: p.largo,
    alto: p.alto,
    rotacion: p.rotacion,
    tieneToldo: p.tieneToldo,
    tamanoM2: p.tamanoM2,
    zonaNombre: p.zona,
    estado: p.estado,
    estadoPago: (p.estado === "LIBRE"
      ? "libre"
      : p.estado === "PENDIENTE"
        ? "pendiente"
        : "al-dia") as EstadoPlano,
    inquilino: p.arrendatario?.nombre ?? null,
    negocio: p.arrendatario?.negocio ?? null,
    monto: p.arrendatario?.montoAcordado ?? p.precioBase,
    periodosDeuda: p.estado === "PENDIENTE" ? 1 : 0,
    deuda: p.estado === "PENDIENTE" ? (p.arrendatario?.montoAcordado ?? 0) : 0,
  }));

  const celdasAncho = Math.max(
    16,
    ...zonas.map((z) => z.gridX + z.gridW),
    ...mapeados.map((p) => p.gridX + Math.max(p.ancho, p.largo) + 1),
  );
  const celdasAlto = Math.max(
    12,
    ...zonas.map((z) => z.gridY + z.gridH),
    ...mapeados.map((p) => p.gridY + Math.max(p.ancho, p.largo) + 1),
  );

  return {
    zonas: zonas.map((z) => ({
      id: z.id,
      nombre: z.nombre,
      textura: z.textura,
      gridX: z.gridX,
      gridY: z.gridY,
      gridW: z.gridW,
      gridH: z.gridH,
      cubierta: z.cubierta,
    })),
    puestos: mapeados,
    celdasAncho,
    celdasAlto,
  };
});
