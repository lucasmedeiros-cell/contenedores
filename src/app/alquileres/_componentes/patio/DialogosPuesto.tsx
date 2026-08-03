"use client";

import { useCallback, useState } from "react";
import type { PagoCliente, PuestoCliente } from "@alquileres/_lib/datos";
import Comprobante, { type DatosComprobante } from "./Comprobante";
import {
  DialogoArrendatario,
  DialogoCobrar,
  DialogoDetalle,
  DialogoPuesto,
} from "./dialogos";

/**
 * Los cinco diálogos del patio —ficha, cobro, arrendatario, alta/edición y
 * comprobante— con el enredo de quién abre a quién resuelto en un solo lugar.
 *
 * El dashboard, la gestión de puestos y la pantalla de pagos abren los mismos
 * cinco y encadenan igual: desde la ficha se pasa a cobrar, a editar o a ver
 * un comprobante. Cada pantalla tenía su propia copia del bloque, con sus
 * cinco `useState` y sus mismos callbacks.
 */
export function useDialogosPuesto() {
  const [detalle, verPuesto] = useState<PuestoCliente | null>(null);
  const [cobrando, cobrar] = useState<PuestoCliente | null>(null);
  const [asignando, asignar] = useState<PuestoCliente | null>(null);
  const [editando, editar] = useState<PuestoCliente | null | "nuevo">(null);
  const [ticket, verTicket] = useState<DatosComprobante | null>(null);

  const verComprobante = useCallback((p: PuestoCliente, g: PagoCliente) => {
    verTicket({
      transaccion: g.comprobante ?? g.id.slice(-8).toUpperCase(),
      fecha: g.fecha,
      puesto: p.numero,
      comercio: p.arrendatario?.negocio ?? "Comercio",
      concepto: g.concepto,
      metodoPago: g.metodoPago,
      monto: g.monto,
    });
  }, []);

  const nuevoPuesto = useCallback(() => editar("nuevo"), []);

  return {
    detalle,
    cobrando,
    asignando,
    editando,
    ticket,
    verPuesto,
    cobrar,
    asignar,
    editar,
    verTicket,
    verComprobante,
    nuevoPuesto,
  };
}

export type ControlDialogos = ReturnType<typeof useDialogosPuesto>;

export default function DialogosPuesto({
  control,
  zonas,
}: {
  control: ControlDialogos;
  zonas: { id: string; nombre: string }[];
}) {
  const { detalle, cobrando, asignando, editando, ticket } = control;

  return (
    <>
      {detalle && (
        <DialogoDetalle
          puesto={detalle}
          onCerrar={() => control.verPuesto(null)}
          onCobrar={() => {
            control.cobrar(detalle);
            control.verPuesto(null);
          }}
          onAsignar={() => {
            control.asignar(detalle);
            control.verPuesto(null);
          }}
          onEditar={() => {
            control.editar(detalle);
            control.verPuesto(null);
          }}
          onVerComprobante={(g) => control.verComprobante(detalle, g)}
        />
      )}

      {cobrando && <DialogoCobrar puesto={cobrando} onCerrar={() => control.cobrar(null)} />}

      {asignando && (
        <DialogoArrendatario puesto={asignando} onCerrar={() => control.asignar(null)} />
      )}

      {editando && (
        <DialogoPuesto
          puesto={editando === "nuevo" ? null : editando}
          zonas={zonas}
          onCerrar={() => control.editar(null)}
        />
      )}

      {ticket && <Comprobante datos={ticket} onCerrar={() => control.verTicket(null)} />}
    </>
  );
}
