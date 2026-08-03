"use client";

import { useEffect, useState } from "react";
import { alPrimerGesto, pistaPorton } from "@/lib/sonido";

/** Cuánto espera antes de abrir, y el respaldo si el audio no carga. */
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
  /** Lo que tarda la apertura: se calza con lo que dura el sonido. */
  const [duracion, setDuracion] = useState(DURACION);

  useEffect(() => {
    const audio = pistaPorton();
    if (!audio) return;

    let abre: ReturnType<typeof setTimeout> | undefined;
    let cierra: ReturnType<typeof setTimeout> | undefined;
    let cancelarGesto: (() => void) | undefined;

    /**
     * Las puertas y el sonido arrancan juntos y terminan juntos: la apertura
     * dura lo que dura la pista menos el retardo del arranque. Antes eran dos
     * tiempos fijos que no tenían nada que ver con el audio.
     */
    const programar = (totalMs: number) => {
      if (abre) return;
      const apertura = Math.max(1200, totalMs - RETARDO - 200);
      setDuracion(apertura);
      abre = setTimeout(() => {
        const abrir = () => {
          setAbriendo(true);
          cierra = setTimeout(() => setFin(true), apertura + 300);
        };
        // Si el navegador deja sonar, se abre con el sonido. Si lo bloquea
        // —una recarga, sin ningún clic previo—, se espera el primer gesto
        // para que puerta y sonido sigan yendo juntos.
        audio
          .play()
          .then(abrir)
          .catch(() => {
            cancelarGesto = alPrimerGesto((conSonido) => {
              if (conSonido) audio.play().catch(() => {});
              abrir();
            });
          });
      }, RETARDO);
    };

    const conMetadatos = () =>
      programar(Number.isFinite(audio.duration) ? audio.duration * 1000 : RETARDO + DURACION);

    audio.addEventListener("loadedmetadata", conMetadatos, { once: true });
    audio.addEventListener("error", () => programar(RETARDO + DURACION), { once: true });
    // Si la pista tarda en responder, la intro no se queda esperándola.
    const respaldo = setTimeout(() => programar(RETARDO + DURACION), 1200);

    return () => {
      clearTimeout(abre);
      clearTimeout(cierra);
      clearTimeout(respaldo);
      cancelarGesto?.();
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  if (fin) return null;

  const hoja: React.CSSProperties = {
    backgroundImage: "url(/contenedor.jpg)",
    backgroundSize: "100vw 100vh",
    backgroundRepeat: "no-repeat",
    filter: abriendo ? "brightness(1)" : "brightness(0.45)",
    transition: `transform ${duracion}ms cubic-bezier(0.55, 0, 0.25, 1), filter 700ms ease-out`,
    transformStyle: "preserve-3d",
    backfaceVisibility: "hidden",
    willChange: "transform, filter",
  };

  const sombra: React.CSSProperties = {
    transition: `opacity ${duracion}ms ease-out`,
    opacity: abriendo ? 1 : 0,
  };

  return (
    <div
      className={`splash-puertas fixed inset-0 z-[100] overflow-hidden ${
        abriendo ? "pointer-events-none" : ""
      }`}
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
