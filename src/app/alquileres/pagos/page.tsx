import { listaPuestos, listaZonas } from "@alquileres/_lib/datos";
import Pagos from "@alquileres/_componentes/pagos/Pagos";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const [puestos, zonas] = await Promise.all([listaPuestos(), listaZonas()]);
  return <Pagos puestos={puestos} zonas={zonas.map((z) => ({ id: z.id, nombre: z.nombre }))} />;
}
