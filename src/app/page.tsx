import { redirect } from "next/navigation";

/**
 * La raíz manda al patio. Los dos negocios cuelgan de su propia ruta
 * —`/alquileres` y `/cerveza`— así que el sistema entero se publica como una
 * sola aplicación, sin un proceso por puerto.
 */
export default function Inicio() {
  redirect("/alquileres");
}
