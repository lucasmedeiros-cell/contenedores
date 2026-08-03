"use client";

/**
 * Los sonidos de las dos intros.
 *
 * El navegador no deja sonar nada hasta que el usuario tocó la página. Las
 * intros arrancan solas al entrar, así que el audio salía mudo con
 * `NotAllowedError`. La salida es desbloquear la pista en el clic del login
 * —un `play()` en silencio, que el navegador sí acepta porque hay gesto— y
 * después reproducir ese MISMO elemento cuando la intro arranca.
 */

const PISTA_PORTON = "/puerta.mp4";

let porton: HTMLAudioElement | null = null;

function crear() {
  if (typeof Audio === "undefined") return null;
  if (!porton) {
    porton = new Audio(PISTA_PORTON);
    porton.preload = "auto";
    porton.volume = 0.9;
  }
  return porton;
}

/** Se llama desde un clic. Deja la pista lista para sonar sin gesto después. */
export function prepararPorton() {
  const a = crear();
  if (!a) return;
  a.muted = true;
  a
    .play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    })
    .catch(() => {
      a.muted = false;
    });
}

/** La pista del portón, ya desbloqueada si se pasó por el login. */
export function pistaPorton() {
  return crear();
}

/**
 * Cerveza sirviéndose, sintetizada con WebAudio: ruido filtrado que hace de
 * chorro y burbujas que van saliendo. Sin archivo: no hay nada que bajar, y en
 * la laptop de demostración —sin internet— suena igual.
 */
export function servirCerveza(duracion = 2.2) {
  type ConWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctx =
    typeof window === "undefined"
      ? undefined
      : window.AudioContext ?? (window as ConWebkit).webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const ahora = ctx.currentTime;

  // --- el chorro: ruido blanco pasado por un filtro que se va cerrando ---
  const muestras = Math.floor(ctx.sampleRate * duracion);
  const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;

  const chorro = ctx.createBufferSource();
  chorro.buffer = buffer;

  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.Q.value = 1.1;
  // Al principio el vaso está vacío y el chorro suena grave y hueco; a medida
  // que sube el líquido, el tono sube. Es lo que hace que se reconozca.
  filtro.frequency.setValueAtTime(380, ahora);
  filtro.frequency.exponentialRampToValueAtTime(1400, ahora + duracion * 0.85);

  const volumen = ctx.createGain();
  volumen.gain.setValueAtTime(0.0001, ahora);
  volumen.gain.exponentialRampToValueAtTime(0.16, ahora + 0.18);
  volumen.gain.setValueAtTime(0.16, ahora + duracion - 0.5);
  volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);

  chorro.connect(filtro).connect(volumen).connect(ctx.destination);
  chorro.start(ahora);
  chorro.stop(ahora + duracion);

  // --- las burbujas: pequeños tonos que suben, salteados ---
  for (let i = 0; i < 14; i++) {
    const cuando = ahora + 0.25 + Math.random() * (duracion - 0.5);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + Math.random() * 700, cuando);
    osc.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 900, cuando + 0.07);
    g.gain.setValueAtTime(0.0001, cuando);
    g.gain.exponentialRampToValueAtTime(0.05, cuando + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.09);
    osc.connect(g).connect(ctx.destination);
    osc.start(cuando);
    osc.stop(cuando + 0.1);
  }

  // El contexto se cierra solo al terminar: no queda uno abierto por visita.
  window.setTimeout(() => ctx.close().catch(() => {}), (duracion + 0.4) * 1000);
}
