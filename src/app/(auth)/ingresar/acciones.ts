"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cerrarSesion, crearSesion } from "@/lib/auth";

const esquema = z.object({
  usuario: z.string().trim().min(1, "Ingresá tu usuario").toLowerCase(),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type EstadoIngreso = { error?: string };

export async function ingresar(
  _previo: EstadoIngreso,
  datos: FormData,
): Promise<EstadoIngreso> {
  const parseado = esquema.safeParse({
    usuario: datos.get("usuario"),
    password: datos.get("password"),
  });
  if (!parseado.success) return { error: parseado.error.issues[0].message };

  let usuario;
  try {
    usuario = await prisma.usuario.findUnique({ where: { email: parseado.data.usuario } });
  } catch {
    return { error: "No se pudo conectar con la base de datos. Revisá DATABASE_URL." };
  }

  if (!usuario || !usuario.activo) return { error: "Usuario o contraseña incorrectos" };

  const valida = await bcrypt.compare(parseado.data.password, usuario.passwordHash);
  if (!valida) return { error: "Usuario o contraseña incorrectos" };

  await crearSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  });

  redirect("/alquileres");
}

export async function salir() {
  await cerrarSesion();
  redirect("/ingresar");
}
