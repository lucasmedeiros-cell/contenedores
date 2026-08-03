import { catalogoCerveceria } from "@cerveza/_lib/datos";
import PuntoDeVenta from "@cerveza/_componentes/PuntoDeVenta";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";

export const metadata = { title: "Punto de Venta · Cervecería" };

export default async function PaginaVenta() {
  const catalogo = await catalogoCerveceria();

  return (
    <>
      <EncabezadoBar titulo="Punto de Venta" subtitulo="Vende y registra tus chops" />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <PuntoDeVenta catalogo={catalogo} />
      </main>
    </>
  );
}
