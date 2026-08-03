import type { GeoZona } from "../../../../../prisma/datos/patio";

export type EstadoPlano = "libre" | "al-dia" | "pendiente";

/** Cómo se dibuja un puesto en el plano. También lo guarda `PuestoCliente`. */
export type GeoPuesto = {
  gridX: number;
  gridY: number;
  ancho: number;
  largo: number;
  alto: number;
  rotacion: number;
  colorBase: string;
  tipo: string;
  tieneToldo: boolean;
  icono: string | null;
};

export type PuestoPlano = GeoPuesto & {
  id: string;
  numero: string;
  nombre: string | null;
  rubro: string | null;
  tamanoM2: number;
  zonaNombre: string;
  estado: "LIBRE" | "OCUPADO" | "PENDIENTE";
  estadoPago: EstadoPlano;
  inquilino: string | null;
  negocio: string | null;
  monto: number;
  /** Cantidad de períodos impagos */
  periodosDeuda: number;
  deuda: number;
};

export type ZonaPlano = GeoZona & {
  id: string;
  nombre: string;
};

export type DatosPlano = {
  zonas: ZonaPlano[];
  puestos: PuestoPlano[];
  celdasAncho: number;
  celdasAlto: number;
};
