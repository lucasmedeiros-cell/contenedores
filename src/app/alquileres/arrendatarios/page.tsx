import { listaPuestos, listaZonas } from "@alquileres/_lib/datos";
import Patio from "@alquileres/_componentes/patio/Patio";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const [puestos, zonas] = await Promise.all([listaPuestos(), listaZonas()]);
  return (
    <Patio
      vista="arrendatarios"
      puestos={puestos}
      zonas={zonas.map((z) => ({ id: z.id, nombre: z.nombre }))}
    />
  );
}
