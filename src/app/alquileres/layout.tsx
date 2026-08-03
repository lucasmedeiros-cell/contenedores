import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { listaPuestos } from "@alquileres/_lib/datos";
import { BarraLateral, BarraMovil } from "@alquileres/_componentes/Navegacion";
import SplashContenedor from "@alquileres/_componentes/SplashContenedor";
import BarraSuperior from "@alquileres/_componentes/BarraSuperior";
import DebugReporter from "@/components/DebugReporter";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (!sesion) redirect("/ingresar");

  // La campana de la barra superior lista los puestos por cobrar, y cada uno
  // entra al detalle de ese puesto.
  const puestos = await listaPuestos();
  const avisos = puestos
    .filter((p) => p.estado === "PENDIENTE")
    .map((p) => ({
      id: p.id,
      numero: p.numero,
      negocio: p.arrendatario?.negocio ?? "Sin arrendatario",
      monto: p.arrendatario?.montoAcordado ?? p.precioBase,
      vencimiento: p.arrendatario?.proximoVencimiento ?? "",
    }));

  return (
    <div className="flex h-dvh overflow-hidden bg-black">
      <SplashContenedor />
      <BarraLateral />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraMovil />
        <BarraSuperior usuario={sesion.nombre} avisos={avisos} />
        <main className="scrollbar-thin scrollbar-thumb-zinc-800 min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      {/* Sin `TICKETS_API_KEY` el endpoint responde 503, así que el botón no
          tendría a dónde reportar: en la laptop de demostración, sin internet
          ni key, directamente no se muestra. */}
      {process.env.TICKETS_API_KEY && <DebugReporter surface="crm" />}
    </div>
  );
}
