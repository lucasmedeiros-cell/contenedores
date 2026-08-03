import { historialCajas, turnoAbierto } from "@cerveza/_lib/datos";
import Caja from "@cerveza/_componentes/Caja";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";

export const metadata = { title: "Caja · Cervecería" };

export default async function PaginaCaja() {
  const [turno, historial] = await Promise.all([turnoAbierto(), historialCajas()]);

  return (
    <>
      <EncabezadoBar
        titulo="Caja"
        subtitulo={turno ? `${turno.nombre} abierta` : "Sin turno abierto"}
      />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Caja turno={turno} historial={historial} />
      </main>
    </>
  );
}
