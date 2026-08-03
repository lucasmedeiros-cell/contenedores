"use client";

import { useEffect, useState } from "react";
import { useTema } from "@/components/tema";
import { alPrimerGesto, servirCerveza } from "@/lib/sonido";

/**
 * Intro de la cervecería: un chopp que se llena, la espuma que sube y el
 * cartel de la casa; después se levanta y deja la app.
 *
 * Se ve en cada carga de la página, no una sola vez por pestaña: recargando
 * para mostrarla no aparecía, que es justo cuando uno la quiere ver. Un toque
 * la saltea.
 */

/** El vaso tarda esto en llenarse; después se sostiene un momento. */
const LLENADO = 1500;
const ESPERA = 2400;
const SALIDA = 620;

export default function SplashCerveceria() {
  const [lleno, setLleno] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [fin, setFin] = useState(false);

  useEffect(() => {
    // Quien pidió menos movimiento ve el cartel un instante y sigue.
    const corto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const espera = corto ? 500 : ESPERA;

    let sale: ReturnType<typeof setTimeout>;
    let cierra: ReturnType<typeof setTimeout>;
    let cancelarGesto = () => {};

    /** Llena el vaso y programa la salida de la intro. */
    const servir = (conSonido: boolean) => {
      setLleno(true);
      if (!corto && conSonido) servirCerveza(LLENADO / 1000 + 0.5);
      clearTimeout(sale);
      clearTimeout(cierra);
      sale = setTimeout(() => setSaliendo(true), espera);
      cierra = setTimeout(() => setFin(true), espera + SALIDA);
    };

    /**
     * El vaso se llena en hora, suene o no. Si el navegador calló el chorro
     * —recarga, sin gesto previo—, al primer clic se vacía y se vuelve a
     * servir con el sonido: así el chorro y el llenado salen juntos, que es de
     * lo que se trata.
     */
    const llena = setTimeout(() => {
      const sono = !corto && servirCerveza(LLENADO / 1000 + 0.5);
      servir(false);
      if (!sono && !corto) {
        cancelarGesto = alPrimerGesto((conSonido) => {
          if (!conSonido) return;
          setLleno(false);
          requestAnimationFrame(() => requestAnimationFrame(() => servir(true)));
        }, 3000);
      }
    }, 60);

    return () => {
      cancelarGesto();
      clearTimeout(llena);
      clearTimeout(sale);
      clearTimeout(cierra);
    };
  }, []);

  if (fin) return null;

  return (
    <div
      className="splash-bar fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-black"
      style={{
        opacity: saliendo ? 0 : 1,
        transform: saliendo ? "translateY(-3%) scale(1.04)" : "none",
        transition: `opacity ${SALIDA}ms ease-in, transform ${SALIDA}ms ease-in`,
      }}
      // Un toque saltea la intro: en el mostrador nadie quiere esperar.
      onPointerDown={() => setSaliendo(true)}
      role="presentation"
    >
      {/* El resplandor ámbar de la barra */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 42%, rgba(255,194,0,.16), transparent 70%)",
          opacity: lleno ? 1 : 0,
          transition: "opacity 1.2s ease-out",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 px-6">
        <Chopp lleno={lleno} />

        <div
          className="text-center"
          style={{
            opacity: lleno ? 1 : 0,
            transform: lleno ? "none" : "translateY(10px)",
            transition: "opacity .7s ease-out .35s, transform .7s ease-out .35s",
          }}
        >
          <p className="text-[34px] leading-none font-black tracking-tight text-white sm:text-[44px]">
            Cervecería
          </p>
          <p className="mt-2 text-[12px] font-bold tracking-[.45em] text-[#FFC200] uppercase">
            Contenedores
          </p>
        </div>

        {/* La barrita se llena al mismo ritmo que el vaso */}
        <div className="h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#FFC200]"
            style={{
              width: lleno ? "100%" : "0%",
              transition: `width ${LLENADO}ms cubic-bezier(.35,.9,.35,1)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Nivel de cerveza dentro del vaso, en unidades del dibujo. */
const CUERPO = { x: 30, y: 44, ancho: 104, alto: 168, radio: 12 };
const TOPE = CUERPO.y + 22;

/**
 * El chopp: el vidrio, la cerveza que sube desde el fondo, la espuma que se
 * arma arriba y las burbujas. Todo en SVG, sin imágenes: pesa nada y se ve
 * nítido en el televisor del salón igual que en una tablet.
 */
function Chopp({ lleno }: { lleno: boolean }) {
  const [tema] = useTema();
  const altoLiquido = lleno ? CUERPO.y + CUERPO.alto - TOPE : 0;
  // De día el fondo es blanco y la espuma blanca desaparecía: se le pone un
  // contorno tenue en vez de ensuciarle el color.
  const bordeEspuma = tema === "dia" ? "#E4C078" : "transparent";

  return (
    <svg viewBox="0 0 200 250" className="h-[240px] w-[192px] sm:h-[300px] sm:w-[240px]">
      <defs>
        <linearGradient id="splash-cerveza" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E9A100" />
          <stop offset="45%" stopColor="#FFC200" />
          <stop offset="100%" stopColor="#D98E00" />
        </linearGradient>
        <linearGradient id="splash-vidrio" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".22" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity=".05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".18" />
        </linearGradient>
        {/* La cerveza y las burbujas viven dentro del vaso */}
        <clipPath id="splash-dentro">
          <rect
            x={CUERPO.x}
            y={CUERPO.y}
            width={CUERPO.ancho}
            height={CUERPO.alto}
            rx={CUERPO.radio}
          />
        </clipPath>
      </defs>

      {/* Asa: arranca dentro del vidrio (x=128, no 134) para que no se vea el
          corte entre el asa y el vaso, y va detrás del cuerpo. */}
      <path
        d="M128 104h18a25 25 0 0 1 0 50h-18"
        fill="none"
        stroke="#FFC200"
        strokeOpacity=".5"
        strokeWidth="10"
        strokeLinejoin="round"
      />

      <g clipPath="url(#splash-dentro)">
        <rect
          x={CUERPO.x}
          y={CUERPO.y}
          width={CUERPO.ancho}
          height={CUERPO.alto}
          fill="url(#splash-vidrio)"
        />

        {/* la cerveza, subiendo */}
        <rect
          x={CUERPO.x}
          width={CUERPO.ancho}
          fill="url(#splash-cerveza)"
          y={CUERPO.y + CUERPO.alto - altoLiquido}
          height={altoLiquido}
          style={{ transition: `y ${LLENADO}ms cubic-bezier(.35,.9,.35,1), height ${LLENADO}ms cubic-bezier(.35,.9,.35,1)` }}
        />

        {/* burbujas: sólo tienen sentido con líquido */}
        {lleno &&
          [
            [52, 2.6, 0],
            [72, 1.9, 0.45],
            [92, 2.3, 0.2],
            [110, 1.7, 0.7],
            [124, 2.1, 0.95],
          ].map(([cx, r, retardo]) => (
            <circle
              key={cx}
              cx={cx}
              r={r}
              fill="#fff8e1"
              opacity=".75"
              className="splash-burbuja"
              style={{ animationDelay: `${retardo}s` }}
            />
          ))}
      </g>

      {/* espuma: se arma cuando el vaso está por llenarse */}
      <g
        style={{
          opacity: lleno ? 1 : 0,
          transform: lleno ? "none" : "translateY(14px)",
          transformOrigin: "center",
          transition: `opacity .5s ease-out ${LLENADO - 500}ms, transform .6s cubic-bezier(.34,1.56,.64,1) ${LLENADO - 550}ms`,
        }}
      >
        {/* La espuma es una banda que cubre TODO el ancho del vaso —antes era
            un contorno dibujado a mano que no llegaba al borde derecho y dejaba
            ver el fondo negro— más el copete que asoma por encima del vidrio. */}
        <g clipPath="url(#splash-dentro)">
          <rect
            x={CUERPO.x}
            y={CUERPO.y - 4}
            width={CUERPO.ancho}
            height={TOPE - CUERPO.y + 12}
            fill="#FFFBEB"
            stroke={bordeEspuma}
            strokeWidth="1.5"
          />
        </g>
        {[
          [46, 10],
          [68, 12],
          [92, 11],
          [114, 10],
          [130, 8],
        ].map(([cx, r]) => (
          <circle
            key={cx}
            cx={cx}
            cy={CUERPO.y + 4}
            r={r}
            fill="#FFFDF5"
            stroke={bordeEspuma}
            strokeWidth="1.5"
          />
        ))}
      </g>

      {/* el vidrio por encima de todo */}
      <rect
        x={CUERPO.x}
        y={CUERPO.y}
        width={CUERPO.ancho}
        height={CUERPO.alto}
        rx={CUERPO.radio}
        fill="none"
        stroke="#FFC200"
        strokeOpacity=".55"
        strokeWidth="3"
      />
      {/* brillo */}
      <rect x="44" y="70" width="9" height="118" rx="4.5" fill="#ffffff" opacity=".16" />

      {/* base */}
      <rect x="24" y="212" width="116" height="10" rx="5" fill="#FFC200" opacity=".25" />
    </svg>
  );
}
