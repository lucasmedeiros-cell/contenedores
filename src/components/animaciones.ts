"use client";

import { useEffect, useRef, useState } from "react";

/** Respeta la preferencia del sistema de reducir el movimiento. */
function sinMovimiento() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

const suavizar = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Lleva un número desde el valor anterior hasta el nuevo, para que los montos
 * "suban" en vez de aparecer de golpe. Si el sistema pide menos movimiento, el
 * recorrido dura cero y el valor aparece directo.
 */
export function useContador(objetivo: number, duracion = 900) {
  const [valor, setValor] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    const ms = sinMovimiento() ? 0 : duracion;
    const inicio = performance.now();
    const partida = desde.current;
    const delta = objetivo - partida;
    let cuadro = 0;

    // El estado acá es el fotograma de la animación: siempre se actualiza
    // desde el callback de `requestAnimationFrame`, nunca en el cuerpo del
    // efecto, así no encadena renders.
    const paso = (ahora: number) => {
      const t = ms === 0 ? 1 : Math.min(1, (ahora - inicio) / ms);
      setValor(partida + delta * suavizar(t));
      if (t < 1) cuadro = requestAnimationFrame(paso);
      else desde.current = objetivo;
    };

    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo, duracion]);

  return valor;
}
