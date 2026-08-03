import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * Piezas que comparten las server actions de los dos sistemas. Van acá y no
 * dentro de un archivo `"use server"` porque ahí solo pueden exportarse
 * funciones async.
 */

import type { Resultado } from "./tipos";

export type { Resultado };

/** Traduce al castellano lo que puede fallar al escribir en la base. */
export function fallo(e: unknown): { ok: false; error: string } {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "Ya existe un registro con esos datos." };
    if (e.code === "P2003") return { ok: false, error: "El registro está vinculado a otros datos." };
  }
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
  return { ok: false, error: e instanceof Error ? e.message : "Ocurrió un error inesperado" };
}

/**
 * El envoltorio de toda server action: corre el cuerpo, traduce cualquier
 * fallo a `Resultado` y, si salió bien, invalida el caché.
 *
 * Las veintiocho acciones del sistema repetían el mismo `try / catch / return
 * fallo(e)`. Para cortar con un error de negocio —"esa mesa ya tiene una
 * comanda abierta"— alcanza con lanzarlo: `fallo()` usa el mensaje tal cual.
 */
export async function accion<T = undefined>(
  /** Devuelve los datos del resultado, o nada si la acción no informa nada. */
  cuerpo: () => Promise<T>,
  alTerminar?: () => void,
  // Un cuerpo sin `return` da `void`; hacia afuera eso es "sin datos".
): Promise<Resultado<T extends void ? undefined : T>> {
  type Datos = T extends void ? undefined : T;
  try {
    const datos = (await cuerpo()) as Datos | undefined;
    alTerminar?.();
    return { ok: true, datos };
  } catch (e) {
    return fallo(e);
  }
}

/** Decimal de dos posiciones, que es como guarda la base todos los montos. */
export const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));

/** Dos decimales, para no arrastrar 0.30000000000000004 litros. */
export const redondear = (n: number) => Math.round(n * 100) / 100;
