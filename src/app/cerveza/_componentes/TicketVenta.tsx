"use client";

import { fechaHora, plata } from "@/lib/format";

export type DatosTicket = {
  ticket: string;
  fecha: string;
  total: number;
  descuento?: number;
  metodo: string;
  cliente: string | null;
  cajera?: string | null;
  lineas: { nombre: string; cantidad: number; precioUnit: number; total: number }[];
  recibido?: number | null;
  anulada?: boolean;
};

/**
 * Comprobante de la venta. Va con `area-impresion` para que, al imprimir, la
 * hoja salga solo con el ticket: las reglas están en `globals.css`.
 */
export default function TicketVenta({ datos }: { datos: DatosTicket }) {
  const bruto = datos.lineas.reduce((s, l) => s + l.total, 0);
  const descuento = datos.descuento ?? 0;
  const vuelto =
    datos.recibido !== null && datos.recibido !== undefined ? datos.recibido - datos.total : null;

  return (
    <div className="area-impresion rounded-2xl border border-white/10 bg-black p-5 font-mono text-[12px] text-zinc-200">
      <div className="border-b border-dashed border-white/20 pb-3 text-center">
        <p className="text-[15px] font-black tracking-wider text-white">CONTENEDORES</p>
        <p className="text-[11px] text-zinc-500">Cervecería · Patio de comidas</p>
        {datos.anulada && (
          <p className="mt-2 text-[13px] font-black tracking-widest text-rose-400">ANULADA</p>
        )}
      </div>

      <div className="space-y-0.5 border-b border-dashed border-white/20 py-3 text-[11px]">
        <p className="flex justify-between">
          <span className="text-zinc-500">Ticket</span>
          <span className="font-bold text-white">{datos.ticket}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-zinc-500">Fecha</span>
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

      <ul className="space-y-1.5 border-b border-dashed border-white/20 py-3">
        {datos.lineas.map((l, i) => (
          <li key={i}>
            <p className="flex justify-between gap-2">
              <span className="min-w-0 truncate">{l.nombre}</span>
              <span className="tabular shrink-0 font-bold text-white">{plata(l.total, true)}</span>
            </p>
            <p className="tabular text-[10.5px] text-zinc-500">
              {l.cantidad} × {plata(l.precioUnit, true)}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-1 py-3 text-[11px]">
        {descuento > 0 && (
          <>
            <p className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="tabular">{plata(bruto, true)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-zinc-500">Descuento</span>
              <span className="tabular">− {plata(descuento, true)}</span>
            </p>
          </>
        )}
        <p className="flex items-center justify-between border-t border-dashed border-white/20 pt-2">
          <span className="text-[13px] font-black text-white">TOTAL</span>
          <span className="tabular text-[17px] font-black text-[#FFC200]">
            {plata(datos.total, true)}
          </span>
        </p>
        <p className="flex justify-between">
          <span className="text-zinc-500">Forma de pago</span>
          <span>{datos.metodo}</span>
        </p>
        {vuelto !== null && vuelto >= 0 && (
          <>
            <p className="flex justify-between">
              <span className="text-zinc-500">Recibido</span>
              <span className="tabular">{plata(datos.recibido!, true)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-zinc-500">Vuelto</span>
              <span className="tabular font-bold text-white">{plata(vuelto, true)}</span>
            </p>
          </>
        )}
      </div>

      <p className="border-t border-dashed border-white/20 pt-3 text-center text-[10.5px] text-zinc-500">
        ¡Gracias por tu visita!
      </p>
    </div>
  );
}
