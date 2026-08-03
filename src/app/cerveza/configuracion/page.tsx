import { METODOS_PAGO, inventario } from "@cerveza/_lib/datos";
import Configuracion from "@cerveza/_componentes/Configuracion";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";

export const metadata = { title: "Configuración · Cervecería" };

export default async function PaginaConfiguracion() {
  const datos = await inventario();

  return (
    <>
      <EncabezadoBar titulo="Configuración" subtitulo="Categorías del POS y formas de cobro" />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Configuracion categorias={datos.categorias} metodos={METODOS_PAGO} />
      </main>
    </>
  );
}
