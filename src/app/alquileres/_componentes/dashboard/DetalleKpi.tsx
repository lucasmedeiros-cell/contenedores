"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2 } from "lucide-react";
import type { Metricas, PuestoCliente } from "@alquileres/_lib/datos";
import { ESTADOS } from "@alquileres/_lib/estados";
import { fecha as fmtFecha, plata } from "@/lib/format";
import { Modal } from "@/components/ui";

export type TipoKpi = "ingresos" | "ocupacion" | "pendientes";

const TITULOS: Record<TipoKpi, string> = {
  ingresos: "Detalle de Ingresos del Mes",
  ocupacion: "Detalle de Ocupación del Patio",
  pendientes: "Detalle de Pagos Pendientes / Vencidos",
};

const TOOLTIP = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #3f3f46",
  fontSize: 12,
};

/**
 * El detalle que abre cada tarjeta del dashboard, igual que en el prototipo:
 * el reparto de ingresos, la ocupación del patio o la lista de morosos.
 */
export default function DetalleKpi({
  tipo,
  puestos,
  metricas: m,
  onCerrar,
  onSeleccionar,
  onCobrar,
}: {
  tipo: TipoKpi;
  puestos: PuestoCliente[];
  metricas: Metricas;
  onCerrar: () => void;
  onSeleccionar: (p: PuestoCliente) => void;
  onCobrar: (p: PuestoCliente) => void;
}) {
  const pendientes = puestos.filter((p) => p.estado === "PENDIENTE");

  const ocupacion = [
    { name: ESTADOS.OCUPADO.etiqueta, value: m.ocupados, color: ESTADOS.OCUPADO.hex },
    { name: ESTADOS.PENDIENTE.etiqueta, value: m.pendientes, color: ESTADOS.PENDIENTE.hex },
    { name: ESTADOS.LIBRE.etiqueta, value: m.libres, color: ESTADOS.LIBRE.hex },
  ];

  const ingresos = [
    { name: "Cobrado", monto: m.recaudadoMes, color: ESTADOS.OCUPADO.hex },
    { name: "En Mora / Pendiente", monto: m.porCobrar, color: ESTADOS.PENDIENTE.hex },
  ];

  return (
    <Modal
      titulo={TITULOS[tipo]}
      bajada="Información analítica en tiempo real del patio de comidas"
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      {tipo === "ingresos" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <span className="block text-[10px] font-bold tracking-widest text-emerald-300/80 uppercase">
                Cobrado Este Mes
              </span>
              <span className="text-xl font-black text-emerald-400">{plata(m.recaudadoMes)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <span className="block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Proyección Total Mes
              </span>
              <span className="text-xl font-black text-white">{plata(m.proyeccionMes)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <h3 className="mb-3 text-xs font-black tracking-wider text-zinc-300 uppercase">
              Distribución de Ingresos
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ingresos} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis
                    type="number"
                    stroke="#71717a"
                    fontSize={11}
                    tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                  />
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={TOOLTIP}
                    cursor={{ fill: "rgba(255,255,255,.04)" }}
                    formatter={(v) => [plata(Number(v)), "Monto"]}
                  />
                  <Bar dataKey="monto" radius={[0, 8, 8, 0]}>
                    {ingresos.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tipo === "ocupacion" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                [m.ocupados, "Ocupados", "text-emerald-400"],
                [m.pendientes, "Pendientes", "text-[#FFC200]"],
                [m.libres, "Libres", "text-zinc-400"],
              ] as const
            ).map(([valor, etiqueta, color]) => (
              <div
                key={etiqueta}
                className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center"
              >
                <span className={`block text-2xl font-black ${color}`}>{valor}</span>
                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  {etiqueta}
                </span>
              </div>
            ))}
          </div>

          <div className="grid items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-2">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ocupacion}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {ocupacion.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2.5 text-xs">
              {ocupacion.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-zinc-400">{d.name}:</span>
                  <strong className="text-zinc-100">
                    {d.value} puestos (
                    {m.totalPuestos ? Math.round((d.value / m.totalPuestos) * 100) : 0}%)
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tipo === "pendientes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 p-4">
            <div>
              <h3 className="text-sm font-black text-[#FFC200]">Cobros Pendientes</h3>
              <p className="text-[11px] text-[#FFC200]/70">Total a recuperar este mes</p>
            </div>
            <span className="text-xl font-black text-[#FFC200]">{plata(m.porCobrar)}</span>
          </div>

          {pendientes.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
              <span className="text-xs text-emerald-300">
                ¡Excelente! Todos los puestos ocupados están al día con sus pagos.
              </span>
            </div>
          ) : (
            <div>
              <h3 className="mb-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                Comercios con pago pendiente:
              </h3>
              <div className="space-y-2">
                {pendientes.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSeleccionar(p)}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 transition hover:border-[#FFC200]/40"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-white">{p.numero}</strong>
                        <span className="rounded-lg border border-[#FFC200]/30 bg-[#FFC200]/10 px-2 py-0.5 text-[11px] font-bold text-[#FFC200]">
                          {p.arrendatario?.negocio ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        Titular: {p.arrendatario?.nombre ?? "—"} • Vence:{" "}
                        {p.arrendatario ? fmtFecha(p.arrendatario.proximoVencimiento) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-[#FFC200]">
                        {plata(p.arrendatario?.montoAcordado ?? p.precioBase)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCobrar(p);
                        }}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-black transition hover:brightness-110"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
