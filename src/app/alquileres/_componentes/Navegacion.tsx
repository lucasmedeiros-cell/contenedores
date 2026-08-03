"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  ChartNoAxesCombined,
  Container,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  RotateCcw,
  Store,
  Users,
  X,
} from "lucide-react";
import { salir } from "@/app/(auth)/ingresar/acciones";
import { restablecerDemo } from "@alquileres/acciones";

type Enlace = {
  href: string;
  etiqueta: string;
  icono: ComponentType<{ className?: string }>;
};

/**
 * Las entradas del prototipo, con sus mismos nombres. "Historial de Pagos"
 * salió del menú a pedido del cliente; la pantalla sigue viva en `/historial`.
 */
const ENLACES: Enlace[] = [
  { href: "/alquileres", etiqueta: "Inicio", icono: LayoutDashboard },
  { href: "/alquileres/plano", etiqueta: "Plano del Patio", icono: Map },
  { href: "/alquileres/puestos", etiqueta: "Gestión de Puestos", icono: Store },
  { href: "/alquileres/pagos", etiqueta: "Evolución de Pagos", icono: ChartNoAxesCombined },
  { href: "/alquileres/arrendatarios", etiqueta: "Directorio Clientes", icono: Users },
];

function esActivo(pathname: string, href: string) {
  return href === "/alquileres" ? pathname === href : pathname.startsWith(href);
}

// ---------------------------------------------------------------------------

function Contenido({
  pathname,
  onNavegar,
}: {
  pathname: string;
  onNavegar?: () => void;
}) {
  const [reiniciando, setReiniciando] = useState(false);

  async function reiniciar() {
    if (!confirm("¿Restablecer todos los datos del patio a los puestos iniciales de la demo?")) return;
    setReiniciando(true);
    await restablecerDemo();
    location.reload();
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFC200] to-[#E6B000] font-black text-black shadow-lg shadow-[#FFC200]/25">
            <Container className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base leading-tight font-black tracking-tight text-white">
              Patio<span className="text-[#FFC200]">Admin</span>
            </h1>
            <p className="text-[10px] font-bold tracking-wider text-[#FFC200]/90 uppercase">
              Patio de Comidas
            </p>
          </div>
        </div>

        <nav className="space-y-1.5 p-3">
          <div className="px-3.5 py-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
            Menú Principal
          </div>
          {ENLACES.map((e) => {
            const activo = esActivo(pathname, e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                onClick={onNavegar}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-bold transition-all duration-200 ${
                  activo
                    ? "bg-[#FFC200] text-black shadow-lg shadow-[#FFC200]/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <e.icono className="h-4 w-4" />
                <span>{e.etiqueta}</span>
              </Link>
            );
          })}
        </nav>

      </div>

      <div className="space-y-2.5 border-t border-white/10 bg-black/60 p-4">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px] font-medium">Estado del Patio</span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#FFC200]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FFC200]" />
            En Línea
          </span>
        </div>

        <button
          onClick={reiniciar}
          disabled={reiniciando}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-400 transition-all hover:bg-white/10 hover:text-[#FFC200]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {reiniciando ? "Restableciendo…" : "Restablecer Demo"}
        </button>

        <form action={salir}>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-400 transition-all hover:bg-white/10 hover:text-rose-400">
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

export function BarraLateral() {
  const pathname = usePathname();
  return (
    <aside className="no-imprimir hidden w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl backdrop-blur-2xl select-none lg:flex">
      <Contenido pathname={pathname} />
    </aside>
  );
}

export function BarraMovil() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className="no-imprimir sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFC200] to-[#E6B000] text-black">
            <Container className="h-4 w-4 stroke-[2.5]" />
          </div>
          <h1 className="text-sm font-black tracking-tight text-white">
            Patio<span className="text-[#FFC200]">Admin</span>
          </h1>
        </div>
        <button
          onClick={() => setAbierto(true)}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300"
          aria-label="Menú"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {abierto && (
        <div className="no-imprimir fixed inset-0 z-50 lg:hidden">
          <div
            className="anim-aparecer absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />
          <aside className="absolute top-0 left-0 flex h-full w-64 flex-col justify-between border-r border-white/10 bg-zinc-950 shadow-2xl">
            <button
              onClick={() => setAbierto(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-zinc-500"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <Contenido pathname={pathname} onNavegar={() => setAbierto(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
