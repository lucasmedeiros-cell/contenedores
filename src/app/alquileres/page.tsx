import { listaPuestos, listaZonas, metricas } from "@alquileres/_lib/datos";
import Dashboard from "@alquileres/_componentes/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const [puestos, m, zonas] = await Promise.all([listaPuestos(), metricas(), listaZonas()]);

  return (
    <Dashboard
      puestos={puestos}
      metricas={m}
      zonas={zonas.map((z) => ({ id: z.id, nombre: z.nombre }))}
    />
  );
}
