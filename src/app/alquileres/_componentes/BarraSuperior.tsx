"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { SelectorTema } from "@/components/tema";
import { diasHasta } from "@alquileres/_lib/estados";
import { fecha as fmtFecha, plata } from "@/lib/format";

/** Un puesto por cobrar, tal como lo muestra la campana. */
export type Aviso = {
  id: string;
  numero: string;
  negocio: string;
  monto: number;
  vencimiento: string;
};

/**
 * Encabezado: el selector Día/Noche, la campana de cobros pendientes y el
 * usuario. El título "Panel Administrador" con su versión y su bajada salió a
 * pedido del cliente; la barra queda solo con lo que se toca.
 */
export default function BarraSuperior({
  usuario,
  avisos,
}: {
  usuario: string;
  avisos: Aviso[];
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al hacer clic afuera o con Escape, como cualquier menú.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const hay = avisos.length > 0;

  return (
    <header className="no-imprimir flex flex-wrap items-center justify-end gap-4 border-b border-white/10 bg-zinc-950 px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectorTema />

        <div ref={caja} className="relative">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition ${
              hay
                ? "border-[#FFC200]/40 bg-[#FFC200]/10 text-[#FFC200] hover:bg-[#FFC200]/20"
                : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            {hay ? `${avisos.length} cobros pendientes` : "Sin pendientes"}
          </button>

          {abierto && (
            <div className="anim-escalar absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-xs font-black text-white">Cobros pendientes</p>
                <p className="text-[11px] text-zinc-500">
                  {hay
                    ? `${avisos.length} comercio(s) con el alquiler sin cobrar`
                    : "No hay nada por cobrar"}
                </p>
              </div>

              <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
                {avisos.map((a) => {
                  const dias = diasHasta(a.vencimiento);
                  return (
                    <li key={a.id}>
                      {/* Cada aviso entra al detalle de ese puesto: la pantalla
                          de pagos abre su ficha sola al recibir `?puesto=`. */}
                      <Link
                        href={`/pagos?ver=porcobrar&puesto=${a.id}`}
                        onClick={() => setAbierto(false)}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFC200]/15 text-xs font-black text-[#FFC200]">
                          {a.numero.replace(/\D/g, "").padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-zinc-100">
                            {a.negocio}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {dias < 0
                              ? `${Math.abs(dias)} días de atraso`
                              : `vence el ${fmtFecha(a.vencimiento)}`}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-xs font-black text-[#FFC200]">
                          {plata(a.monto)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {hay && (
                <Link
                  href="/alquileres/pagos?ver=porcobrar"
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-center gap-1 border-t border-white/10 px-4 py-2.5 text-[11px] font-bold text-zinc-400 transition hover:text-white"
                >
                  Ver todos los cobros pendientes
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FFC200] to-[#E6B000] text-sm font-black text-black">
            {usuario.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-bold text-zinc-200">{usuario}</span>
        </div>
      </div>
    </header>
  );
}
