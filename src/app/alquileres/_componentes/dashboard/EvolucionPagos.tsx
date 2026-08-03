"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CircleDollarSign, PieChart } from "lucide-react";
import type { Metricas, ResumenMes } from "@alquileres/_lib/datos";
import { plata } from "@/lib/format";
import { useContador } from "@/components/animaciones";

const VERDE = "#10b981";
const AMARILLO = "#FFC200";

/** Anillo de cumplimiento: la porción verde es lo cobrado. */
function Anillo({
  pct,
  tamano,
  grosor,
  children,
}: {
  pct: number;
  tamano: number;
  grosor: number;
  children?: React.ReactNode;
}) {
  const r = (tamano - grosor) / 2;
  const vuelta = 2 * Math.PI * r;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: tamano, height: tamano }}
    >
      <svg width={tamano} height={tamano} className="absolute inset-0 -rotate-90">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={AMARILLO} strokeWidth={grosor} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke={VERDE}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={vuelta}
          strokeDashoffset={vuelta * (1 - pct / 100)}
          style={
            {
              // Se dibuja al entrar y, al cambiar de mes, viaja al valor nuevo.
              "--vuelta": vuelta,
              animation: "dibujar-anillo 1.1s cubic-bezier(.32,.72,0,1)",
              transition: "stroke-dashoffset .8s cubic-bezier(.32,.72,0,1)",
            } as React.CSSProperties
          }
        />
      </svg>
      <span className="relative text-center">{children}</span>
    </span>
  );
}

/** Monto que sube desde cero al entrar y al cambiar de mes. */
function Monto({ valor, className }: { valor: number; className?: string }) {
  return <span className={className}>{plata(Math.round(useContador(valor)))}</span>;
}

/**
 * "Evolución de pagos" del prototipo. El mes se elige desde el carrusel de
 * abajo y todo el panel —anillo, reparto y totales— se recalcula para ese mes.
 */
export default function EvolucionPagos({ metricas: m }: { metricas: Metricas }) {
  const ultimo = m.meses.length - 1;
  const [elegido, setElegido] = useState(ultimo);
  const [desde, setDesde] = useState(Math.max(0, m.meses.length - 6));

  const mes: ResumenMes = m.meses[elegido] ?? m.meses[ultimo];
  const pctPagados = mes.conArrendatario
    ? Math.round((mes.pagados / mes.conArrendatario) * 100)
    : 0;
  const visibles = m.meses.slice(desde, desde + 6);

  return (
    <div className="anim-aparecer space-y-4">
      {/* --- Panel del mes elegido --- */}
      <div className="panel p-4">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#FFC200]">
            <PieChart className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-black tracking-tight text-white">Evolución de pagos</h2>
            <p className="text-[11px] text-zinc-500">
              Consulta el cumplimiento de pagos por mes · toca un mes para ver su detalle
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <Anillo pct={mes.pct} tamano={156} grosor={26}>
            <span className="block text-xl font-black tracking-tight text-white">
              {mes.etiqueta}
            </span>
            <span className="block text-xs text-zinc-400">{mes.conArrendatario} puestos</span>
          </Anillo>

          <div className="escalonar space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/50 px-4 py-2.5">
              <span className="flex items-center gap-2.5 text-sm font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Pagados
              </span>
              <span className="text-xs text-zinc-400">{mes.pagados} puestos</span>
              <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-400">
                {pctPagados}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/50 px-4 py-2.5">
              <span className="flex items-center gap-2.5 text-sm font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFC200]" />
                Pendientes / Mora
              </span>
              <span className="text-xs text-zinc-400">{mes.pendientes} puestos</span>
              <span className="rounded-lg bg-[#FFC200]/20 px-2.5 py-1 text-xs font-black text-[#FFC200]">
                {100 - pctPagados}%
              </span>
            </div>
          </div>
        </div>

        <div className="escalonar mt-4 grid gap-2.5 sm:grid-cols-3">
          {/* Los tres llevan a la pantalla de pagos, igual que en el prototipo. */}
          {(
            [
              ["Total del mes", mes.total, "text-white"],
              ["Cobrado", mes.cobrado, "text-emerald-400"],
              ["Por cobrar", mes.porCobrar, "text-[#FFC200]"],
            ] as const
          ).map(([etiqueta, valor, color]) => (
            <Link
              key={etiqueta}
              href="/alquileres/pagos"
              title="Ver en Evolución de Pagos"
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/50 px-4 py-3 transition hover:border-white/15"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FFC200]/30 bg-[#FFC200]/10 text-[#FFC200]">
                <CircleDollarSign className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  {etiqueta}
                </span>
                <Monto valor={valor} className={`tabular block text-sm font-black ${color}`} />
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
            </Link>
          ))}
        </div>
      </div>

      {/* --- Carrusel de meses --- */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">Historial de cumplimiento mensual</h3>
          <div className="flex gap-1.5">
            <button
              onClick={() => setDesde((d) => Math.max(0, d - 1))}
              disabled={desde === 0}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:text-white disabled:opacity-30"
              aria-label="Meses anteriores"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDesde((d) => Math.min(Math.max(0, m.meses.length - 6), d + 1))}
              disabled={desde >= m.meses.length - 6}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:text-white disabled:opacity-30"
              aria-label="Meses siguientes"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="escalonar grid grid-cols-3 gap-3 sm:grid-cols-6">
          {visibles.map((h) => {
            const indice = m.meses.indexOf(h);
            const activo = indice === elegido;
            return (
              <button
                key={h.clave}
                onClick={() => setElegido(indice)}
                className={`flex flex-col items-center gap-2 rounded-2xl border py-3 transition ${
                  activo
                    ? "border-[#FFC200] bg-[#FFC200]/10"
                    : "border-white/5 bg-black/50 hover:border-white/20"
                }`}
              >
                <span
                  className={`text-[11px] font-bold ${activo ? "text-[#FFC200]" : "text-zinc-300"}`}
                >
                  {h.etiqueta}
                </span>
                <Anillo pct={h.pct} tamano={40} grosor={5}>
                  <span className="text-[11px] font-black text-white">{h.pct}%</span>
                </Anillo>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
