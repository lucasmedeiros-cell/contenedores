/**
 * Exportación a CSV, una sola vez.
 *
 * Estaba escrita cinco veces —historial del patio, plantilla de importación,
 * ventas, movimientos y reportes del bar— y ya no coincidían: unas separaban
 * con coma y otras con punto y coma, así que el mismo Excel abría bien un
 * archivo y mal el otro.
 *
 * Se usa `;` porque es lo que espera Excel en configuración regional española,
 * y el archivo arranca con BOM para que respete los acentos.
 */

const BOM = "﻿";

type Celda = string | number | null | undefined;

function escapar(valor: Celda) {
  return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

/** Convierte cabecera + filas en el texto del CSV. */
export function aCsv(cabecera: string[], filas: Celda[][]) {
  return [cabecera, ...filas].map((f) => f.map(escapar).join(";")).join("\n");
}

/** Dispara la descarga de un texto como archivo. */
export function descargarTexto(contenido: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([BOM + contenido], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/** El caso normal: armar el CSV y bajarlo con la fecha de hoy en el nombre. */
export function exportarCsv(nombre: string, cabecera: string[], filas: Celda[][]) {
  const hoy = new Date().toISOString().slice(0, 10);
  descargarTexto(aCsv(cabecera, filas), `${nombre}-${hoy}.csv`);
}
