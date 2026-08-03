/**
 * Geometría isométrica del plano del patio.
 *
 * El plano trabaja sobre una grilla de celdas. Cada celda mide 2 m × 2 m en el
 * mundo real, y se proyecta a pantalla en isométrico 2:1 (el clásico "dimétrico"
 * de los juegos: cada celda es un rombo del doble de ancho que de alto).
 */

/** Ancho de una celda proyectada, en píxeles del lienzo SVG. */
export const CELDA_W = 58;
/** Alto de una celda proyectada. La mitad del ancho ⇒ ángulo isométrico 2:1. */
export const CELDA_H = 29;
/** Altura en píxeles de un módulo de contenedor (2,6 m reales). */
export const ALTO_MODULO = 46;
/** Metros reales que representa una celda de la grilla. */

export type Punto = { x: number; y: number };

/** Proyecta una coordenada de grilla al lienzo isométrico. */
export function proyectar(gx: number, gy: number, altura = 0): Punto {
  return {
    x: (gx - gy) * (CELDA_W / 2),
    y: (gx + gy) * (CELDA_H / 2) - altura,
  };
}

export function puntos(lista: Punto[]): string {
  return lista.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/** Huella de un objeto sobre la grilla, ya aplicada la rotación. */
export function huella(
  gridX: number,
  gridY: number,
  ancho: number,
  largo: number,
  rotacion: number,
) {
  const girado = rotacion === 90 || rotacion === 270;
  return {
    x: gridX,
    y: gridY,
    w: girado ? largo : ancho,
    d: girado ? ancho : largo,
  };
}

/** Las tres caras visibles de un prisma isométrico. */
export function caras(
  gx: number,
  gy: number,
  w: number,
  d: number,
  altura: number,
) {
  const techo = [
    proyectar(gx, gy, altura),
    proyectar(gx + w, gy, altura),
    proyectar(gx + w, gy + d, altura),
    proyectar(gx, gy + d, altura),
  ];
  // Cara visible del lado +x (a la derecha en pantalla)
  const derecha = [
    proyectar(gx + w, gy, altura),
    proyectar(gx + w, gy + d, altura),
    proyectar(gx + w, gy + d, 0),
    proyectar(gx + w, gy, 0),
  ];
  // Cara visible del lado +y (a la izquierda en pantalla)
  const izquierda = [
    proyectar(gx, gy + d, altura),
    proyectar(gx + w, gy + d, altura),
    proyectar(gx + w, gy + d, 0),
    proyectar(gx, gy + d, 0),
  ];
  const base = [
    proyectar(gx, gy),
    proyectar(gx + w, gy),
    proyectar(gx + w, gy + d),
    proyectar(gx, gy + d),
  ];
  return { techo, derecha, izquierda, base };
}

/** Rombo de una zona del suelo. */
export function losa(gx: number, gy: number, w: number, h: number) {
  return [
    proyectar(gx, gy),
    proyectar(gx + w, gy),
    proyectar(gx + w, gy + h),
    proyectar(gx, gy + h),
  ];
}

/**
 * Orden de dibujado (algoritmo del pintor): lo que está más "atrás" en la
 * grilla se pinta primero. En isométrico eso es la suma de coordenadas.
 */
export function profundidad(gx: number, gy: number, w = 0, d = 0) {
  return gx + gy + (w + d) / 2;
}

/** Caja envolvente del plano completo, para calcular el viewBox del SVG. */
export function limites(celdasAncho: number, celdasAlto: number, margen = 90) {
  const esquinas = [
    proyectar(0, 0),
    proyectar(celdasAncho, 0),
    proyectar(celdasAncho, celdasAlto),
    proyectar(0, celdasAlto),
  ];
  const xs = esquinas.map((p) => p.x);
  const ys = esquinas.map((p) => p.y);
  const minX = Math.min(...xs) - margen;
  const maxX = Math.max(...xs) + margen;
  // Se agrega altura extra arriba para que entren los contenedores y sus toldos
  const minY = Math.min(...ys) - margen - ALTO_MODULO * 2.4;
  const maxY = Math.max(...ys) + margen;
  return { minX, minY, ancho: maxX - minX, alto: maxY - minY };
}

/** Convierte un punto del lienzo isométrico de vuelta a celdas de grilla. */
export function desproyectar(x: number, y: number): Punto {
  const gx = (y / (CELDA_H / 2) + x / (CELDA_W / 2)) / 2;
  const gy = (y / (CELDA_H / 2) - x / (CELDA_W / 2)) / 2;
  return { x: gx, y: gy };
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

function hexARgb(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Aclara (factor > 1) u oscurece (factor < 1) un color hexadecimal. */
export function tono(hex: string, factor: number) {
  const { r, g, b } = hexARgb(hex);
  const ajustar = (c: number) =>
    Math.max(0, Math.min(255, Math.round(factor >= 1 ? c + (255 - c) * (factor - 1) : c * factor)));
  return `#${[ajustar(r), ajustar(g), ajustar(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Mezcla un color con otro. `peso` 0 = a, 1 = b. */
export function mezclar(a: string, b: string, peso: number) {
  const ca = hexARgb(a);
  const cb = hexARgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * peso);
  return `#${[m(ca.r, cb.r), m(ca.g, cb.g), m(ca.b, cb.b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

// ---------------------------------------------------------------------------
// Texturas del suelo
// ---------------------------------------------------------------------------

export const TEXTURAS: Record<
  string,
  { base: string; veta: string; etiqueta: string }
> = {
  cemento: { base: "#2a2a2e", veta: "#35353a", etiqueta: "Cemento alisado" },
  deck: { base: "#3d2a18", veta: "#4d3620", etiqueta: "Deck de madera" },
  cesped: { base: "#1c2e1c", veta: "#24401f", etiqueta: "Césped" },
  adoquin: { base: "#2e2b28", veta: "#3a3632", etiqueta: "Adoquinado" },
};
