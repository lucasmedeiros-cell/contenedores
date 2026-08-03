"use client";

import { useState } from "react";
import type { Metricas, PuestoCliente } from "@alquileres/_lib/datos";
import TarjetasKpi from "./TarjetasKpi";
import EvolucionPagos from "./EvolucionPagos";
import EstadoDelPatio from "./EstadoDelPatio";
import DetalleKpi, { type TipoKpi } from "./DetalleKpi";
import DialogosPuesto, {
  useDialogosPuesto,
} from "@alquileres/_componentes/patio/DialogosPuesto";

/**
 * El dashboard del prototipo. Vive en el cliente porque las tarjetas de arriba
 * abren su detalle y la grilla del patio abre la ficha del puesto sin salir de
 * la pantalla.
 */
export default function Dashboard({
  puestos,
  metricas,
  zonas,
}: {
  puestos: PuestoCliente[];
  metricas: Metricas;
  zonas: { id: string; nombre: string }[];
}) {
  const dialogos = useDialogosPuesto();
  const [kpi, setKpi] = useState<TipoKpi | null>(null);

  return (
    /* El Inicio entra en una pantalla: la página no scrollea, y si algo no
       cabe —pantallas bajas— scrollea el panel por dentro. */
    <div className="animate-fade-in flex h-full min-h-0 flex-col gap-3">
      <TarjetasKpi metricas={metricas} onDetalle={setKpi} />

      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-3 xl:grid-cols-3">
        <div className="min-h-0 overflow-y-auto scrollbar-none xl:col-span-2">
          <EvolucionPagos metricas={metricas} />
        </div>
        <div className="flex flex-col xl:col-span-1">
          <EstadoDelPatio puestos={puestos} metricas={metricas} onSeleccionar={dialogos.verPuesto} />
        </div>
      </div>

      {kpi && (
        <DetalleKpi
          tipo={kpi}
          puestos={puestos}
          metricas={metricas}
          onCerrar={() => setKpi(null)}
          onSeleccionar={(p) => {
            setKpi(null);
            dialogos.verPuesto(p);
          }}
          onCobrar={(p) => {
            setKpi(null);
            dialogos.cobrar(p);
          }}
        />
      )}

      <DialogosPuesto control={dialogos} zonas={zonas} />
    </div>
  );
}
