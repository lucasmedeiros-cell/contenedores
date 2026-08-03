"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Container, LogIn } from "lucide-react";
import { ingresar, type EstadoIngreso } from "./acciones";

export default function FormularioIngreso() {
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, {});
  const [usuario, setUsuario] = useState("admin");
  const [clave, setClave] = useState("1234");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4 text-zinc-100 select-none">
      <Image
        src="/contenedor.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FFC200] to-[#E6B000] text-black shadow-2xl shadow-[#FFC200]/30">
            <Container className="h-8 w-8 stroke-[2.5]" />
          </div>
          <Image
            src="/logo-easypay.png"
            alt="easy pay · Alquileres"
            width={150}
            height={150}
            priority
            className="drop-shadow-[0_0_36px_rgba(255,194,0,.35)]"
            style={{ mixBlendMode: "screen" }}
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/85 p-6 shadow-2xl shadow-black/90 backdrop-blur-2xl">
          <h1 className="text-center text-xl font-black tracking-tight text-white">Iniciar Sesión</h1>
          <p className="mt-1 mb-5 text-center text-xs text-zinc-400">
            Ingresa tus credenciales para acceder al panel
          </p>

          <form action={accion} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Usuario
              </span>
              <input
                name="usuario"
                type="text"
                autoComplete="username"
                placeholder="admin"
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#FFC200]/60"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Contraseña
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••"
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#FFC200]/60"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </label>

            {estado.error && (
              <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {estado.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pendiente}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC200] py-3 text-sm font-black text-black shadow-lg shadow-[#FFC200]/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {pendiente ? (
                <>
                  <span className="anim-girar h-4 w-4 rounded-full border-2 border-black/25 border-t-black" />
                  Ingresando…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Ingresar al Sistema
                </>
              )}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 p-3 text-center">
            <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
              Acceso Demo de Prueba
            </p>
            <p className="mt-1 text-xs text-zinc-300">
              Usuario: <span className="font-bold text-[#FFC200]">admin</span> · Clave:{" "}
              <span className="font-bold text-[#FFC200]">1234</span>
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-zinc-600">easy pay · Alquileres — v6</p>
      </div>
    </main>
  );
}
