"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Move } from "lucide-react";
import type { PuestoCliente } from "@alquileres/_lib/datos";
import { moverEnMapa } from "@alquileres/acciones";
import { ESTADOS, ORDEN_ESTADOS, estiloDe } from "@alquileres/_lib/estados";

/**
 * "Mapa general del patio": las tarjetas numeradas sobre el lienzo, arrastrables,
 * igual que el prototipo. La posición se guarda en píxeles (`posX` / `posY`).
 */
export default function MapaPuestos({
  puestos,
  onSeleccionar,
}: {
  puestos: PuestoCliente[];
  onSeleccionar: (p: PuestoCliente) => void;
}) {
  const router = useRouter();
  const lienzo = useRef<HTMLDivElement>(null);
  const arrastrando = useRef<string | null>(null);
  const movio = useRef(false);
  const inicio = useRef({ x: 0, y: 0 });
  const [posiciones, setPosiciones] = useState<Record<string, { x: number; y: number }>>({});

  function alBajar(id: string, e: React.PointerEvent) {
    arrastrando.current = id;
    movio.current = false;
    inicio.current = { x: e.clientX, y: e.clientY };
  }

  function alMover(e: React.PointerEvent) {
    const id = arrastrando.current;
    if (!id || !lienzo.current) return;
    if (
      Math.abs(e.clientX - inicio.current.x) > 4 ||
      Math.abs(e.clientY - inicio.current.y) > 4
    ) {
      movio.current = true;
    }
    const caja = lienzo.current.getBoundingClientRect();
    const x = Math.max(16, Math.min(caja.width - 160, e.clientX - caja.left - 72));
    const y = Math.max(16, Math.min(caja.height - 108, e.clientY - caja.top - 48));
    setPosiciones((p) => ({ ...p, [id]: { x: Math.round(x), y: Math.round(y) } }));
  }

  async function alSoltar() {
    const id = arrastrando.current;
    arrastrando.current = null;
    if (!id || !movio.current) return;
    const pos = posiciones[id];
    if (pos) {
      await moverEnMapa(id, pos.x, pos.y);
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 text-zinc-400">
          <Move className="h-3.5 w-3.5 text-[#FFC200]" />
          Arrastra los puestos para reorganizar el patio; suéltalos donde quieras.
        </span>
        <span className="font-bold text-zinc-300">{puestos.length} puestos</span>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl backdrop-blur-xl">
        <h2 className="mb-4 text-sm font-black tracking-tight text-white">Mapa general del patio</h2>

        <div
          ref={lienzo}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerLeave={alSoltar}
          className="relative min-h-[640px] w-full touch-none overflow-hidden rounded-2xl border border-white/5 bg-black/40"
        >
          {puestos.map((p) => {
            const c = estiloDe(p.estado);
            const pos = posiciones[p.id] ?? { x: p.posX, y: p.posY };
            return (
              <div
                key={p.id}
                onPointerDown={(e) => alBajar(p.id, e)}
                onClick={() => {
                  if (!movio.current) onSeleccionar(p);
                }}
                style={{ left: pos.x, top: pos.y }}
                /* Las dos superficies son de la paleta de zinc y no `bg-black/70`
                   porque el modo Día solo da vuelta las clases con equivalente
                   claro: con el negro translúcido, la tarjeta quedaba oscura
                   sobre el lienzo blanco. El estado lo dicen el borde, la
                   etiqueta y el número, no el fondo. */
                className={`absolute flex h-[100px] w-[140px] cursor-grab flex-col justify-between rounded-2xl border-2 p-3 transition-shadow select-none active:cursor-grabbing ${c.borde} ${
                  p.estado === "LIBRE" ? "bg-zinc-900" : "bg-zinc-950"
                } hover:shadow-lg`}
              >
                <span
                  className={`self-end rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider ${c.fondo} ${c.texto}`}
                >
                  {c.etiqueta}
                </span>
                <span className={`text-3xl leading-none font-black ${c.texto}`}>
                  {p.numero.replace(/\D/g, "").padStart(2, "0")}
                </span>
                <span className="truncate text-[10px] text-zinc-400">
                  {p.arrendatario?.negocio ?? ""}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end gap-3 text-[11px]">
          {ORDEN_ESTADOS.map((clave) => (
            <span key={clave} className="flex items-center gap-1.5 text-zinc-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: ESTADOS[clave].hex }}
              />
              {ESTADOS[clave].etiqueta}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
