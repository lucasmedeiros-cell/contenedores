"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ComponentType } from "react";
import { useTema } from "@/components/tema";
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  GalleryHorizontalEnd,
  LayoutGrid,
  List,
} from "lucide-react";

/**
 * Las cuatro formas de mirar un catálogo de productos, compartidas por el
 * punto de venta y el inventario:
 *
 *   lista     tabla densa, para trabajar con muchos productos
 *   tarjeta   grilla de fichas, para ver de un vistazo
 *   ruleta    el anillo del POS: tres productos en gajos alrededor del centro
 *   carrusel  una fila que se desliza, el activo al medio
 *
 * La elección se recuerda por pantalla en el navegador: la cajera no tiene que
 * volver a elegirla en cada turno.
 */
export type Modo = "lista" | "tarjeta" | "ruleta" | "carrusel";

export const MODOS: { clave: Modo; etiqueta: string; icono: typeof List }[] = [
  { clave: "lista", etiqueta: "Lista", icono: List },
  { clave: "tarjeta", etiqueta: "Tarjetas", icono: LayoutGrid },
  { clave: "ruleta", etiqueta: "Ruleta", icono: Disc3 },
  { clave: "carrusel", etiqueta: "Carrusel", icono: GalleryHorizontalEnd },
];

/** Quien esté mirando el modo guardado se entera cuando otro lo cambia. */
const oyentes = new Set<() => void>();

export function useModo(clave: string, inicial: Modo): [Modo, (m: Modo) => void] {
  const suscribir = useCallback((avisar: () => void) => {
    oyentes.add(avisar);
    return () => void oyentes.delete(avisar);
  }, []);

  // En el servidor no hay localStorage: devuelve null y sale el modo inicial.
  // React vuelve a pedir el valor del navegador después de hidratar, así que
  // el primer HTML coincide y igual se respeta lo que eligió la cajera.
  const guardado = useSyncExternalStore(
    suscribir,
    () => window.localStorage.getItem(`modo-${clave}`),
    () => null,
  );

  const modo = MODOS.some((m) => m.clave === guardado) ? (guardado as Modo) : inicial;

  const elegir = useCallback(
    (m: Modo) => {
      window.localStorage.setItem(`modo-${clave}`, m);
      oyentes.forEach((avisar) => avisar());
    },
    [clave],
  );

  return [modo, elegir];
}

