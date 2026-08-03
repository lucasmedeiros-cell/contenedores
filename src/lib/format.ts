import { Prisma } from "@prisma/client";

/**
 * Formato de todo el sistema: alquileres y cervecería cobran en la misma
 * moneda, así que hay una sola función de plata y una sola de fechas.
 */
const LOCAL = "es-BO";
const MONEDA = "BOB";

/**
 * La zona del negocio. Hace falta nombrarla porque las fechas se guardan en UTC:
 * agrupar por día o por hora directamente sobre la columna manda las ventas de
 * después de las 20 h al día siguiente y corre el gráfico horario cuatro horas.
 */
export const ZONA_HORARIA = "America/La_Paz";

type Numerico = number | string | Prisma.Decimal | null | undefined;

/** Convierte cualquier Decimal/string/number de Prisma a number plano. */
export function num(valor: Numerico): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return valor;
  return Number(valor.toString());
}

const enteros = new Intl.NumberFormat(LOCAL, {
  style: "currency",
  currency: MONEDA,
  maximumFractionDigits: 0,
});

const conCentavos = new Intl.NumberFormat(LOCAL, {
  style: "currency",
  currency: MONEDA,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `Bs 1.250` — con `decimales`, `Bs 1.250,50`. */
export function plata(valor: Numerico, decimales = false) {
  const n = num(valor);
  return decimales ? conCentavos.format(n) : enteros.format(n);
}

// ---------------------------------------------------------------------------
// Importes en letras, para los comprobantes impresos
// ---------------------------------------------------------------------------

const UNIDADES = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

/** 0–999 en palabras. */
function tramo(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  if (n < 30) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d];
  }
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return resto ? `${CENTENAS[c]} ${tramo(resto)}` : CENTENAS[c];
}

/**
 * El importe escrito, como lo pide un recibo: "quinientos ochenta mil 00/100".
 * Los centavos van en números —es lo usual en los comprobantes— y el "uno"
 * final se apocopa ("veintiún mil", "un millón").
 */
export function enLetras(valor: Numerico): string {
  const n = num(valor);
  const entero = Math.floor(Math.abs(n));
  const centavos = Math.round((Math.abs(n) - entero) * 100);

  const decir = (v: number): string => {
    if (v === 0) return "cero";
    const millones = Math.floor(v / 1_000_000);
    const miles = Math.floor((v % 1_000_000) / 1000);
    const resto = v % 1000;

    const partes: string[] = [];
    if (millones === 1) partes.push("un millón");
    else if (millones > 1) partes.push(`${tramo(millones).replace(/uno$/, "un")} millones`);
    if (miles === 1) partes.push("mil");
    else if (miles > 1) partes.push(`${tramo(miles).replace(/uno$/, "ún")} mil`);
    if (resto) partes.push(tramo(resto));
    return partes.join(" ");
  };

  return `${n < 0 ? "menos " : ""}${decir(entero)} ${String(centavos).padStart(2, "0")}/100`;
}

export function litros(valor: Numerico) {
  return `${num(valor).toLocaleString(LOCAL, { maximumFractionDigits: 1 })} L`;
}

export function numero(valor: Numerico, decimales = 0) {
  return new Intl.NumberFormat(LOCAL, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(num(valor));
}

// ---------------------------------------------------------------------------

/** Nombres de mes, en las dos formas que usa el sistema. */
export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MESES_CORTOS = MESES.map((m) => m.slice(0, 3));

const aFecha = (valor: Date | string) => (typeof valor === "string" ? new Date(valor) : valor);

/** `02/08/2026`, y con `conHora`, `02/08/2026 14:30`. */
export function fecha(valor: Date | string, conHora = false) {
  const d = aFecha(valor);
  const base = d.toLocaleDateString(LOCAL, { day: "2-digit", month: "2-digit", year: "numeric" });
  return conHora ? `${base} ${hora(d)}` : base;
}

/**
 * `05:00 p. m.` Node y el navegador separan el "p. m." con espacios distintos
 * (uno angosto, otro normal) y React lo marcaba como error de hidratación: se
 * normalizan todos los espacios raros a uno común.
 */
export function hora(valor: Date | string) {
  return aFecha(valor)
    .toLocaleTimeString(LOCAL, { hour: "2-digit", minute: "2-digit" })
    .replace(/[   ]/g, " ");
}

/** `02 ago 14:30` — el formato corto que usan los tickets del bar. */
export function fechaHora(valor: Date | string) {
  const d = aFecha(valor);
  return `${d.toLocaleDateString(LOCAL, { day: "2-digit", month: "short" })} ${hora(d)}`;
}

/** Hace cuánto pasó algo, para las comandas abiertas del salón. */
export function haceRato(valor: Date | string) {
  const minutos = Math.max(0, Math.round((Date.now() - aFecha(valor).getTime()) / 60000));
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}
