import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import FormularioIngreso from "./FormularioIngreso";

export const metadata = { title: "Ingresar · Contenedores" };

export default async function PaginaIngreso() {
  const sesion = await getSesion();
  if (sesion) redirect("/alquileres");
  return <FormularioIngreso />;
}
