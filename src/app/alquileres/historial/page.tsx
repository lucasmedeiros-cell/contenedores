import { listaPuestos } from "@alquileres/_lib/datos";
import Historial from "@alquileres/_componentes/patio/Historial";

export const dynamic = "force-dynamic";

export default async function PaginaHistorial() {
  const puestos = await listaPuestos();
  return <Historial puestos={puestos} />;
}
