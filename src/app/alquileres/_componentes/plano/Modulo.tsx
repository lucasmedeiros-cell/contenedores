"use client";

import { memo } from "react";
import {
  ALTO_MODULO,
  caras,
  huella,
  mezclar,
  proyectar,
  puntos,
  tono,
} from "@alquileres/_lib/iso";
import type { PuestoPlano } from "./tipos";

const ACENTO: Record<string, string> = {
  "al-dia": "#E2A812",
  pendiente: "#FFC200",
  libre: "#a1a1aa",
};

/** Rubros a los que se les dibuja humo de cocción. */
const CON_HUMO = /parrilla|hamburgues|pizza|criolla|asado|wok|taco/i;

type Props = {
  puesto: PuestoPlano;
  seleccionado: boolean;
  atenuado: boolean;
  noche: boolean;
  modoEdicion: boolean;
  arrastrando: boolean;
  onHover: (id: string | null) => void;
  onClick: (p: PuestoPlano) => void;
  onArrastrarInicio: (e: React.PointerEvent, p: PuestoPlano) => void;
};

function ModuloBase({
  puesto,
  seleccionado,
  atenuado,
  noche,
  modoEdicion,
  arrastrando,
  onHover,
  onClick,
  onArrastrarInicio,
}: Props) {
  const { x: gx, y: gy, w, d } = huella(
    puesto.gridX,
    puesto.gridY,
    puesto.ancho,
    puesto.largo,
    puesto.rotacion,
  );

  const altura = ALTO_MODULO * puesto.alto;
  const libre = puesto.estado === "LIBRE";
  
  const acento = ACENTO[puesto.estadoPago];

  // De noche los colores se apagan y viran a azul; los locales ocupados
  // conservan algo de saturación por las luces propias encendidas.
  const colorReal = noche
    ? mezclar(puesto.colorBase, "#0b1220", libre ? 0.62 : 0.4)
    : puesto.colorBase;

  const { techo, derecha, izquierda, base } = caras(gx, gy, w, d, altura);

  const cTecho = tono(colorReal, noche ? 0.9 : 1.24);
  const cDerecha = tono(colorReal, noche ? 0.62 : 0.92);
  const cIzquierda = tono(colorReal, noche ? 0.42 : 0.66);

  const centroTecho = proyectar(gx + w / 2, gy + d / 2, altura);
  const frente = proyectar(gx + w / 2, gy + d, 0);

  // Sombra proyectada al suelo, desplazada hacia la izquierda-abajo.
  const sombra = base.map((p) => ({ x: p.x - altura * 0.34, y: p.y + altura * 0.17 }));

  const idGrad = `grad-${puesto.id}`;
  const idCorr = `corr-${puesto.id}`;
  const idFranjas = `franjas-${puesto.id}`;

  /** Bastidor del contenedor: casi negro, como los perfiles reales. */
  const marco = noche ? "#0a0d14" : "#141416";

  // Nervaduras del corrugado sobre cada cara
  const nervadurasIzq = Array.from({ length: Math.round(w * 5) }, (_, i) => {
    const t = (i + 1) / (Math.round(w * 5) + 1);
    const arriba = proyectar(gx + w * t, gy + d, altura);
    const abajo = proyectar(gx + w * t, gy + d, 0);
    return { arriba, abajo, key: `i${i}` };
  });
  const nervadurasDer = Array.from({ length: Math.round(d * 5) }, (_, i) => {
    const t = (i + 1) / (Math.round(d * 5) + 1);
    const arriba = proyectar(gx + w, gy + d * t, altura);
    const abajo = proyectar(gx + w, gy + d * t, 0);
    return { arriba, abajo, key: `d${i}` };
  });

  // Toldo: se extiende desde el frente hacia afuera (lado +y)
  const vueloToldo = 0.85;
  const altoToldo = altura * 0.78;
  const toldo = [
    proyectar(gx, gy + d, altura * 0.92),
    proyectar(gx + w, gy + d, altura * 0.92),
    proyectar(gx + w, gy + d + vueloToldo, altoToldo),
    proyectar(gx, gy + d + vueloToldo, altoToldo),
  ];

  // Ventanilla de atención sobre la cara izquierda (la que da al público)
  const ventana = [
    proyectar(gx + w * 0.14, gy + d, altura * 0.72),
    proyectar(gx + w * 0.86, gy + d, altura * 0.72),
    proyectar(gx + w * 0.86, gy + d, altura * 0.34),
    proyectar(gx + w * 0.14, gy + d, altura * 0.34),
  ];

  const conHumo = !libre && CON_HUMO.test(puesto.rubro ?? "");
  const luzEncendida = noche && !libre;

  return (
    <g
      className="modulo"
      data-seleccionado={seleccionado || undefined}
      style={{
        opacity: atenuado ? 0.22 : 1,
        cursor: modoEdicion ? (arrastrando ? "grabbing" : "grab") : "pointer",
        transition: arrastrando ? "none" : "opacity .25s, transform .28s cubic-bezier(.34,1.56,.64,1)",
      }}
      onPointerEnter={() => onHover(puesto.id)}
      onPointerLeave={() => onHover(null)}
      onPointerDown={(e) => modoEdicion && onArrastrarInicio(e, puesto)}
      onClick={() => !modoEdicion && onClick(puesto)}
    >
      <defs>
        <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tono(colorReal, 1.1)} />
          <stop offset="100%" stopColor={tono(colorReal, 0.78)} />
        </linearGradient>
        <linearGradient id={idCorr} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <pattern
          id={idFranjas}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="#0a0a0c" />
          <rect width="4" height="8" fill={tono(acento, 0.95)} />
        </pattern>
      </defs>

      {/* Sombra en el piso */}
      <polygon
        points={puntos(sombra)}
        fill="#000"
        opacity={noche ? 0.5 : 0.34}
        style={{ filter: "blur(5px)" }}
      />

      <g className="modulo-cuerpo">
        {/* Cara derecha (lado corto) */}
        <polygon points={puntos(derecha)} fill={cDerecha} />
        {nervadurasDer.map((n) => (
          <line
            key={n.key}
            x1={n.arriba.x}
            y1={n.arriba.y}
            x2={n.abajo.x}
            y2={n.abajo.y}
            stroke="#000"
            strokeOpacity="0.16"
            strokeWidth="1.2"
          />
        ))}

        {/* Cara izquierda (frente de atención) */}
        <polygon points={puntos(izquierda)} fill={cIzquierda} />
        <polygon points={puntos(izquierda)} fill={`url(#${idCorr})`} />
        {nervadurasIzq.map((n) => (
          <line
            key={n.key}
            x1={n.arriba.x}
            y1={n.arriba.y}
            x2={n.abajo.x}
            y2={n.abajo.y}
            stroke="#000"
            strokeOpacity="0.2"
            strokeWidth="1.2"
          />
        ))}

        {/* Bastidor: largueros y postes de esquina, casi negros como en el
            contenedor real. Enmarcan la chapa por los cuatro lados. */}
        {[
          // Larguero superior e inferior del frente
          [proyectar(gx, gy + d, altura), proyectar(gx + w, gy + d, altura), proyectar(gx + w, gy + d, altura * 0.9), proyectar(gx, gy + d, altura * 0.9)],
          [proyectar(gx, gy + d, altura * 0.09), proyectar(gx + w, gy + d, altura * 0.09), proyectar(gx + w, gy + d, 0), proyectar(gx, gy + d, 0)],
          // Postes de esquina del frente
          [proyectar(gx, gy + d, altura), proyectar(gx + w * 0.07, gy + d, altura), proyectar(gx + w * 0.07, gy + d, 0), proyectar(gx, gy + d, 0)],
          [proyectar(gx + w * 0.93, gy + d, altura), proyectar(gx + w, gy + d, altura), proyectar(gx + w, gy + d, 0), proyectar(gx + w * 0.93, gy + d, 0)],
          // Largueros del lateral derecho
          [proyectar(gx + w, gy, altura), proyectar(gx + w, gy + d, altura), proyectar(gx + w, gy + d, altura * 0.9), proyectar(gx + w, gy, altura * 0.9)],
          [proyectar(gx + w, gy, altura * 0.09), proyectar(gx + w, gy + d, altura * 0.09), proyectar(gx + w, gy + d, 0), proyectar(gx + w, gy, 0)],
        ].map((cara, i) => (
          <polygon key={`marco${i}`} points={puntos(cara)} fill={marco} />
        ))}

        {/* Franjas de advertencia sobre el larguero superior */}
        {!libre && (
          <polygon
            points={puntos([
              proyectar(gx + w * 0.07, gy + d, altura),
              proyectar(gx + w * 0.93, gy + d, altura),
              proyectar(gx + w * 0.93, gy + d, altura * 0.955),
              proyectar(gx + w * 0.07, gy + d, altura * 0.955),
            ])}
            fill={`url(#${idFranjas})`}
            opacity="0.75"
          />
        )}

        {/* Ventanilla iluminada */}
        {!libre && (
          <>
            <polygon
              points={puntos(ventana)}
              fill={luzEncendida ? "#ffd98a" : "#101014"}
              opacity={luzEncendida ? 0.95 : 0.85}
              style={luzEncendida ? { animation: "parpadeo-luz 5s ease-in-out infinite" } : undefined}
            />
            {luzEncendida && (
              <polygon
                points={puntos(ventana)}
                fill="#ffcf6b"
                opacity="0.75"
                style={{ filter: "blur(9px)" }}
              />
            )}
          </>
        )}
        {libre && (
          <polygon points={puntos(ventana)} fill="#0a0a0c" opacity="0.55" />
        )}

        {/* Techo */}
        <polygon points={puntos(techo)} fill={cTecho} />
        <polygon points={puntos(techo)} fill={`url(#${idGrad})`} opacity="0.35" />
        {/* Nervaduras del techo */}
        {Array.from({ length: Math.round(w * 3) }, (_, i) => {
          const t = (i + 1) / (Math.round(w * 3) + 1);
          const a = proyectar(gx + w * t, gy, altura);
          const b = proyectar(gx + w * t, gy + d, altura);
          return (
            <line key={`t${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeOpacity="0.1" strokeWidth="1" />
          );
        })}

        {/* Contorno con el color del estado */}
        <polygon
          points={puntos(techo)}
          fill="none"
          stroke={acento}
          strokeWidth={seleccionado ? 2.6 : 1.4}
          strokeOpacity={seleccionado ? 1 : 0.55}
        />

        {/* Toldo */}
        {puesto.tieneToldo && !libre && (
          <>
            <polygon points={puntos(toldo)} fill={tono(acento, noche ? 0.55 : 0.95)} opacity="0.92" />
            <polygon points={puntos(toldo)} fill="#000" opacity="0.18" />
            {Array.from({ length: Math.round(w * 2) }, (_, i) => {
              const t = (i + 1) / (Math.round(w * 2) + 1);
              const a = proyectar(gx + w * t, gy + d, altura * 0.92);
              const b = proyectar(gx + w * t, gy + d + vueloToldo, altoToldo);
              return (
                <line key={`to${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeOpacity="0.22" strokeWidth="1.2" />
              );
            })}
          </>
        )}

        {/* Cartel con el número del puesto sobre el techo */}
        <g transform={`translate(${centroTecho.x}, ${centroTecho.y - 6})`}>
          <rect
            x={-19}
            y={-9}
            width={38}
            height={17}
            rx={5}
            fill="#09090b"
            opacity="0.72"
            stroke={acento}
            strokeOpacity="0.5"
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            y={3.5}
            fill={acento}
            fontSize="10.5"
            fontWeight="800"
            letterSpacing="0.4"
            style={{ pointerEvents: "none" }}
          >
            {puesto.numero}
          </text>
        </g>

        {/* Emoji del rubro flotando sobre el módulo */}
        {puesto.icono && (
          <text
            x={centroTecho.x}
            y={centroTecho.y - 22}
            textAnchor="middle"
            fontSize="19"
            style={{ pointerEvents: "none", animation: "flotar 3.6s ease-in-out infinite" }}
          >
            {puesto.icono}
          </text>
        )}

        {/* Cartel LIBRE */}
        {libre && (
          <g transform={`translate(${frente.x}, ${frente.y - altura * 0.5})`} style={{ pointerEvents: "none" }}>
            <rect x={-30} y={-10} width={60} height={19} rx={4} fill="#18181b" stroke="#52525b" strokeWidth="1" />
            <text textAnchor="middle" y={4} fill="#d4d4d8" fontSize="9.5" fontWeight="800" letterSpacing="1.2">
              DISPONIBLE
            </text>
          </g>
        )}
      </g>

      {/* Humo de cocción */}
      {conHumo && (
        <g style={{ pointerEvents: "none" }}>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={proyectar(gx + w * 0.72, gy + d * 0.2, altura + 6).x}
              cy={proyectar(gx + w * 0.72, gy + d * 0.2, altura + 6).y}
              r={5 + i}
              fill={noche ? "#94a3b8" : "#e4e4e7"}
              opacity="0"
              style={{ animation: `humo ${3.6 + i * 0.5}s ease-out ${i * 1.1}s infinite` }}
            />
          ))}
          {/* Chimenea */}
          <rect
            x={proyectar(gx + w * 0.72, gy + d * 0.2, altura).x - 3.5}
            y={proyectar(gx + w * 0.72, gy + d * 0.2, altura).y - 12}
            width={7}
            height={12}
            rx={1.5}
            fill={tono(colorReal, 0.5)}
          />
        </g>
      )}

      {/* Halo de alerta para los puestos con deuda */}
      {puesto.estadoPago === "pendiente" && (
        <g style={{ pointerEvents: "none" }}>
          <polygon
            points={puntos(base)}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            opacity="0.7"
            style={{ animation: "latido-anillo 2.4s ease-out infinite" }}
          />
          <circle
            cx={proyectar(gx + w, gy, altura + 14).x}
            cy={proyectar(gx + w, gy, altura + 14).y}
            r="6.5"
            fill="#fbbf24"
            style={{ animation: "flotar 2.6s ease-in-out infinite" }}
          />
          <text
            x={proyectar(gx + w, gy, altura + 14).x}
            y={proyectar(gx + w, gy, altura + 14).y + 3.6}
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="900"
            fill="#09090b"
          >
            !
          </text>
        </g>
      )}
    </g>
  );
}

export const Modulo = memo(ModuloBase);
