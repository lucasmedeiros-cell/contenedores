"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALTO_MODULO,
  desproyectar,
  huella,
  limites,
  profundidad,
  proyectar,
} from "@alquileres/_lib/iso";
import { plata } from "@/lib/format";
import { useTema } from "@/components/tema";
import {
  CartelEntrada,
  DefsTexturas,
  Farol,
  Guirnalda,
  Mesa,
  Planta,
  Zona,
} from "./Escenario";
import { Modulo } from "./Modulo";
import type { DatosPlano, PuestoPlano } from "./tipos";
import {
  Maximize2,
  Minus,
  Moon,
  Move,
  Plus,
  RotateCw,
  Save,
  Sun,
  X,
} from "lucide-react";

type Props = {
  datos: DatosPlano;
  /**
   * Ids de los puestos que pasan los filtros de la barra de arriba (estado,
   * zona y búsqueda). Los demás se dibujan atenuados. Sin esta prop no se
   * atenúa ninguno. El plano no tiene filtros propios a propósito: tenerlos
   * duplicaba los de la barra y los dos se desincronizaban.
   */
  visibles?: ReadonlySet<string>;
  /** Habilita el modo edición (mover/rotar puestos). Solo admin y gerente. */
  editable?: boolean;
  /** Persiste las posiciones. Devuelve una promesa. */
  onGuardar?: (
    cambios: { id: string; gridX: number; gridY: number; rotacion: number }[],
  ) => Promise<void>;
  /** Se llama al hacer clic en un puesto (fuera del modo edición). */
  onSeleccionar?: (puesto: PuestoPlano) => void;
  /** Altura del lienzo. */
  alto?: string;
  /** Oculta la barra de herramientas (para vistas compactas). */
  compacto?: boolean;
};

