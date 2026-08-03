"use client";

import type { ReactNode } from "react";
import type { ResumenBar } from "@cerveza/_lib/datos";
import { plata } from "@/lib/format";
import { Seccion, TarjetaBar } from "@cerveza/_componentes/piezas";

type Tarjeta = {
  etiqueta: string;
  valor: string | number;
  moneda?: boolean;
  pie: string;
  icono: ReactNode;
};

/**
 * El tablero del día: las cuatro tarjetas, lo más vendido, cómo se cobró y a
 * qué hora se vende. Es cliente solo por el formato de moneda.
 */
export function PanelResumen({
  resumen,
  tarjetas,
}: {
  resumen: ResumenBar;
  tarjetas: Tarjeta[];
}) {
  const topeHora = Math.max(1, ...resumen.porHora.map((h) => h.monto));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((t) => (
          <TarjetaBar
            key={t.etiqueta}
            etiqueta={t.etiqueta}
            valor={t.moneda ? plata(Number(t.valor)) : t.valor}
            pie={t.pie}
            icono={t.icono}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Seccion titulo="Lo más vendido hoy" className="xl:col-span-2">
          {resumen.topProductos.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-zinc-500">
              Todavía no se vendió nada hoy.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {resumen.topProductos.map((p, i) => {
                const tope = resumen.topProductos[0].unidades || 1;
                return (
                  <li key={p.nombre} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-5 shrink-0 text-[12px] font-black text-zinc-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-white">{p.nombre}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full bg-[#FFC200] transition-[width] duration-700"
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
          )}
        </Seccion>

        <Seccion titulo="Cómo se cobró">
          {resumen.porMetodo.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-zinc-500">Sin cobros todavía.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {resumen.porMetodo.map((m) => (
                <li key={m.metodo} className="flex items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="text-[13.5px] font-bold text-zinc-200">{m.metodo}</p>
                    <p className="text-[11px] text-zinc-500">{m.cantidad} tickets</p>
                  </div>
                  <p className="tabular text-[15px] font-black text-[#FFC200]">{plata(m.monto)}</p>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>

      {resumen.porHora.length > 0 && (
        <Seccion titulo="A qué hora se vende">
          <div className="flex h-32 items-end gap-1.5 px-5 py-4">
            {resumen.porHora.map((h) => (
              <div key={h.hora} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-lg bg-[#FFC200] transition-[height] duration-700"
                  style={{ height: `${Math.max(4, (h.monto / topeHora) * 88)}px` }}
                  title={plata(h.monto)}
                />
                <span className="text-[10px] font-bold text-zinc-600">
                  {String(h.hora).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </Seccion>
      )}
    </>
  );
}
