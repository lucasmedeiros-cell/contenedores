import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { cajaDelMenu, turnoAbierto } from "@cerveza/_lib/datos";
import { BarraLateralCerveceria } from "@cerveza/_componentes/ShellCerveceria";
import DebugReporter from "@/components/DebugReporter";

/**
 * La cervecería es un sistema aparte del de alquileres: comparte la sesión pero
 * no el menú ni la barra superior, para que cada uno se navegue por su lado.
 */
export default async function LayoutCerveceria({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (!sesion) redirect("/ingresar");

  const turno = await turnoAbierto();

  return (
    <div className="flex h-dvh overflow-hidden bg-black">
      <BarraLateralCerveceria
        caja={cajaDelMenu(turno)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      {/* Igual que en el patio: sin key de Tickets, el botón no se muestra. */}
      {process.env.TICKETS_API_KEY && <DebugReporter surface="crm" />}
    </div>
  );
}
