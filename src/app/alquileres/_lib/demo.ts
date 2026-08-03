import "server-only";

import { prisma } from "@/lib/prisma";
import { sembrarPatio } from "../../../../prisma/datos/patio";

/**
 * Deja el patio como el juego de datos original. Es lo que hace el botón
 * "Restablecer Demo" del menú. No toca usuarios, zonas ni configuración: eso lo
 * arma el seed, que sí las crea.
 */
export async function sembrarDemo() {
  const admin = await prisma.usuario.findFirst({ where: { rol: "ADMIN" } });
  await sembrarPatio(prisma, { registradoPor: admin?.id ?? null });
}
