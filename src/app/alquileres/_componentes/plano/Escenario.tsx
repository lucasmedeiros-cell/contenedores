"use client";

import { memo } from "react";
import {
  ALTO_MODULO,
  CELDA_H,
  CELDA_W,
  TEXTURAS,
  losa,
  mezclar,
  proyectar,
  puntos,
  tono,
} from "@alquileres/_lib/iso";
import type { ZonaPlano } from "./tipos";

/**
 * Rellenos SVG reutilizables: texturas del suelo.
 *
 * `claro` es el modo Día de la aplicación (no el de la escena): con el cielo
 * claro, la viñeta de siempre enmarcaba el patio con un halo sucio, así que se
 * baja casi hasta desaparecer.
 */
export function DefsTexturas({ noche, claro = false }: { noche: boolean; claro?: boolean }) {
  return (
    <defs>
      {Object.entries(TEXTURAS).map(([clave, t]) => {
        // Las texturas se dibujaron para el tema oscuro (el cemento es #2a2a2e),
        // así que con el cielo claro el patio quedaba como una mancha negra:
        // en modo Día se aclaran hacia el gris del fondo.
        const base = noche
          ? mezclar(t.base, "#070b14", 0.55)
          : claro
            ? mezclar(t.base, "#eef1f5", 0.62)
            : t.base;
        const veta = noche
          ? mezclar(t.veta, "#0b1220", 0.5)
          : claro
            ? mezclar(t.veta, "#eef1f5", 0.55)
            : t.veta;
        return (
          <pattern
            key={clave}
            id={`tex-${clave}`}
            patternUnits="userSpaceOnUse"
            width={CELDA_W}
            height={CELDA_H}
            patternTransform={`skewY(${-Math.atan(CELDA_H / CELDA_W) * (180 / Math.PI)})`}
          >
            <rect width={CELDA_W} height={CELDA_H} fill={base} />
            {clave === "deck" && (
              <>
                <rect y={0} width={CELDA_W} height={CELDA_H / 2 - 0.6} fill={veta} />
                <line x1={0} y1={CELDA_H / 2} x2={CELDA_W} y2={CELDA_H / 2} stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
                <line x1={0} y1={CELDA_H - 0.5} x2={CELDA_W} y2={CELDA_H - 0.5} stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
              </>
            )}
            {clave === "adoquin" && (
              <>
                <rect x={1} y={1} width={CELDA_W / 2 - 2} height={CELDA_H - 2} rx={2} fill={veta} />
                <rect x={CELDA_W / 2 + 1} y={1} width={CELDA_W / 2 - 2} height={CELDA_H - 2} rx={2} fill={tono(veta, 0.9)} />
              </>
            )}
            {clave === "cemento" && (
              <>
                <line x1={0} y1={CELDA_H} x2={CELDA_W} y2={CELDA_H} stroke="#000" strokeOpacity="0.3" strokeWidth="1.2" />
                <line x1={CELDA_W} y1={0} x2={CELDA_W} y2={CELDA_H} stroke="#000" strokeOpacity="0.3" strokeWidth="1.2" />
                <circle cx={CELDA_W * 0.3} cy={CELDA_H * 0.6} r="1.1" fill={veta} />
                <circle cx={CELDA_W * 0.7} cy={CELDA_H * 0.3} r="0.9" fill={veta} />
              </>
            )}
            {clave === "cesped" && (
              <>
                {Array.from({ length: 12 }, (_, i) => (
                  <line
                    key={i}
                    x1={(i * CELDA_W) / 12 + 2}
                    y1={CELDA_H}
                    x2={(i * CELDA_W) / 12 + 3}
                    y2={CELDA_H - 4 - (i % 3)}
                    stroke={veta}
                    strokeWidth="1.4"
                  />
                ))}
              </>
            )}
          </pattern>
        );
      })}

      <radialGradient id="vineta" cx="50%" cy="45%" r="70%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        {/* La viñeta cubre el viewBox, no todo el lienzo, así que sobre cielo
            claro se le veían los dos bordes verticales: en Día va en cero. */}
        <stop offset="100%" stopColor="#000" stopOpacity={claro ? 0 : noche ? 0.75 : 0.45} />
      </radialGradient>

      <radialGradient id="charco-luz">
        <stop offset="0%" stopColor="#ffcf6b" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#ffcf6b" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Losa de una zona, con su cartel de sector. */
function ZonaBase({ zona, noche }: { zona: ZonaPlano; noche: boolean }) {
  const tex = TEXTURAS[zona.textura] ?? TEXTURAS.cemento;
  const forma = losa(zona.gridX, zona.gridY, zona.gridW, zona.gridH);
  const centro = proyectar(zona.gridX + zona.gridW / 2, zona.gridY + zona.gridH / 2);
  const etiquetaPos = proyectar(zona.gridX + 0.15, zona.gridY + zona.gridH - 0.15);

  return (
    <g>
      <polygon points={puntos(forma)} fill={`url(#tex-${zona.textura})`} />
      <polygon
        points={puntos(forma)}
        fill="none"
        stroke={noche ? "#3f3f46" : "#52525b"}
        strokeOpacity="0.5"
        strokeWidth="1.2"
      />
      {/* Techado translúcido para las zonas cubiertas */}
      {zona.cubierta && (
        <polygon points={puntos(forma)} fill="#000" opacity={noche ? 0.28 : 0.18} />
      )}
      <text
        x={etiquetaPos.x}
        y={etiquetaPos.y}
        fill={noche ? "#52525b" : "#71717a"}
        fontSize="9"
        fontWeight="700"
        letterSpacing="1.6"
        style={{ pointerEvents: "none", textTransform: "uppercase" }}
      >
        {zona.nombre}
      </text>
      <title>{`${zona.nombre} · ${tex.etiqueta}`}</title>
      <circle cx={centro.x} cy={centro.y} r="0" />
    </g>
  );
}

export const Zona = memo(ZonaBase);

// ---------------------------------------------------------------------------
// Mobiliario y vegetación
// ---------------------------------------------------------------------------

/** Mesa redonda con sombrilla y banquetas. */
export function Mesa({ gx, gy, noche, semilla = 0 }: { gx: number; gy: number; noche: boolean; semilla?: number }) {
  const p = proyectar(gx, gy);
  const alto = 15;
  const tapa = proyectar(gx, gy, alto);
  const sombrilla = semilla % 3 === 0;

  return (
    <g style={{ pointerEvents: "none" }}>
      <ellipse cx={p.x - 5} cy={p.y + 3} rx="13" ry="6.5" fill="#000" opacity={noche ? 0.45 : 0.3} style={{ filter: "blur(3px)" }} />
      {/* Banquetas */}
      {[0, 1, 2, 3].map((i) => {
        const ang = (i * Math.PI) / 2 + 0.4;
        const bx = gx + Math.cos(ang) * 0.42;
        const by = gy + Math.sin(ang) * 0.42;
        const b = proyectar(bx, by, 8);
        const bb = proyectar(bx, by, 0);
        return (
          <g key={i}>
            <line x1={b.x} y1={b.y} x2={bb.x} y2={bb.y} stroke="#3f3f46" strokeWidth="2" />
            <ellipse cx={b.x} cy={b.y} rx="4.4" ry="2.3" fill={noche ? "#3f3f46" : "#52525b"} />
          </g>
        );
      })}
      {/* Pata */}
      <line x1={tapa.x} y1={tapa.y} x2={p.x} y2={p.y} stroke="#3f3f46" strokeWidth="2.6" />
      {/* Tapa */}
      <ellipse cx={tapa.x} cy={tapa.y} rx="10.5" ry="5.2" fill={noche ? "#4a3520" : "#6b4a28"} />
      <ellipse cx={tapa.x} cy={tapa.y - 1.4} rx="10.5" ry="5.2" fill={noche ? "#5c4227" : "#8a6234"} />
      {sombrilla && (
        <g>
          <line x1={tapa.x} y1={tapa.y - 1} x2={tapa.x} y2={tapa.y - 34} stroke="#3f3f46" strokeWidth="2" />
          <path
            d={`M ${tapa.x - 21} ${tapa.y - 32} Q ${tapa.x} ${tapa.y - 47} ${tapa.x + 21} ${tapa.y - 32} Q ${tapa.x} ${tapa.y - 26} ${tapa.x - 21} ${tapa.y - 32} Z`}
            fill={noche ? "#7a5a12" : "#d99e00"}
          />
          <path
            d={`M ${tapa.x - 21} ${tapa.y - 32} Q ${tapa.x} ${tapa.y - 47} ${tapa.x} ${tapa.y - 29} Z`}
            fill="#000"
            opacity="0.16"
          />
        </g>
      )}
      {noche && <ellipse cx={tapa.x} cy={tapa.y} rx="26" ry="13" fill="url(#charco-luz)" />}
    </g>
  );
}

/** Cantero con vegetación. */
export function Planta({ gx, gy, noche, semilla = 0 }: { gx: number; gy: number; noche: boolean; semilla?: number }) {
  const p = proyectar(gx, gy);
  const verde = noche ? "#1f3a24" : "#3f8a45";
  const verdeClaro = noche ? "#2a4d2e" : "#57ad5c";
  const grande = semilla % 2 === 0;
  const escala = grande ? 1 : 0.72;

  return (
    <g style={{ pointerEvents: "none" }} transform={`translate(${p.x} ${p.y}) scale(${escala})`}>
      <ellipse cx={-4} cy={2} rx="11" ry="5" fill="#000" opacity={noche ? 0.42 : 0.28} style={{ filter: "blur(3px)" }} />
      {/* Maceta */}
      <path d="M -9 0 L 9 0 L 6.5 -13 L -6.5 -13 Z" fill={noche ? "#4a2f1c" : "#7a4b26"} />
      <ellipse cx={0} cy={-13} rx="6.5" ry="3" fill={noche ? "#3a2416" : "#5f3a1d"} />
      {/* Follaje */}
      <ellipse cx={0} cy={-25} rx="12" ry="11" fill={verde} />
      <ellipse cx={-5} cy={-30} rx="8.5" ry="8" fill={verdeClaro} />
      <ellipse cx={6} cy={-28} rx="7" ry="6.5" fill={verde} />
      <ellipse cx={1} cy={-36} rx="6" ry="5.5" fill={verdeClaro} />
    </g>
  );
}

/** Guirnalda de luces colgada entre dos puntos de la grilla. */
export function Guirnalda({
  desde,
  hasta,
  noche,
  altura = ALTO_MODULO * 1.5,
}: {
  desde: [number, number];
  hasta: [number, number];
  noche: boolean;
  altura?: number;
}) {
  const a = proyectar(desde[0], desde[1], altura);
  const b = proyectar(hasta[0], hasta[1], altura);
  const combado = 26;
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 + combado * 2;
  const cantidad = 13;

  const puntoEn = (t: number) => ({
    x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t ** 2 * b.x,
    y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t ** 2 * b.y,
  });

  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
        fill="none"
        stroke={noche ? "#27272a" : "#3f3f46"}
        strokeWidth="1.3"
      />
      {Array.from({ length: cantidad }, (_, i) => {
        const t = (i + 0.5) / cantidad;
        const pt = puntoEn(t);
        return (
          <g key={i}>
            {noche && (
              <circle cx={pt.x} cy={pt.y + 3} r="7" fill="#ffcf6b" opacity="0.32" style={{ filter: "blur(4px)" }} />
            )}
            <circle
              cx={pt.x}
              cy={pt.y + 3}
              r="2.3"
              fill={noche ? "#ffdc8a" : "#71717a"}
              style={noche ? { animation: `parpadeo-luz ${3 + (i % 4) * 0.6}s ease-in-out ${i * 0.2}s infinite` } : undefined}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Poste de luz que ilumina el piso de noche. */
export function Farol({ gx, gy, noche }: { gx: number; gy: number; noche: boolean }) {
  const base = proyectar(gx, gy);
  const tope = proyectar(gx, gy, 78);
  return (
    <g style={{ pointerEvents: "none" }}>
      {noche && <ellipse cx={base.x} cy={base.y} rx="48" ry="24" fill="url(#charco-luz)" />}
      <ellipse cx={base.x - 2} cy={base.y + 1} rx="6" ry="3" fill="#000" opacity="0.4" style={{ filter: "blur(2px)" }} />
      <line x1={base.x} y1={base.y} x2={tope.x} y2={tope.y} stroke={noche ? "#27272a" : "#3f3f46"} strokeWidth="3" />
      <circle cx={tope.x} cy={tope.y - 3} r="4.5" fill={noche ? "#ffdc8a" : "#52525b"} />
      {noche && (
        <circle cx={tope.x} cy={tope.y - 3} r="13" fill="#ffcf6b" opacity="0.4" style={{ filter: "blur(6px)" }} />
      )}
    </g>
  );
}

/** Cartel de entrada del patio. */
export function CartelEntrada({ gx, gy, noche, texto }: { gx: number; gy: number; noche: boolean; texto: string }) {
  const base = proyectar(gx, gy);
  const alto = 96;
  const tope = proyectar(gx, gy, alto);
  return (
    <g style={{ pointerEvents: "none" }}>
      <ellipse cx={base.x - 4} cy={base.y + 2} rx="18" ry="7" fill="#000" opacity="0.4" style={{ filter: "blur(4px)" }} />
      <line x1={base.x - 15} y1={base.y} x2={tope.x - 15} y2={tope.y} stroke="#3f3f46" strokeWidth="3.5" />
      <line x1={base.x + 15} y1={base.y} x2={tope.x + 15} y2={tope.y} stroke="#3f3f46" strokeWidth="3.5" />
      <rect x={tope.x - 52} y={tope.y - 24} width={104} height={30} rx={6} fill="#131316" stroke="#FFC200" strokeWidth="1.6" />
      <text
        x={tope.x}
        y={tope.y - 4}
        textAnchor="middle"
        fill="#FFC200"
        fontSize="13"
        fontWeight="900"
        letterSpacing="2.4"
        style={noche ? { filter: "drop-shadow(0 0 7px rgba(255,194,0,.85))" } : undefined}
      >
        {texto}
      </text>
    </g>
  );
}