export default function PlanoIsometrico({
  datos,
  visibles,
  editable = false,
  onGuardar,
  onSeleccionar,
  alto = "clamp(420px, 62vh, 760px)",
  compacto = false,
}: Props) {
  const [tema] = useTema();
  const [noche, setNoche] = useState(false);
  /**
   * El patio de día, con la aplicación en modo Día: cielo claro. La escena
   * tiene su propio sol/luna —el patio de noche se ve de noche aunque la
   * interfaz esté clara— y este es el caso que faltaba: interfaz clara con
   * escena de día seguía dibujando un cielo negro.
   */
  const claro = tema === "dia" && !noche;
  const [hover, setHover] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [posiciones, setPosiciones] = useState<
    Record<string, { gridX: number; gridY: number; rotacion: number }>
  >({});
  const [guardando, setGuardando] = useState(false);
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null);
  const [paneando, setPaneando] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const paneo = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const arrastre = useRef<{
    id: string;
    inicioX: number;
    inicioY: number;
    gridX: number;
    gridY: number;
  } | null>(null);

  // --- Puestos con las posiciones editadas aplicadas ---
  const puestos = useMemo(
    () =>
      datos.puestos.map((p) => {
        const mod = posiciones[p.id];
        return mod ? { ...p, ...mod } : p;
      }),
    [datos.puestos, posiciones],
  );

  const hayCambios = Object.keys(posiciones).length > 0;

  const vista = useMemo(
    () => limites(datos.celdasAncho, datos.celdasAlto),
    [datos.celdasAncho, datos.celdasAlto],
  );

  // --- Mobiliario: se coloca en las celdas libres de las zonas de estar ---
  const decoracion = useMemo(() => {
    const ocupadas = new Set<string>();
    for (const p of puestos) {
      const { x, y, w, d } = huella(p.gridX, p.gridY, p.ancho, p.largo, p.rotacion);
      for (let i = -1; i <= w; i++) {
        for (let j = -1; j <= d + 1; j++) {
          ocupadas.add(`${Math.floor(x + i)}:${Math.floor(y + j)}`);
        }
      }
    }

    const mesas: { gx: number; gy: number; semilla: number }[] = [];
    const plantas: { gx: number; gy: number; semilla: number }[] = [];
    let n = 0;

    for (const z of datos.zonas) {
      const esEstar = /central|terraza|luces/i.test(z.nombre);
      for (let gy = z.gridY + 1; gy < z.gridY + z.gridH; gy += 1.6) {
        for (let gx = z.gridX + 1; gx < z.gridX + z.gridW; gx += 1.7) {
          const clave = `${Math.floor(gx)}:${Math.floor(gy)}`;
          if (ocupadas.has(clave)) continue;
          n++;
          if (esEstar && n % 3 !== 0) mesas.push({ gx, gy, semilla: n });
          else if (n % 7 === 0) plantas.push({ gx, gy, semilla: n });
        }
      }
    }
    return { mesas, plantas };
  }, [datos.zonas, puestos]);

  // --- Elementos ordenados por profundidad (algoritmo del pintor) ---
  const escena = useMemo(() => {
    type Item =
      | { tipo: "puesto"; z: number; p: PuestoPlano }
      | { tipo: "mesa"; z: number; gx: number; gy: number; semilla: number }
      | { tipo: "planta"; z: number; gx: number; gy: number; semilla: number };

    const items: Item[] = [];
    for (const p of puestos) {
      const { x, y, w, d } = huella(p.gridX, p.gridY, p.ancho, p.largo, p.rotacion);
      items.push({ tipo: "puesto", z: profundidad(x, y, w, d), p });
    }
    for (const m of decoracion.mesas) items.push({ tipo: "mesa", z: profundidad(m.gx, m.gy), ...m });
    for (const pl of decoracion.plantas) items.push({ tipo: "planta", z: profundidad(pl.gx, pl.gy), ...pl });
    return items.sort((a, b) => a.z - b.z);
  }, [puestos, decoracion]);

  const puestoHover = puestos.find((p) => p.id === hover) ?? null;

  // --- Interacción: zoom con rueda ---
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.45, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    svg.addEventListener("wheel", alRodar, { passive: false });
    return () => svg.removeEventListener("wheel", alRodar);
  }, []);

  /**
   * Píxeles de pantalla → unidades del lienzo SVG.
   * El viewBox se ajusta con `preserveAspectRatio` por omisión, así que la
   * escala real la manda la dimensión que quede más ajustada, no el ancho.
   */
  const escalaLienzo = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const caja = svg.getBoundingClientRect();
    if (!caja.width || !caja.height) return 1;
    const escala = Math.min(caja.width / vista.ancho, caja.height / vista.alto);
    return 1 / (escala * zoom);
  }, [vista.ancho, vista.alto, zoom]);

  const alSoltar = useCallback(() => {
    paneo.current = null;
    arrastre.current = null;
    setArrastrandoId(null);
    setPaneando(false);
  }, []);

  const alMover = useCallback(
    (e: React.PointerEvent) => {
      if (arrastre.current) {
        const k = escalaLienzo();
        const dx = (e.clientX - arrastre.current.inicioX) * k;
        const dy = (e.clientY - arrastre.current.inicioY) * k;
        const delta = desproyectar(dx, dy);
        const nx = Math.max(0, Math.round(arrastre.current.gridX + delta.x));
        const ny = Math.max(0, Math.round(arrastre.current.gridY + delta.y));
        const id = arrastre.current.id;
        setPosiciones((prev) => {
          const actual = prev[id] ?? {
            gridX: nx,
            gridY: ny,
            rotacion: datos.puestos.find((p) => p.id === id)?.rotacion ?? 0,
          };
          if (actual.gridX === nx && actual.gridY === ny && prev[id]) return prev;
          return { ...prev, [id]: { ...actual, gridX: nx, gridY: ny } };
        });
        return;
      }
      if (paneo.current) {
        const k = escalaLienzo();
        setPan({
          x: paneo.current.panX + (e.clientX - paneo.current.x) * k,
          y: paneo.current.panY + (e.clientY - paneo.current.y) * k,
        });
      }
    },
    [datos.puestos, escalaLienzo],
  );

  const iniciarArrastre = useCallback(
    (e: React.PointerEvent, p: PuestoPlano) => {
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      arrastre.current = {
        id: p.id,
        inicioX: e.clientX,
        inicioY: e.clientY,
        gridX: p.gridX,
        gridY: p.gridY,
      };
      setArrastrandoId(p.id);
      setSeleccion(p.id);
    },
    [],
  );

  const rotarSeleccionado = () => {
    if (!seleccion) return;
    const actual = puestos.find((p) => p.id === seleccion);
    if (!actual) return;
    setPosiciones((prev) => ({
      ...prev,
      [seleccion]: {
        gridX: actual.gridX,
        gridY: actual.gridY,
        rotacion: (actual.rotacion + 90) % 360,
      },
    }));
  };

  const guardar = async () => {
    if (!onGuardar || !hayCambios) return;
    setGuardando(true);
    try {
      await onGuardar(
        Object.entries(posiciones).map(([id, v]) => ({ id, ...v })),
      );
      setPosiciones({});
    } finally {
      setGuardando(false);
    }
  };

  const clicPuesto = (p: PuestoPlano) => {
    setSeleccion(p.id);
    onSeleccionar?.(p);
  };

  const encuadrar = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Posición en pantalla de la tarjeta flotante del hover
  const anclaHover = useMemo(() => {
    if (!puestoHover) return null;
    const { x, y, w, d } = huella(
      puestoHover.gridX,
      puestoHover.gridY,
      puestoHover.ancho,
      puestoHover.largo,
      puestoHover.rotacion,
    );
    const p = proyectar(x + w / 2, y + d / 2, ALTO_MODULO * puestoHover.alto + 34);
    // Del sistema del lienzo al porcentaje del contenedor
    const px = ((p.x + pan.x - vista.minX) / vista.ancho) * 100;
    const py = ((p.y + pan.y - vista.minY) / vista.alto) * 100;
    return { px, py };
  }, [puestoHover, pan, vista]);

  const guirnaldas = useMemo(() => {
    const g: { desde: [number, number]; hasta: [number, number] }[] = [];
    const zonaEstar = datos.zonas.filter((z) => /central|terraza/i.test(z.nombre));
    for (const z of zonaEstar) {
      g.push({ desde: [z.gridX, z.gridY], hasta: [z.gridX + z.gridW, z.gridY + z.gridH] });
      g.push({ desde: [z.gridX + z.gridW, z.gridY], hasta: [z.gridX, z.gridY + z.gridH] });
    }
    return g;
  }, [datos.zonas]);

  return (
    <div className="relative w-full select-none overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-zinc-900/70 to-zinc-950">
      {/* Cielo / ambiente */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        style={{
          background: noche
            ? "radial-gradient(120% 80% at 50% -10%, #1e293b 0%, #0b1120 55%, #07090f 100%)"
            : claro
              ? "radial-gradient(120% 80% at 50% -10%, #f8fafc 0%, #e6ebf2 55%, #d5dce6 100%)"
              : "radial-gradient(120% 80% at 50% -10%, #2b2b31 0%, #171719 55%, #0d0d0f 100%)",
        }}
      />
      {noche && (
        <div className="pointer-events-none absolute inset-0 opacity-70">
          {Array.from({ length: 42 }, (_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${(i * 37.6) % 100}%`,
                top: `${(i * 13.7) % 42}%`,
                width: i % 5 === 0 ? 2 : 1.3,
                height: i % 5 === 0 ? 2 : 1.3,
                opacity: 0.25 + ((i * 7) % 5) / 10,
                animation: `parpadeo-luz ${3 + (i % 5)}s ease-in-out ${i * 0.13}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* --- Barra de herramientas --- */}
      {!compacto && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-end gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/8 bg-black/55 p-1.5 backdrop-blur-xl">
            <button
              onClick={() => setNoche((n) => !n)}
              title={noche ? "Ver de día" : "Ver de noche"}
              className="btn btn-fantasma size-8 !p-0"
            >
              {noche ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>
            <button onClick={() => setZoom((z) => Math.min(3, z * 1.2))} title="Acercar" className="btn btn-fantasma size-8 !p-0">
              <Plus size={15} />
            </button>
            <button onClick={() => setZoom((z) => Math.max(0.45, z / 1.2))} title="Alejar" className="btn btn-fantasma size-8 !p-0">
              <Minus size={15} />
            </button>
            <button onClick={encuadrar} title="Encuadrar" className="btn btn-fantasma size-8 !p-0">
              <Maximize2 size={14} />
            </button>
            {editable && (
              <button
                onClick={() => {
                  setModoEdicion((m) => !m);
                  setSeleccion(null);
                }}
                title="Mover los puestos sobre la grilla"
                className="btn px-2.5 py-1.5 text-[11px] font-bold"
                style={{
                  backgroundColor: modoEdicion ? "#FFC200" : "rgba(255,255,255,.05)",
                  color: modoEdicion ? "#09090b" : "#e4e4e7",
                  border: "1px solid rgba(255,255,255,.09)",
                }}
              >
                <Move size={14} /> {modoEdicion ? "Moviendo" : "Mover"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Barra del modo edición --- */}
      {modoEdicion && (
        <div className="anim-aparecer absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 border-t border-amber-400/25 bg-amber-400/10 p-2.5 backdrop-blur-xl">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Move size={13} /> Arrastrá los módulos para reubicarlos
          </span>
          <button onClick={rotarSeleccionado} disabled={!seleccion} className="btn btn-fantasma py-1 text-xs">
            <RotateCw size={13} /> Rotar 90°
          </button>
          <button onClick={guardar} disabled={!hayCambios || guardando} className="btn btn-marca py-1 text-xs">
            <Save size={13} />
            {guardando ? "Guardando…" : hayCambios ? `Guardar ${Object.keys(posiciones).length} cambio(s)` : "Sin cambios"}
          </button>
          <button
            onClick={() => {
              setPosiciones({});
              setModoEdicion(false);
              setSeleccion(null);
            }}
            className="btn btn-fantasma py-1 text-xs"
          >
            <X size={13} /> Salir
          </button>
        </div>
      )}

      {/* --- Lienzo --- */}
      <svg
        ref={svgRef}
        viewBox={`${vista.minX} ${vista.minY} ${vista.ancho} ${vista.alto}`}
        style={{ height: alto, touchAction: "none" }}
        className="relative z-10 w-full"
        onPointerDown={(e) => {
          if (arrastre.current) return;
          paneo.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
          setPaneando(true);
        }}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerLeave={alSoltar}
      >
        <DefsTexturas noche={noche} claro={claro} />

        <g
          transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
          style={{ transition: arrastrandoId || paneando ? "none" : "transform .3s cubic-bezier(.32,.72,0,1)" }}
          transform-origin="center"
        >
          {/* Suelo */}
          {datos.zonas.map((z) => (
            <Zona key={z.id} zona={z} noche={noche} />
          ))}

          {/* Grilla de ayuda en modo edición */}
          {modoEdicion && (
            <g style={{ pointerEvents: "none" }} opacity="0.3">
              {Array.from({ length: datos.celdasAncho + 1 }, (_, i) => {
                const a = proyectar(i, 0);
                const b = proyectar(i, datos.celdasAlto);
                return <line key={`gx${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFC200" strokeWidth="0.6" />;
              })}
              {Array.from({ length: datos.celdasAlto + 1 }, (_, i) => {
                const a = proyectar(0, i);
                const b = proyectar(datos.celdasAncho, i);
                return <line key={`gy${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFC200" strokeWidth="0.6" />;
              })}
            </g>
          )}

          {/* Escena ordenada por profundidad */}
          {escena.map((item, i) => {
            if (item.tipo === "mesa") {
              return <Mesa key={`m${i}`} gx={item.gx} gy={item.gy} noche={noche} semilla={item.semilla} />;
            }
            if (item.tipo === "planta") {
              return <Planta key={`p${i}`} gx={item.gx} gy={item.gy} noche={noche} semilla={item.semilla} />;
            }
            const p = item.p;
            const atenuado = visibles ? !visibles.has(p.id) : false;
            return (
              <Modulo
                key={p.id}
                puesto={p}
                seleccionado={seleccion === p.id}
                atenuado={atenuado}
                noche={noche}
                modoEdicion={modoEdicion}
                arrastrando={arrastrandoId === p.id}
                onHover={setHover}
                onClick={clicPuesto}
                onArrastrarInicio={iniciarArrastre}
              />
            );
          })}

          {/* Faroles en las esquinas del patio */}
          <Farol gx={datos.celdasAncho - 0.5} gy={0.5} noche={noche} />
          <Farol gx={0.5} gy={datos.celdasAlto - 0.5} noche={noche} />

          {/* Guirnaldas colgadas sobre las zonas de estar */}
          {guirnaldas.map((g, i) => (
            <Guirnalda key={i} desde={g.desde} hasta={g.hasta} noche={noche} />
          ))}

          <CartelEntrada
            gx={datos.celdasAncho / 2}
            gy={-1.4}
            noche={noche}
            texto="CONTENEDORES"
          />
        </g>

        {/* Viñeta */}
        <rect
          x={vista.minX}
          y={vista.minY}
          width={vista.ancho}
          height={vista.alto}
          fill="url(#vineta)"
          style={{ pointerEvents: "none" }}
        />
      </svg>

      {/* --- Tarjeta flotante del puesto bajo el cursor --- */}
      {puestoHover && anclaHover && !modoEdicion && (
        <div
          className="anim-escalar pointer-events-none absolute z-30 w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-white/12 bg-zinc-950/92 p-3 shadow-2xl backdrop-blur-xl"
          style={{
            left: `${Math.min(88, Math.max(12, anclaHover.px))}%`,
            top: `${Math.min(92, Math.max(16, anclaHover.py))}%`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {puestoHover.nombre || "Puesto disponible"}
              </p>
              <p className="text-[11px] text-zinc-500">
                {puestoHover.numero} · {puestoHover.zonaNombre}
              </p>
            </div>
            {puestoHover.icono && <span className="text-lg">{puestoHover.icono}</span>}
          </div>

          <div className="mt-2 space-y-1 text-[11px]">
            {puestoHover.inquilino && (
              <p className="flex justify-between gap-2">
                <span className="text-zinc-500">Titular</span>
                <span className="truncate font-medium text-zinc-300">{puestoHover.inquilino}</span>
              </p>
            )}
            <p className="flex justify-between gap-2">
              <span className="text-zinc-500">Superficie</span>
              <span className="tabular font-medium text-zinc-300">{puestoHover.tamanoM2} m²</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-zinc-500">{puestoHover.estado === "LIBRE" ? "Precio base" : "Alquiler"}</span>
              <span className="tabular font-bold text-[#FFC200]">{plata(puestoHover.monto)}</span>
            </p>
            {puestoHover.deuda > 0 && (
              <p className="flex justify-between gap-2">
                <span className="text-zinc-500">Adeuda</span>
                <span className="tabular font-bold text-amber-400">
                  {plata(puestoHover.deuda)} · {puestoHover.periodosDeuda} per.
                </span>
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
