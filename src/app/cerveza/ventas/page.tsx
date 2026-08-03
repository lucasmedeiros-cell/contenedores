import { listaVentas } from "@cerveza/_lib/datos";
import HistorialVentas from "@cerveza/_componentes/HistorialVentas";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";

export const metadata = { title: "Ventas · Cervecería" };

export default async function PaginaVentas() {
  const ventas = await listaVentas(7);

  return (
    <>
      <EncabezadoBar
        titulo="Ventas"
        subtitulo={`${ventas.length} tickets en los últimos 7 días`}
      />
      {/* Sin scroll acá: el que se desplaza es el listado, para que el buscador
          y los filtros queden siempre a la vista. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
        <HistorialVentas ventas={ventas} />
      </main>
    </>
  );
}
