import type { ReactNode } from "react";
import { getSesion } from "@/lib/auth";
import { cajaDelMenu, turnoAbierto } from "@cerveza/_lib/datos";
import { BarraSuperiorCerveceria } from "@cerveza/_componentes/ShellCerveceria";

/**
 * Encabezado de todas las pantallas del bar. Resuelve solo la sesión y el
 * turno de caja —los dos están cacheados y deduplicados— para que cada página
 * no tenga que arrastrarlos.
 */
export async function EncabezadoBar({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: string;
  subtitulo: string;
  accion?: ReactNode;
}) {
  const [sesion, turno] = await Promise.all([getSesion(), turnoAbierto()]);

  return (
    <BarraSuperiorCerveceria
      cajera={sesion?.nombre ?? "Cajera"}
      titulo={titulo}
      subtitulo={subtitulo}
      caja={cajaDelMenu(turno)}
      accion={accion}
    />
  );
}
