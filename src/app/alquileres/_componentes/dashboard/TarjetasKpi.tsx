"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, ChevronRight, Clock, Store, TrendingUp } from "lucide-react";
import type { Metricas } from "@alquileres/_lib/datos";
import { plata } from "@/lib/format";
import type { TipoKpi } from "./DetalleKpi";

/**
 * Las cuatro tarjetas de arriba del dashboard.
 *
 * El ícono no va en una cajita aparte con su propio borde y su propio color:
 * eso lo hacía leer como algo pegado encima. Va grande, en el amarillo de la
 * marca y apoyado sobre un halo que sale del borde, así forma parte de la
 * tarjeta. El color con información —verde lo cobrado, ámbar la mora— queda en
 * el texto y en la barra, que es donde significa algo.
 */

type Tono = "verde" | "ambar" | "neutro";

const TONOS: Record<Tono, { texto: string; barra: string }> = {
  verde: { texto: "text-emerald-400", barra: "bg-emerald-500" },
  ambar: { texto: "text-[#FFC200]", barra: "bg-[#FFC200]" },
  neutro: { texto: "text-zinc-300", barra: "bg-white/70" },
};

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  tono,
  pct,
  pie,
  icono: Icono,
  href,
  onClick,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle: ReactNode;
  tono: Tono;
  /** Cuánto llena la barra, de 0 a 100. */
  pct: number;
  pie: ReactNode;
  icono: ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
}) {
  const t = TONOS[tono];

  const contenido = (
    <>
      {/* El halo del ícono: nace fuera del borde y se difumina hacia adentro. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full bg-[#FFC200]/12 blur-2xl transition-opacity duration-300 group-hover:bg-[#FFC200]/20"
      />
      <Icono
        aria-hidden
        className="pointer-events-none absolute top-4 right-4 h-10 w-10 text-[#FFC200] opacity-90 transition-transform duration-300 group-hover:scale-110"
      />

      <div className="relative">
        <p className="pr-16 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
          {etiqueta}
        </p>
        <p className="tabular mt-1 truncate pr-16 text-2xl font-black tracking-tight text-white">
          {valor}
        </p>
        <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-bold ${t.texto}`}>{detalle}</p>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${t.barra}`}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
          {pie}
        </div>
      </div>
    </>
  );

  const clases =
    "panel group relative overflow-hidden p-3 text-left transition-all duration-200 hover:border-[#FFC200]/45 active:scale-[0.99]";

  return href ? (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={clases}>
      {contenido}
    </button>
  );
}

// ---------------------------------------------------------------------------

export default function TarjetasKpi({
  metricas: m,
  onDetalle,
}: {
  metricas: Metricas;
  onDetalle: (tipo: TipoKpi) => void;
}) {
  const avance = m.proyeccionMes > 0 ? Math.round((m.recaudadoMes / m.proyeccionMes) * 100) : 0;
  const faltante = m.proyeccionMes > 0 ? Math.round((m.porCobrar / m.proyeccionMes) * 100) : 0;
  const conArrendatario = m.conArrendatario || 1;

  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 select-none sm:grid-cols-2 xl:grid-cols-4">
      <Tarjeta
        etiqueta="Recaudación del Mes"
        valor={plata(m.recaudadoMes)}
        detalle={`${m.ocupados} comercios al día`}
        tono="verde"
        pct={avance}
        pie={
          <>
            <span className="truncate">{avance}% del total</span>
            <span className="shrink-0 text-zinc-600">Meta {plata(m.proyeccionMes)}</span>
          </>
        }
        icono={TrendingUp}
        href="/alquileres/pagos"
      />

      <Tarjeta
        etiqueta="Por Cobrar"
        valor={plata(m.porCobrar)}
        detalle={`${m.pendientes} comercios con mora`}
        tono="ambar"
        pct={faltante}
        pie={<span className="truncate">{faltante}% del total proyectado</span>}
        icono={AlertTriangle}
        href="/alquileres/pagos?ver=porcobrar"
      />

      <Tarjeta
        etiqueta="Puestos Totales"
        valor={m.totalPuestos}
        detalle={
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFC200]" />
            {m.ocupados + m.pendientes} ocupados
          </>
        }
        tono="neutro"
        pct={m.ocupacionPct}
        pie={
          <>
            <span className="truncate">{m.ocupacionPct}% de ocupación</span>
            <span className="shrink-0 text-zinc-600">{m.libres} libres</span>
          </>
        }
        icono={Store}
        onClick={() => onDetalle("ocupacion")}
      />

      <Tarjeta
        etiqueta="Pagos Pendientes"
        valor={m.pendientes}
        detalle="comercios sin cobrar"
        tono="ambar"
        pct={Math.round((m.pendientes / conArrendatario) * 100)}
        pie={
          <>
            <span className="truncate">
              Pendiente <strong className="font-bold text-[#FFC200]">{plata(m.porCobrar)}</strong>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-zinc-400 group-hover:text-[#FFC200]">
              Ver detalle
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </>
        }
        icono={Clock}
        onClick={() => onDetalle("pendientes")}
      />
    </div>
  );
}
