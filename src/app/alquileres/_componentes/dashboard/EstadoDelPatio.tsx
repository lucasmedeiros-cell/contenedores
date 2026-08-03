"use client";

import Link from "next/link";
import { ArrowUpRight, CircleCheck, CircleMinus, Clock, Store } from "lucide-react";
import type { Metricas, PuestoCliente } from "@alquileres/_lib/datos";
import { ESTADOS, ORDEN_ESTADOS } from "@alquileres/_lib/estados";

/**
 * Lo propio de esta grilla: el ícono y el relleno de cada estado.
 *
 * Acá las celdas van pintadas de lleno —verde, ámbar y plomo— y no con el
 * fondo translúcido de `estados.ts`, que es lo que usan las tablas y los chips.
 * Es la grilla del prototipo: de un vistazo, a dos metros de la pantalla, tiene
 * que leerse cuántos puestos están al día.
 */
const CELDA = {
  OCUPADO: { icono: CircleCheck, clases: "bg-emerald-500 text-white" },
  PENDIENTE: { icono: Clock, clases: "bg-[#FFC200] text-white" },
  LIBRE: { icono: CircleMinus, clases: "bg-zinc-800 text-zinc-500" },
} as const;

/**
 * "Estado del patio" del prototipo: la grilla de puestos numerados, con su
 * leyenda arriba y el resumen con el acceso al mapa abajo.
 */
export default function EstadoDelPatio({
  puestos,
  metricas: m,
  onSeleccionar,
}: {
  puestos: PuestoCliente[];
  metricas: Metricas;
  onSeleccionar: (p: PuestoCliente) => void;
}) {
  return (
    <div className="panel flex h-full flex-col p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#FFC200]">
          <Store className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-black tracking-tight text-white">Estado del patio</h2>
          <p className="text-[11px] text-zinc-500">
            Mapa general de puestos ({m.totalPuestos} en total)
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 border-b border-white/10 pb-3 text-[11px]">
        {ORDEN_ESTADOS.map((clave) => (
          <span key={clave} className="flex items-center gap-1.5 font-bold text-zinc-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ESTADOS[clave].hex }}
            />
            {ESTADOS[clave].leyenda}
          </span>
        ))}
      </div>

      {/* Seis columnas, como el prototipo: con cuatro, dieciséis puestos daban
          cuatro filas y el panel quedaba más alto que toda la columna de la
          izquierda. */}
      <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto sm:grid-cols-6">
        {puestos.map((p) => {
          const c = CELDA[p.estado];
          const Icono = c.icono;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSeleccionar(p)}
              title={`${p.numero}${p.arrendatario ? ` · ${p.arrendatario.negocio}` : ""}`}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl font-black transition hover:brightness-110 ${c.clases}`}
            >
              <span className="text-sm leading-none">
                {p.numero.replace(/\D/g, "").padStart(2, "0")}
              </span>
              <Icono className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {m.ocupados} al día
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-[#FFC200]" />
            {m.pendientes} en mora
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            {m.libres} libres
          </span>
        </div>
        <Link
          href="/alquileres/plano"
          className="flex items-center gap-1.5 rounded-2xl bg-[#FFC200] px-3.5 py-2 text-[11px] font-black text-black shadow-lg shadow-[#FFC200]/25 transition hover:brightness-110"
        >
          Ver mapa completo
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
