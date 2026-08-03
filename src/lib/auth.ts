import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Rol } from "@prisma/client";

const COOKIE = "contenedores_session";
const MAX_AGE = 60 * 60 * 12; // 12 horas

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("Falta AUTH_SECRET en el entorno");
  return new TextEncoder().encode(value);
}

export async function crearSesion(usuario: Sesion) {
  const token = await new SignJWT({ ...usuario })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // En la LAN servimos por HTTP plano: una cookie Secure no la guardaría
    // el navegador. COOKIE_INSECURE=1 la desactiva para ese caso.
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function cerrarSesion() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Devuelve la sesión activa o null. Nunca lanza. */
export async function getSesion(): Promise<Sesion | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      nombre: String(payload.nombre),
      email: String(payload.email),
      rol: payload.rol as Rol,
    };
  } catch {
    return null;
  }
}

/** Igual que getSesion pero lanza si no hay sesión. Para server actions. */
export async function requerirSesion(): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) throw new Error("No autorizado");
  return sesion;
}
