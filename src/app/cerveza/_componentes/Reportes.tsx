"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Coins, Receipt, TrendingUp } from "lucide-react";
import type { Reportes as DatosReportes } from "@cerveza/_lib/datos";
import { Vacio } from "@/components/ui";
import { aCsv, descargarTexto } from "@/lib/csv";
import { plata } from "@/lib/format";
import { BotonBar, Seccion, TarjetaBar } from "@cerveza/_componentes/piezas";

const EJE = { fontSize: 11, fill: "#71717a" };
const GRILLA = "#27272a";
const PALETA = ["#FFC200", "#E2A812", "#B8860B", "#34d399", "#38bdf8", "#f472b6", "#a78bfa"];

/** Bs abreviado para los ejes: "Bs 1,2 k" ocupa menos que el número entero. */
function corto(n: number) {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} k`;
  return String(Math.round(n));
}

function Globito({
  active,
  payload,
  label,
  unidades,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  unidades?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/12 bg-zinc-950/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-bold text-zinc-400 uppercase">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-500">{p.name}</span>
          <span className="tabular ml-auto font-bold text-white">
            {unidades ? p.value : plata(Number(p.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

const RANGOS = [
  { dias: 7, etiqueta: "7 días" },
  { dias: 30, etiqueta: "30 días" },
  { dias: 90, etiqueta: "90 días" },
];

/** Cómo viene funcionando el bar: plata, productos, horas y cajeras. */
export default function Reportes({ datos, dias }: { datos: DatosReportes; dias: number }) {
  const [exportando, setExportando] = useState(false);

  const margenPct = datos.total > 0 ? Math.round((datos.margen / datos.total) * 100) : 0;
  const horas = Array.from({ length: 24 }, (_, h) => ({
    hora: `${String(h).padStart(2, "0")}h`,
    monto: datos.porHora.find((x) => x.hora === h)?.monto ?? 0,
    // El bar abre de tarde: mostrar las 24 horas deja el gráfico medio vacío.
    activa: h >= 10,
  })).filter((x) => x.activa);

  function exportar() {
    setExportando(true);
    descargarTexto(
      aCsv(
        ["Sección", "Concepto", "Cantidad", "Monto"],
        [
          ...datos.porDia.map((d) => ["Por día", d.dia, d.tickets, d.monto]),
          ...datos.porCategoria.map((c) => ["Por categoría", c.categoria, c.unidades, c.monto]),
          ...datos.porProducto.map((p) => ["Por producto", p.nombre, p.unidades, p.monto]),
          ...datos.porMetodo.map((m) => ["Por método", m.metodo, m.cantidad, m.monto]),
          ...datos.porCajera.map((c) => ["Por cajera", c.cajera, c.tickets, c.monto]),
        ],
      ),
      `reporte-cerveceria-${dias}d.csv`,
    );
    setExportando(false);
  }

  if (datos.tickets === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-950">
        <Vacio
          icono={<BarChart3 className="h-7 w-7" />}
          titulo="Todavía no hay ventas en este período"
          bajada="En cuanto se cobre el primer ticket, acá aparece cómo viene el bar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.dias}
            href={`/cerveceria/reportes?dias=${r.dias}`}
            className={`rounded-2xl border px-4 py-2 text-[12.5px] font-bold transition ${
              dias === r.dias
                ? "border-[#FFC200] bg-[#FFC200]/15 text-[#FFC200]"
                : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {r.etiqueta}
          </Link>
        ))}
        <BotonBar tipo="fantasma" ocupado={exportando} onClick={exportar} className="ml-auto">
          Exportar CSV
        </BotonBar>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaBar
          etiqueta="Recaudado"
          valor={plata(datos.total)}
          pie={`en ${dias} días`}
          icono={<Coins className="h-6 w-6" />}
        />
        <TarjetaBar
          etiqueta="Tickets"
          valor={datos.tickets}
          pie={`${datos.unidades} unidades vendidas`}
          icono={<Receipt className="h-6 w-6" />}
        />
        <TarjetaBar
          etiqueta="Ticket promedio"
          valor={plata(datos.ticketPromedio)}
          pie="por venta"
          icono={<TrendingUp className="h-6 w-6" />}
        />
        <TarjetaBar
          etiqueta="Margen bruto"
          valor={plata(datos.margen)}
          pie={`${margenPct}% sobre lo vendido`}
          tono="apagado"
        />
      </div>

      <Seccion titulo="Recaudación por día">
        <div className="p-4">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={datos.porDia} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFC200" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FFC200" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRILLA} strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tick={EJE}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={EJE}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={corto}
              />
              <Tooltip content={<Globito />} cursor={{ stroke: "#3f3f46" }} />
              <Area
                type="monotone"
                dataKey="monto"
                name="Recaudado"
                stroke="#FFC200"
                strokeWidth={2.4}
                fill="url(#gBar)"
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Seccion>

      <div className="grid gap-4 xl:grid-cols-2">
        <Seccion titulo="Por hora">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={horas} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={GRILLA} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="hora" tick={EJE} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={EJE} axisLine={false} tickLine={false} width={52} tickFormatter={corto} />
                <Tooltip content={<Globito />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar
                  dataKey="monto"
                  name="Recaudado"
                  fill="#FFC200"
                  radius={[5, 5, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Seccion>

        <Seccion titulo="Por categoría">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={datos.porCategoria}
                  dataKey="monto"
                  nameKey="categoria"
                  innerRadius="55%"
                  outerRadius="82%"
                  paddingAngle={3}
                  stroke="none"
                  animationDuration={800}
                >
                  {datos.porCategoria.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip content={<Globito />} />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  formatter={(v) => <span style={{ color: "#a1a1aa", fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Seccion>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Seccion titulo="Lo más vendido">
          <ul className="divide-y divide-white/5">
            {datos.porProducto.map((p, i) => {
              const tope = datos.porProducto[0]?.unidades || 1;
              return (
                <li key={p.nombre} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-5 shrink-0 text-[12px] font-black text-zinc-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-white">{p.nombre}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full bg-[#FFC200]"
                        style={{ width: `${(p.unidades / tope) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[13px] font-black text-[#FFC200]">{plata(p.monto)}</p>
                    <p className="tabular text-[11px] text-zinc-500">{p.unidades} u</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Seccion>

        <div className="space-y-4">
          <Seccion titulo="Formas de cobro">
            <ul className="divide-y divide-white/5">
              {datos.porMetodo.map((m) => (
                <li key={m.metodo} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-[13px] font-bold text-zinc-300">{m.metodo}</span>
                  <span className="text-[11.5px] text-zinc-500">{m.cantidad} tickets</span>
                  <span className="tabular text-[14px] font-black text-[#FFC200]">
                    {plata(m.monto)}
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo="Por cajera">
            <ul className="divide-y divide-white/5">
              {datos.porCajera.map((c) => (
                <li key={c.cajera} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-[13px] font-bold text-zinc-300">{c.cajera}</span>
                  <span className="text-[11.5px] text-zinc-500">{c.tickets} tickets</span>
                  <span className="tabular text-[14px] font-black text-white">{plata(c.monto)}</span>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      </div>
    </div>
  );
}