export function SelectorModo({
  valor,
  onElegir,
  className = "",
}: {
  valor: Modo;
  onElegir: (m: Modo) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Modo de vista"
      className={`inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-black p-1 ${className}`}
    >
      {MODOS.map(({ clave, etiqueta, icono: Icono }) => {
        const activo = valor === clave;
        return (
          <button
            key={clave}
            type="button"
            onClick={() => onElegir(clave)}
            aria-pressed={activo}
            title={`Modo ${etiqueta.toLowerCase()}`}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-bold transition ${
              activo
                ? "bg-[#FFC200] text-black"
                : "text-zinc-500 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icono className="h-4 w-4" />
            <span className="hidden lg:inline">{etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navegación común a ruleta y carrusel
// ---------------------------------------------------------------------------

/**
 * Flechas, teclado y arrastre: los tres van juntos siempre que haya un índice
 * que mover, y estaban escritos dos veces.
 *
 * Lo que se guarda no es el índice sino los **pasos acumulados**: la rueda gira
 * siempre para el lado que se pidió, aunque al dar la vuelta el producto de
 * arriba vuelva a ser el primero de la lista. El índice sale del resto.
 */
export function useGiro(cantidad: number, activo = true) {
  const [giro, setGiro] = useState(0);
  const indice = cantidad === 0 ? 0 : ((giro % cantidad) + cantidad) % cantidad;

  const girar = useCallback(
    (dir: number) => {
      if (cantidad === 0) return;
      setGiro((g) => g + dir);
    },
    [cantidad],
  );

  /** Ir a un producto concreto, por el camino más corto. */
  const setIndice = useCallback(
    (i: number) => {
      if (cantidad === 0) return;
      setGiro((g) => {
        const actual = ((g % cantidad) + cantidad) % cantidad;
        let d = i - actual;
        if (d > cantidad / 2) d -= cantidad;
        if (d < -cantidad / 2) d += cantidad;
        return g + d;
      });
    },
    [cantidad],
  );

  useEffect(() => {
    if (!activo) return;
    const alTeclear = (e: KeyboardEvent) => {
      const foco = document.activeElement;
      if (foco instanceof HTMLInputElement || foco instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") girar(1);
      if (e.key === "ArrowLeft") girar(-1);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [girar, activo]);

  return { indice, giro, setIndice, girar };
}

/** Arrastre horizontal para pasar de producto con el dedo. */
export function useArrastre(girar: (dir: number) => void) {
  const arrastre = useRef<{ x: number; usado: boolean } | null>(null);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      arrastre.current = { x: e.clientX, usado: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const a = arrastre.current;
      if (!a || a.usado) return;
      const dx = e.clientX - a.x;
      if (Math.abs(dx) > 60) {
        girar(dx < 0 ? 1 : -1);
        a.usado = true;
      }
    },
    onPointerUp: () => {
      arrastre.current = null;
    },
    onPointerLeave: () => {
      arrastre.current = null;
    },
  };
}

export function BotonGiro({ lado, onClick }: { lado: "izq" | "der"; onClick: () => void }) {
  const Icono = lado === "izq" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "izq" ? "Anterior" : "Siguiente"}
      className="z-30 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#FFC200] bg-black/80 text-[#FFC200] transition hover:bg-[#FFC200] hover:text-black active:scale-95"
    >
      <Icono className="h-7 w-7" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Geometría de los gajos
// ---------------------------------------------------------------------------

/** El lienzo de la ruleta, en unidades de SVG. El HTML se posiciona en %. */
export const LIENZO = { ancho: 1100, alto: 740, cx: 550, cy: 420 };

/**
 * Se redondea a dos decimales a propósito: Node y el navegador imprimen los
 * flotantes largos con distinta precisión y React lo veía como un atributo
 * cambiado al hidratar.
 */
export function punto(grados: number, radio: number) {
  const r = ((grados - 90) * Math.PI) / 180;
  const dec = (n: number) => Math.round(n * 100) / 100;
  return { x: dec(LIENZO.cx + radio * Math.cos(r)), y: dec(LIENZO.cy + radio * Math.sin(r)) };
}

/** De coordenada del lienzo a porcentaje del contenedor, para ubicar HTML. */
export function enPorcentaje(x: number, y: number) {
  return { left: `${(x / LIENZO.ancho) * 100}%`, top: `${(y / LIENZO.alto) * 100}%` };
}

/**
 * Un gajo de anillo con las esquinas redondeadas: el sector entre dos radios,
 * abierto un ángulo, con las cuatro puntas suavizadas con curvas cuadráticas.
 * Es lo que le da al POS la forma de rueda del diseño.
 */
export function gajo(desde: number, hasta: number, rInt: number, rExt: number, radioEsquina = 26) {
  const de = (radioEsquina / rExt) * (180 / Math.PI);
  const di = (radioEsquina / rInt) * (180 / Math.PI);

  const ee1 = punto(desde + de, rExt);
  const ee2 = punto(hasta - de, rExt);
  const ei1 = punto(desde + di, rInt);
  const ei2 = punto(hasta - di, rInt);

  // Esquinas: el vértice real hace de punto de control de la curva.
  const v1 = punto(desde, rExt);
  const v2 = punto(hasta, rExt);
  const v3 = punto(hasta, rInt);
  const v4 = punto(desde, rInt);

  const be2 = punto(hasta, rExt - radioEsquina);
  const bi2 = punto(hasta, rInt + radioEsquina);
  const bi1 = punto(desde, rInt + radioEsquina);
  const be1 = punto(desde, rExt - radioEsquina);

  return [
    `M ${ee1.x} ${ee1.y}`,
    `A ${rExt} ${rExt} 0 0 1 ${ee2.x} ${ee2.y}`,
    `Q ${v2.x} ${v2.y} ${be2.x} ${be2.y}`,
    `L ${bi2.x} ${bi2.y}`,
    `Q ${v3.x} ${v3.y} ${ei2.x} ${ei2.y}`,
    `A ${rInt} ${rInt} 0 0 0 ${ei1.x} ${ei1.y}`,
    `Q ${v4.x} ${v4.y} ${bi1.x} ${bi1.y}`,
    `L ${be1.x} ${be1.y}`,
    `Q ${v1.x} ${v1.y} ${ee1.x} ${ee1.y}`,
    "Z",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Ruleta
// ---------------------------------------------------------------------------

/** Cuánto separa a un producto de su vecino, en grados de la rueda. */
const PASO = 100;
/**
 * Cuántos lugares se dibujan a cada lado del de arriba. Con dos alcanza: el de
 * al lado se ve, y el siguiente entra desde abajo mientras se desvanece, así
 * ninguno aparece de la nada al girar.
 */
const ALCANCE = 2;
const GIRO_CSS = "0.6s cubic-bezier(.22, 1, .36, 1)";

/**
 * Los colores del SVG van como atributos, no como clases, así que las reglas
 * de `light-mode` no los alcanzan: la rueda elige su paleta a mano.
 */
const PALETAS = {
  noche: {
    gajo: "#0A0A0A",
    categoria: "#141414",
    lineaCategoria: "rgba(255,255,255,.08)",
    nucleo: "#000",
    lineaNucleo: "rgba(255,255,255,.12)",
  },
  dia: {
    gajo: "#FFFFFF",
    categoria: "#F4F4F5",
    lineaCategoria: "rgba(0,0,0,.10)",
    nucleo: "#FFFFFF",
    lineaNucleo: "rgba(0,0,0,.12)",
  },
} as const;
const ABERTURA = 40;
const R_INT = 170;
const R_EXT = 400;
/** Anillo de categorías, al centro. */
const CAT_INT = 92;
const CAT_EXT = 150;

export type GajoCategoria = {
  id: string;
  nombre: string;
  Icono: ComponentType<{ className?: string }>;
};

/**
 * El anillo del punto de venta: los productos en gajos alrededor de un núcleo
 * con las categorías. Todo se dibuja dentro de un solo SVG —el contenido de
 * cada gajo va en un `foreignObject`— para que la rueda escale entera con la
 * pantalla sin que se descoloquen los textos.
 */
export function Ruleta<T>({
  items,
  giro,
  onIndice,
  girar,
  render,
  categorias = [],
  categoriaActiva,
  onCategoria,
  centro,
  pie,
  vacio,
  maxAncho = "min(96vw, calc((100dvh - 190px) * 1.49))",
}: {
  items: T[];
  /** Pasos acumulados de `useGiro`: es el ángulo al que está la rueda. */
  giro: number;
  onIndice: (i: number) => void;
  girar: (dir: number) => void;
  /** El contenido del gajo. Recibe si es el que está arriba. */
  render: (item: T, activo: boolean) => ReactNode;
  categorias?: GajoCategoria[];
  categoriaActiva?: string;
  onCategoria?: (id: string) => void;
  /** Lo que va en el círculo negro del medio. */
  centro: ReactNode;
  /** Va en el hueco de abajo del anillo, sobre el lienzo. */
  pie?: ReactNode;
  vacio?: ReactNode;
  /** Cuánto puede crecer la rueda. Por defecto, lo que dé la pantalla. */
  maxAncho?: string;
}) {
  const arrastre = useArrastre(girar);
  const [tema] = useTema();
  const paleta = PALETAS[tema];
  const n = items.length;

  /**
   * Los lugares de la rueda alrededor del de arriba. Cada uno queda clavado a
   * su ángulo —`paso * PASO`— y lo que se mueve es la rueda entera: por eso el
   * giro se ve como un giro y no como un cambio de contenido.
   *
   * Se recorren pasos, no productos: si hay pocos, un mismo producto aparece
   * en más de un lugar, que es justo lo que hace una ruleta corta.
   */
  const lugares: { item: T; i: number; paso: number; desfase: number }[] = [];
  for (let paso = giro - ALCANCE; n > 0 && paso <= giro + ALCANCE; paso++) {
    const i = ((paso % n) + n) % n;
    // Con un solo producto no tiene sentido repetirlo a los costados.
    if (n === 1 && paso !== giro) continue;
    lugares.push({ item: items[i], i, paso, desfase: paso - giro });
  }

  /**
   * El anillo de categorías también gira, y por el camino corto: el salto se
   * calcula al hacer clic, que es cuando se sabe de dónde a dónde se va.
   */
  const iCategoria = Math.max(
    0,
    categorias.findIndex((c) => c.id === categoriaActiva),
  );
  const [giroCat, setGiroCat] = useState(() => iCategoria);
  const pasoCat = categorias.length > 0 ? 360 / categorias.length : 0;

  function elegirCategoria(j: number, id: string) {
    const total = categorias.length;
    let d = j - (((giroCat % total) + total) % total);
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    setGiroCat((g) => g + d);
    onCategoria?.(id);
  }

  return (
    <div className="relative mx-auto flex w-full flex-col" style={{ maxWidth: maxAncho }}>
      <div className="relative aspect-[1100/740] w-full touch-none select-none" {...arrastre}>
        <svg viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`} className="h-full w-full">
          <defs>
            <linearGradient id="gajo-activo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD34A" />
              <stop offset="100%" stopColor="#E6A700" />
            </linearGradient>
            <filter id="brillo-gajo" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#FFC200" floodOpacity=".55" />
            </filter>
            <filter id="brillo-suave" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#FFC200" floodOpacity=".3" />
            </filter>
          </defs>

          {/* --- Gajos de producto: la rueda que gira --- */}
          <g
            style={{
              transform: `rotate(${-giro * PASO}deg)`,
              transformOrigin: `${LIENZO.cx}px ${LIENZO.cy}px`,
              transition: `transform ${GIRO_CSS}`,
            }}
          >
            {lugares.map(({ item, i, paso, desfase }) => {
              const activo = desfase === 0;
              const angulo = paso * PASO;
              // El gajo se angosta hacia el centro: el contenido se acomoda a
              // lo que entra en su borde interno, no en el medio.
              const centroGajo = punto(angulo, activo ? 305 : 297);
              const ancho = activo ? 270 : 230;
              const alto = activo ? 180 : 215;

              return (
                <g
                  key={paso}
                  onClick={activo ? undefined : () => onIndice(i)}
                  className={activo ? "" : "cursor-pointer"}
                  filter={activo ? "url(#brillo-gajo)" : "url(#brillo-suave)"}
                  // Los de más afuera vienen entrando o saliendo: se desvanecen
                  // mientras la rueda los trae o los lleva.
                  style={{
                    opacity: Math.abs(desfase) > 1 ? 0 : 1,
                    transition: `opacity ${GIRO_CSS}`,
                    pointerEvents: Math.abs(desfase) > 1 ? "none" : "auto",
                  }}
                >
                  <path
                    d={gajo(angulo - ABERTURA, angulo + ABERTURA, R_INT, R_EXT)}
                    fill={activo ? "url(#gajo-activo)" : paleta.gajo}
                    stroke="#FFC200"
                    strokeWidth={activo ? 3 : 2}
                    strokeOpacity={activo ? 1 : 0.55}
                    style={{ transition: `fill ${GIRO_CSS}, stroke-opacity ${GIRO_CSS}` }}
                  />
                  {/* El contenido gira al revés que la rueda: viaja con su gajo
                      pero nunca se acuesta. */}
                  <g
                    style={{
                      transform: `rotate(${giro * PASO}deg)`,
                      transformOrigin: `${centroGajo.x}px ${centroGajo.y}px`,
                      transition: `transform ${GIRO_CSS}`,
                    }}
                  >
                    <foreignObject
                      x={centroGajo.x - ancho / 2}
                      y={centroGajo.y - alto / 2}
                      width={ancho}
                      height={alto}
                    >
                      {render(item, activo)}
                    </foreignObject>
                  </g>
                </g>
              );
            })}
          </g>

          {items.length === 0 && vacio && (
            <foreignObject x={LIENZO.cx - 250} y={LIENZO.cy - 330} width={500} height={160}>
              {vacio}
            </foreignObject>
          )}

          {/* --- Núcleo: el anillo de categorías, que gira con la rueda --- */}
          <g
            style={{
              transform: `rotate(${-giroCat * pasoCat}deg)`,
              transformOrigin: `${LIENZO.cx}px ${LIENZO.cy}px`,
              transition: `transform ${GIRO_CSS}`,
            }}
          >
            {categorias.map((c, i) => {
              const centroCat = i * pasoCat;
              const activa = c.id === categoriaActiva;
              const medio = punto(centroCat, (CAT_INT + CAT_EXT) / 2);

              return (
                <g key={c.id} onClick={() => elegirCategoria(i, c.id)} className="cursor-pointer">
                  <path
                    d={gajo(
                      centroCat - pasoCat / 2 + 3,
                      centroCat + pasoCat / 2 - 3,
                      CAT_INT,
                      CAT_EXT,
                      12,
                    )}
                    fill={activa ? "rgba(255,194,0,.15)" : paleta.categoria}
                    stroke={activa ? "#FFC200" : paleta.lineaCategoria}
                    strokeWidth={activa ? 2 : 1}
                    style={{ transition: `fill ${GIRO_CSS}, stroke ${GIRO_CSS}` }}
                  />
                  <g
                    style={{
                      transform: `rotate(${giroCat * pasoCat}deg)`,
                      transformOrigin: `${medio.x}px ${medio.y}px`,
                      transition: `transform ${GIRO_CSS}`,
                    }}
                  >
                    <foreignObject x={medio.x - 45} y={medio.y - 32} width={90} height={64}>
                      <div
                        className={`flex h-full w-full flex-col items-center justify-center gap-[3px] text-center leading-none ${
                          activa ? "text-[#FFC200]" : "text-zinc-400"
                        }`}
                      >
                        <c.Icono className="h-[22px] w-[22px]" />
                        <span className="text-[13px] font-bold">{c.nombre}</span>
                      </div>
                    </foreignObject>
                  </g>
                </g>
              );
            })}
          </g>

          {/* --- Núcleo: el dato del medio --- */}
          <circle
            cx={LIENZO.cx}
            cy={LIENZO.cy}
            r={CAT_INT - 4}
            fill={paleta.nucleo}
            stroke={paleta.lineaNucleo}
            strokeWidth="2"
          />
          <foreignObject
            x={LIENZO.cx - CAT_INT + 8}
            y={LIENZO.cy - CAT_INT + 18}
            width={(CAT_INT - 8) * 2}
            height={(CAT_INT - 18) * 2}
          >
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              {centro}
            </div>
          </foreignObject>

        </svg>

        <div className="absolute top-[56%] left-0 -translate-y-1/2">
          <BotonGiro lado="izq" onClick={() => girar(-1)} />
        </div>
        <div className="absolute top-[56%] right-0 -translate-y-1/2">
          <BotonGiro lado="der" onClick={() => girar(1)} />
        </div>

        {pie && (
          <div className="absolute bottom-[3%] left-1/2 z-30 w-[46%] min-w-[280px] -translate-x-1/2">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carrusel
// ---------------------------------------------------------------------------

/**
 * Fila deslizante: el activo al medio y los vecinos asomando a los costados,
 * más chicos y apagados. Sirve para cualquier ficha; la pinta quien lo usa.
 */
export function Carrusel<T>({
  items,
  indice,
  onIndice,
  girar,
  render,
  ancho = 260,
}: {
  items: T[];
  indice: number;
  onIndice: (i: number) => void;
  girar: (dir: number) => void;
  render: (item: T, activo: boolean) => ReactNode;
  /** Ancho de cada ficha, en px. */
  ancho?: number;
}) {
  const arrastre = useArrastre(girar);

  return (
    <div className="flex w-full items-center justify-center gap-3">
      <BotonGiro lado="izq" onClick={() => girar(-1)} />

      <div className="relative min-w-0 flex-1 overflow-hidden py-4" {...arrastre}>
        <div
          className="flex items-center transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)]"
          style={{
            transform: `translateX(calc(50% - ${ancho / 2}px - ${indice * (ancho + 16)}px))`,
          }}
        >
          {items.map((item, i) => {
            const activo = i === indice;
            return (
              <div
                key={i}
                onClick={() => !activo && onIndice(i)}
                style={{ width: ancho, marginRight: 16 }}
                className={`shrink-0 touch-none transition-all duration-500 ${
                  activo ? "scale-100 opacity-100" : "scale-[.82] cursor-pointer opacity-45"
                }`}
              >
                {render(item, activo)}
              </div>
            );
          })}
        </div>
      </div>

      <BotonGiro lado="der" onClick={() => girar(1)} />
    </div>
  );
}

/** Los puntitos de posición, iguales en la ruleta y en el carrusel. */
export function Puntos({ cantidad, indice }: { cantidad: number; indice: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: cantidad }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === indice ? "w-4 bg-[#FFC200]" : "w-1.5 bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
