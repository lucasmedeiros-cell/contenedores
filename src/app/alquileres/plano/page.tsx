import { datosPlano, listaPuestos, listaZonas } from "@alquileres/_lib/datos";
import Patio from "@alquileres/_componentes/patio/Patio";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const [puestos, zonas, plano] = await Promise.all([
    listaPuestos(),
    listaZonas(),
    datosPlano(),
  ]);

  return (
    <Patio
      vista="plano"
      puestos={puestos}
      zonas={zonas.map((z) => ({ id: z.id, nombre: z.nombre }))}
      plano={plano}
    />
  );
}
