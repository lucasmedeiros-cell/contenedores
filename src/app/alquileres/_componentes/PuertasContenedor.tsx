"use client";

import { useEffect, useRef, useState } from "react";

/** Mismos tiempos que el prototipo. */
const RETARDO = 900;
const DURACION = 2000;

/**
 * Las dos puertas del contenedor girando sobre sus bisagras hasta abrirse.
 * Cada mitad rota 115° hacia afuera dentro de una perspectiva de 1700 px, y
 * al arrancar suena el golpe metálico.
 */
export default function PuertasContenedor() {
  const [abriendo, setAbriendo] = useState(false);
  const [fin, setFin] = useState(false);
  const sonido = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    sonido.current = new Audio("/puerta.mp3");
    sonido.current.volume = 0.9;

    const abre = setTimeout(() => {
      setAbriendo(true);
      // Si el navegador bloquea el audio sin gesto previo, se abre igual.
      sonido.current?.play().catch(() => {});
    }, RETARDO);
    const cierra = setTimeout(() => setFin(true), RETARDO + DURACION + 300);

    return () => {
      clearTimeout(abre);
      clearTimeout(cierra);
    };
  }, []);

  if (fin) return null;

  const hoja: React.CSSProperties = {
    backgroundImage: "url(/contenedor.jpg)",
    backgroundSize: "100vw 100vh",
    backgroundRepeat: "no-repeat",
    filter: abriendo ? "brightness(1)" : "brightness(0.45)",
    transition: `transform ${DURACION}ms cubic-bezier(0.55, 0, 0.25, 1), filter 700ms ease-out`,
    transformStyle: "preserve-3d",
    backfaceVisibility: "hidden",
    willChange: "transform, filter",
  };

  const sombra: React.CSSProperties = {
    transition: `opacity ${DURACION}ms ease-out`,
    opacity: abriendo ? 1 : 0,
  };

  return (
    <div
      className="splash-puertas pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      style={{ perspective: "1700px", perspectiveOrigin: "center center" }}
    >
      <div
        className="absolute top-0 left-0 h-full w-1/2"
        style={{
          ...hoja,
          backgroundPosition: "left center",
          transformOrigin: "left center",
          transform: abriendo ? "rotateY(-115deg)" : "rotateY(0deg)",
          boxShadow: "6px 0 50px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            ...sombra,
            background: "linear-gradient(to left, rgba(0,0,0,0.65), transparent 55%)",
          }}
        />
      </div>

      <div
        className="absolute top-0 right-0 h-full w-1/2"
        style={{
          ...hoja,
          backgroundPosition: "right center",
          transformOrigin: "right center",
          transform: abriendo ? "rotateY(115deg)" : "rotateY(0deg)",
          boxShadow: "-6px 0 50px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            ...sombra,
            background: "linear-gradient(to right, rgba(0,0,0,0.65), transparent 55%)",
          }}
        />
      </div>
    </div>
  );
}
