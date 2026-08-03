import { inventario } from "@cerveza/_lib/datos";
import Inventario from "@cerveza/_componentes/Inventario";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";

export const metadata = { title: "Inventario · Cervecería" };

export default async function PaginaInventario() {
  const datos = await inventario();

  return (
    <>
      <EncabezadoBar
        titulo="Inventario"
        subtitulo={
          datos.faltantes > 0
            ? `${datos.faltantes} producto(s) por debajo del mínimo`
            : "Todo el stock por encima del mínimo"
        }
      />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Inventario
          datos={datos}
          categorias={datos.categorias
            .filter((c) => c.activa)
            .map((c) => ({ id: c.id, nombre: c.nombre }))}
        />
      </main>
    </>
  );
}
