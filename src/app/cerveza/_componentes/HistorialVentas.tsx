"use client";

import { useMemo, useState } from "react";
import { Ban, ClipboardList, Download, Printer, Receipt } from "lucide-react";
import type { Venta } from "@cerveza/_lib/datos";
import { anularVenta } from "@cerveza/acciones";
import { Aviso, Campo, Modal, Vacio } from "@/components/ui";
import { exportarCsv } from "@/lib/csv";
import { fechaHora, plata } from "@/lib/format";
import { BotonBar, Buscador, ChipEstado, PieFormulario, useAccion } from "@cerveza/_componentes/piezas";
import TicketVenta, { type DatosTicket } from "@cerveza/_componentes/TicketVenta";
import Comanda from "@cerveza/_componentes/Comanda";

const FILTROS = [
  { clave: "TODAS", etiqueta: "Todas" },
  { clave: "COMPLETADA", etiqueta: "Cobradas" },
  { clave: "ANULADA", etiqueta: "Anuladas" },
];

/** Historial de tickets: buscar, ver el detalle, reimprimir y anular. */
export default function HistorialVentas({ ventas }: { ventas: Venta[] }) {
  const [filtro, setFiltro] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [vista, setVista] = useState<"ticket" | "comanda">("ticket");
  const [anulando, setAnulando] = useState<Venta | null>(null);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return ventas.filter((v) => {
      if (filtro !== "TODAS" && v.estado !== filtro) return false;
      if (!texto) return true;
      return (
        v.ticket.toLowerCase().includes(texto) ||
        (v.cliente ?? "").toLowerCase().includes(texto) ||
        (v.cajera ?? "").toLowerCase().includes(texto) ||
        v.lineas.some((l) => l.nombre.toLowerCase().includes(texto))
      );
    });
  }, [ventas, filtro, busqueda]);

  const cobrado = lista
    .filter((v) => v.estado === "COMPLETADA")
    .reduce((s, v) => s + v.total, 0);

  /** Exporta lo que se está viendo, con los mismos filtros aplicados. */
  function exportar() {
    exportarCsv(
      "ventas-cerveceria",
      ["Ticket", "Fecha", "Estado", "Cliente", "Cajera", "Método", "Total"],
      lista.map((v) => [
        v.ticket,
        new Date(v.fecha).toLocaleString("es-BO"),
        v.estado,
        v.cliente,
        v.cajera,
        v.metodo,
        v.total,
      ]),
    );
  }

  return (
    /**
     * El buscador, los filtros y los contadores quedan fijos: lo único que se
     * desplaza es la lista de tickets, con su cabecera pegada arriba. Con 90
     * ventas en pantalla, scrollear y perder de vista los filtros obligaba a
     * volver al principio para cambiar uno.
     */
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Buscador
          valor={busqueda}
          onBuscar={setBusqueda}
          marcador="Buscar por ticket, cliente o producto…"
          filtros={FILTROS}
          activo={filtro}
          onFiltrar={setFiltro}
          accion={
            <BotonBar tipo="fantasma" onClick={exportar}>
          <Download className="h-4 w-4" />
          CSV
        </BotonBar>
          }
        />

      <div className="flex flex-wrap gap-3 text-[13px]">
        <span className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-2 font-bold text-zinc-400">
          {lista.length} tickets
        </span>
        <span className="tabular rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 px-4 py-2 font-black text-[#FFC200]">
          {plata(cobrado)} cobrados
        </span>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950">
          <Vacio
            icono={<Receipt className="h-7 w-7" />}
            titulo="No hay ventas con ese criterio"
            bajada="Probá con otro filtro o buscá por otro texto."
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[10.5px] tracking-widest text-zinc-500 uppercase">
                <tr>
                  {["Ticket", "Fecha", "Detalle", "Método", "Total", "Estado", ""].map((t, i) => (
                    <th
                      key={t || i}
                      // Pegada al borde de arriba de la lista: el `shadow` hace
                      // de borde, que en una fila sticky no se dibuja.
                      className={`sticky top-0 z-10 bg-zinc-950 px-4 py-3 font-bold shadow-[inset_0_-1px_0_rgba(255,255,255,.1)] ${
                        t === "Total" ? "text-right" : ""
                      }`}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lista.map((v) => (
                  <tr key={v.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-3 font-bold text-white">{v.ticket}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                      {fechaHora(v.fecha)}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-zinc-400">
                      {v.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{v.metodo}</td>
                    <td className="tabular px-4 py-3 text-right font-black text-[#FFC200]">
                      {plata(v.total)}
                    </td>
                    <td className="px-4 py-3">
                      <ChipEstado estado={v.estado} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setVista("ticket");
                          setDetalle(v);
                        }}
                        className="rounded-xl border border-white/10 px-3 py-1.5 text-[12px] font-bold text-zinc-300 transition hover:border-[#FFC200] hover:text-[#FFC200]"
                      >
                        Ver
                      </button>
                      {v.estado !== "ANULADA" && (
                        <button
                          onClick={() => setAnulando(v)}
                          className="ml-1.5 rounded-xl border border-rose-500/25 px-3 py-1.5 text-[12px] font-bold text-rose-400 transition hover:bg-rose-500/10"
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        abierta={!!detalle}
        onCerrar={() => setDetalle(null)}
        titulo={vista === "ticket" ? "Comprobante" : "Comanda"}
        bajada={detalle?.ticket}
        ancho="max-w-sm"
        pie={
          <>
            <BotonBar
              onClick={() => setVista((v) => (v === "ticket" ? "comanda" : "ticket"))}
              tipo="fantasma"
              className="flex-1"
            >
              <ClipboardList className="h-4 w-4" />
              {vista === "ticket" ? "Ver comanda" : "Ver ticket"}
            </BotonBar>
            <BotonBar onClick={() => window.print()} className="flex-1">
              <Printer className="h-4 w-4" />
              Imprimir
            </BotonBar>
          </>
        }
      >
        {detalle &&
          (vista === "ticket" ? (
            <TicketVenta datos={aTicket(detalle)} />
          ) : (
            <Comanda
              datos={{
                ticket: detalle.ticket,
                fecha: detalle.fecha,
                cajera: detalle.cajera,
                cliente: detalle.cliente,
                notas: detalle.notas,
                lineas: detalle.lineas,
              }}
            />
          ))}
      </Modal>

      {anulando && <DialogoAnular venta={anulando} onCerrar={() => setAnulando(null)} />}
    </div>
  );
}

function aTicket(v: Venta): DatosTicket {
  return {
    ticket: v.ticket,
    fecha: v.fecha,
    total: v.total,
    descuento: v.descuento,
    metodo: v.metodo,
    cliente: v.cliente,
    cajera: v.cajera,
    lineas: v.lineas,
    anulada: v.estado === "ANULADA",
  };
}

function DialogoAnular({ venta, onCerrar }: { venta: Venta; onCerrar: () => void }) {
  const { correr, error, ocupado } = useAccion();
  const [motivo, setMotivo] = useState("");

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo="Anular la venta"
      bajada={`${venta.ticket} · ${plata(venta.total)}`}
    >
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-400">
          Todo lo que tenía este ticket vuelve al stock —las unidades a su producto y los litros a
          los barriles conectados—. La venta no se borra: queda marcada como anulada.
        </p>

        <Campo etiqueta="Motivo" ayuda="Queda asentado en el movimiento de stock.">
          <input
            className="campo"
            value={motivo}
            placeholder="Se equivocó el pedido, se cayó el vaso…"
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>

        <Aviso mensaje={error} />

        <PieFormulario onCerrar={onCerrar}>
          <BotonBar
            tipo="peligro"
            ocupado={ocupado}
            className="flex-1"
            onClick={() => correr(() => anularVenta(venta.id, motivo || undefined), onCerrar)}
          >
            <Ban className="h-4 w-4" />
            Anular y devolver el stock
          </BotonBar>
        </PieFormulario>
      </div>
    </Modal>
  );
}
