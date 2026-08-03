"use client";

import { fechaHora } from "@/lib/format";

export type DatosComanda = {
  ticket: string;
  fecha: string;
  cajera?: string | null;
  cliente?: string | null;
  notas?: string | null;
  lineas: { nombre: string; cantidad: number }[];
};

/**
 * El vale que va a la barra a preparar el pedido. No lleva precios —eso es del
 * ticket—: lo que importa es qué se sirve y cuánto, en letra grande y legible
 * a un metro de distancia. Comparte `area-impresion` con el ticket, así que
 * solo puede haber uno de los dos montado a la vez.
 */
export default function Comanda({ datos }: { datos: DatosComanda }) {
  const unidades = datos.lineas.reduce((s, l) => s + l.cantidad, 0);

  return (
    <div className="area-impresion rounded-2xl border border-white/10 bg-black p-5 font-mono text-[12px] text-zinc-200">
      <div className="border-b-2 border-dashed border-white/20 pb-3 text-center">
        <p className="text-[17px] font-black tracking-[.2em] text-white">COMANDA</p>
        <p className="text-[11px] text-zinc-500">Contenedores · Cervecería</p>
      </div>

      <div className="space-y-0.5 border-b border-dashed border-white/20 py-3 text-[11px]">
        <p className="flex justify-between">
          <span className="text-zinc-500">Ticket</span>
          <span className="text-[14px] font-black text-white">{datos.ticket}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-zinc-500">Hora</span>
          <span>{fechaHora(datos.fecha)}</span>
        </p>
        {datos.cajera && (
          <p className="flex justify-between">
            <span className="text-zinc-500">Atendió</span>
            <span>{datos.cajera}</span>
          </p>
        )}
        {datos.cliente && (
          <p className="flex justify-between">
            <span className="text-zinc-500">Cliente</span>
            <span>{datos.cliente}</span>
          </p>
        )}
      </div>

      <ul className="divide-y divide-dashed divide-white/10 border-b-2 border-dashed border-white/20 py-1">
        {datos.lineas.map((l, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <span className="tabular grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-white/30 text-[16px] font-black text-white">
              {l.cantidad}
            </span>
            <span className="min-w-0 flex-1 text-[14px] leading-tight font-black tracking-wide text-white uppercase">
              {l.nombre}
            </span>
          </li>
        ))}
      </ul>

      <p className="tabular flex justify-between py-3 text-[11px]">
        <span className="text-zinc-500">Total de unidades</span>
        <span className="font-black text-white">{unidades}</span>
      </p>

      {datos.notas && (
        <p className="border-t border-dashed border-white/20 pt-2 text-[11px] text-zinc-400">
          {datos.notas}
        </p>
      )}
    </div>
  );
}
