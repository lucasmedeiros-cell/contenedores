"use client";

import { Printer, Ticket } from "lucide-react";
import { enLetras, fecha as fmtFecha, plata } from "@/lib/format";
import { Modal } from "@/components/ui";

/**
 * El comprobante de pago. Lo abren el historial, la ficha del puesto y la
 * pantalla de pagos, así que vive suelto en vez de dentro de alguno de los tres.
 *
 * Está escrito como un recibo y no como una tarjeta de la interfaz: encabezado
 * con el emisor, número, a quién y por qué concepto se cobró, el importe en
 * números y en letras, y las dos firmas. Es el papel que se lleva el
 * arrendatario, y antes salía impreso como un recuadro chico en el medio de una
 * hoja en blanco, con el título del diálogo y todo.
 */
export type DatosComprobante = {
  transaccion: string;
  fecha: string | Date;
  puesto: string;
  comercio: string;
  concepto?: string;
  metodoPago: string;
  monto: number;
  notas?: string | null;
  /** Quién lo cobró. Va al pie, junto a la fecha de emisión. */
  titular?: string | null;
};

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-white/10 py-1.5">
      <dt className="text-zinc-500">{etiqueta}</dt>
      <dd className="text-right font-medium text-zinc-200">{valor}</dd>
    </div>
  );
}

export default function Comprobante({
  datos,
  onCerrar,
}: {
  datos: DatosComprobante;
  onCerrar: () => void;
}) {
  const emitido = new Date();

  return (
    <Modal titulo="Comprobante de Pago" bajada="Patio de Comidas" onCerrar={onCerrar}>
      <div className="area-impresion">
        <div className="no-imprimir mb-4 flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#FFC200]/40 bg-[#FFC200]/15">
            <Ticket className="h-7 w-7 text-[#FFC200]" />
          </span>
          <span className="text-[11px] font-bold text-emerald-400">Cobro registrado</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          {/* Encabezado: emisor a la izquierda, identificación del recibo a la derecha */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-white/15 pb-3">
            <div>
              <p className="text-base font-black tracking-tight text-white uppercase">
                Contenedores
              </p>
              <p className="text-[10px] tracking-wider text-zinc-500 uppercase">
                Patio de Comidas · Administración de alquileres
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-black tracking-widest text-[#FFC200] uppercase">
                Recibo de Pago
              </p>
              <p className="font-mono text-[11px] font-bold text-zinc-200">{datos.transaccion}</p>
              <p className="text-[10px] text-zinc-500">
                Emitido {fmtFecha(emitido)} ·{" "}
                {emitido.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-zinc-500">
            Recibimos de{" "}
            <strong className="font-bold text-zinc-100">{datos.comercio}</strong> la suma detallada
            abajo, en concepto de alquiler del puesto que ocupa en el patio.
          </p>

          <dl className="mt-3 text-xs">
            <Fila etiqueta="Puesto" valor={datos.puesto} />
            <Fila etiqueta="Comercio" valor={datos.comercio} />
            {datos.titular && <Fila etiqueta="Titular" valor={datos.titular} />}
            {datos.concepto && <Fila etiqueta="Concepto" valor={datos.concepto} />}
            <Fila etiqueta="Forma de pago" valor={datos.metodoPago} />
            <Fila etiqueta="Fecha del pago" valor={fmtFecha(datos.fecha)} />
          </dl>

          {/* Importe: en números y en letras, como corresponde a un recibo */}
          <div className="mt-4 rounded-xl border border-[#FFC200]/30 bg-[#FFC200]/10 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-black tracking-widest text-zinc-400 uppercase">
                Total pagado
              </span>
              <span className="tabular text-2xl font-black text-[#FFC200]">
                {plata(datos.monto, true)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 italic">
              Son: {enLetras(datos.monto)} bolivianos.
            </p>
          </div>

          {datos.notas && (
            <p className="mt-3 text-[11px] text-zinc-500 italic">Observaciones: {datos.notas}</p>
          )}

          {/* Firmas */}
          <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[10px] text-zinc-500">
            <div className="border-t border-white/25 pt-1.5">Recibí conforme</div>
            <div className="border-t border-white/25 pt-1.5">Por la administración</div>
          </div>

          <p className="mt-4 border-t border-white/10 pt-2 text-center text-[9px] text-zinc-600">
            Este comprobante acredita el pago del período indicado. Documento interno, sin valor
            fiscal.
          </p>
        </div>

        <div className="no-imprimir mt-4 flex gap-2">
          <button
            onClick={onCerrar}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/10"
          >
            Cerrar
          </button>
          <button
            onClick={() => window.print()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC200] py-3 text-sm font-black text-black shadow-lg shadow-[#FFC200]/25 transition hover:brightness-110"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>
    </Modal>
  );
}
