/**
 * El estado de un puesto, con su color y su nombre.
 *
 * Estaba escrito cinco veces —en `format.ts`, en los diálogos, en el panel
 * "Estado del patio", en el mapa y en el detalle de los KPI— y no coincidían:
 * el mismo "pendiente" salía ámbar en un lado y amarillo marca en otro, y se
 * llamaba "Al Día", "AL DÍA" o "Al día (Pagado)" según la pantalla. Acá está
 * una sola vez.
 */

export type EstadoPuesto = "LIBRE" | "OCUPADO" | "PENDIENTE";

export type Estilo = {
  /** Nombre corto, para chips y tablas. */
  etiqueta: string;
  /** Nombre largo, para leyendas. */
  leyenda: string;
  hex: string;
  texto: string;
  fondo: string;
  borde: string;
};

export const ESTADOS: Record<EstadoPuesto, Estilo> = {
  OCUPADO: {
    etiqueta: "Al día",
    leyenda: "Al día (pagado)",
    hex: "#10b981",
    texto: "text-emerald-400",
    fondo: "bg-emerald-500/15",
    borde: "border-emerald-500/40",
  },
  PENDIENTE: {
    etiqueta: "Mora / Pendiente",
    leyenda: "Por cobrar / mora",
    hex: "#FFC200",
    texto: "text-[#FFC200]",
    fondo: "bg-[#FFC200]/15",
    borde: "border-[#FFC200]/45",
  },
  LIBRE: {
    etiqueta: "Libre",
    leyenda: "Libre (disponible)",
    hex: "#71717a",
    texto: "text-zinc-400",
    fondo: "bg-zinc-500/15",
    borde: "border-zinc-500/40",
  },
};

/** El orden en que se muestran en leyendas y filtros. */
export const ORDEN_ESTADOS: EstadoPuesto[] = ["OCUPADO", "PENDIENTE", "LIBRE"];

export function estiloDe(estado: string): Estilo {
  return ESTADOS[estado as EstadoPuesto] ?? ESTADOS.LIBRE;
}

/** Días que faltan (o sobran) hasta una fecha. Negativo es atraso. */
export function diasHasta(iso: string) {
  const objetivo = new Date(iso);
  const hoy = new Date();
  objetivo.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
}
