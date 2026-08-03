"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Beer,
  BarChart3,
  Boxes,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { hora, plata } from "@/lib/format";
import { SelectorTema } from "@/components/tema";

const MENU = [
  { href: "/cerveza", etiqueta: "Resumen", icono: LayoutDashboard },
  { href: "/cerveza/venta", etiqueta: "Punto de Venta", icono: Beer },
  { href: "/cerveza/ventas", etiqueta: "Ventas", icono: Receipt },
  { href: "/cerveza/inventario", etiqueta: "Inventario", icono: Boxes },
  { href: "/cerveza/caja", etiqueta: "Caja", icono: Wallet },
  { href: "/cerveza/reportes", etiqueta: "Reportes", icono: BarChart3 },
  { href: "/cerveza/configuracion", etiqueta: "Configuración", icono: Settings },
];

export type CajaEnMenu = {
  nombre: string;
  abiertaEn: string;
  cobrado: number;
  ventas: number;
} | null;


/**
 * `startsWith` a secas marcaría "Punto de Venta" estando en "Ventas": las dos
 * rutas comparten prefijo.
 */
function esActivo(ruta: string, href: string) {
  return href === "/cerveza" ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
}

function Opciones({ ruta, alNavegar }: { ruta: string; alNavegar?: () => void }) {
  return (
    <>
      {MENU.map(({ href, etiqueta, icono: Icono }) => {
        const activo = esActivo(ruta, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={alNavegar}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-bold transition ${
              activo
                ? "bg-[#FFC200] text-black"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icono className="h-[18px] w-[18px]" />
            {etiqueta}
          </Link>
        );
      })}
    </>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFC200] text-black">
        <Beer className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] leading-tight font-black text-white">Cervecería</p>
        <p className="truncate text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
          Contenedores
        </p>
      </div>
    </div>
  );
}

/** Estado del turno de caja. Antes era un cartel fijo; ahora es el turno real. */
function TarjetaCaja({ caja }: { caja: CajaEnMenu }) {
  if (!caja) {
    return (
      <Link
        href="/cerveza/caja"
        className="block rounded-2xl border border-white/10 bg-black p-3 transition hover:border-[#FFC200]/40"
      >
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Caja</p>
        <p className="mt-1 text-[14px] font-black text-white">Sin turno abierto</p>
        <p className="text-[11.5px] text-zinc-500">Abrir para empezar a cobrar</p>
      </Link>
    );
  }

  return (
    <Link
      href="/cerveza/caja"
      className="block rounded-2xl border border-white/10 bg-black p-3 transition hover:border-[#FFC200]/40"
    >
      <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Caja activa</p>
      <p className="mt-1 text-[14px] font-black text-white">{caja.nombre}</p>
      <p className="text-[11.5px] text-zinc-500">
        Apertura {hora(caja.abiertaEn)} · {caja.ventas} ventas
      </p>
      <p className="tabular mt-1 text-[13px] font-black text-[#FFC200]">{plata(caja.cobrado)}</p>
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Abierta
      </p>
    </Link>
  );
}

export function BarraLateralCerveceria({ caja }: { caja: CajaEnMenu }) {
  const ruta = usePathname();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/10 bg-zinc-950 lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <Marca />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pt-2 pb-2 text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
          Menú Principal
        </p>
        <Opciones ruta={ruta} />
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <TarjetaCaja caja={caja} />
        <SelectorTema />
      </div>
    </aside>
  );
}

/**
 * El mismo menú, en cajón, para las pantallas donde la barra lateral no entra.
 * El POS se usa en tablet y en teléfono: sin esto, desde el celular no había
 * forma de salir del punto de venta.
 */
function MenuMovil({ caja }: { caja: CajaEnMenu }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Abrir el menú"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black text-zinc-400 transition hover:text-white lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="anim-aparecer absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />
          <div className="anim-escalar relative z-10 flex h-full w-[270px] flex-col border-r border-white/10 bg-zinc-950">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
              <Marca />
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar el menú"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <Opciones ruta={ruta} alNavegar={() => setAbierto(false)} />
            </nav>
            <div className="space-y-3 border-t border-white/10 p-3">
              <TarjetaCaja caja={caja} />
              <SelectorTema />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BarraSuperiorCerveceria({
  cajera,
  titulo,
  subtitulo,
  caja = null,
  accion,
}: {
  cajera: string;
  titulo: string;
  subtitulo: string;
  caja?: CajaEnMenu;
  accion?: React.ReactNode;
}) {
  const fecha = new Date().toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3 sm:px-6">
      <MenuMovil caja={caja} />
      <Link
        href="/cerveza"
        className="hidden items-center gap-2 rounded-full bg-[#FFC200] px-4 py-2 text-[13px] font-black text-black transition hover:brightness-110 sm:inline-flex"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Cajera</p>
        <h1 className="flex items-center gap-2 text-[17px] leading-tight font-black text-white">
          {titulo} <Beer className="h-4 w-4 text-[#FFC200]" />
        </h1>
        <p className="truncate text-[12px] text-zinc-500">{subtitulo}</p>
      </div>

      <div className="flex items-center gap-2">
        {accion}
        <Chip className="hidden lg:inline-flex">
          <CalendarDays className="h-4 w-4 text-zinc-500" />
          {fecha}
        </Chip>
        <Reloj />
        <Chip>
          <UserRound className="h-4 w-4 text-zinc-500" />
          Cajera: <span className="text-white">{cajera}</span>
        </Chip>
      </div>
    </header>
  );
}

function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`items-center gap-2 rounded-full border border-white/10 bg-black px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap text-zinc-300 ${className || "inline-flex"}`}
    >
      {children}
    </span>
  );
}

/**
 * La hora del turno. Se pinta recién montado el componente: si saliera del
 * servidor, el minuto del HTML y el del navegador no coincidirían.
 */
function Reloj() {
  const [ahora, setAhora] = useState<string | null>(null);

  useEffect(() => {
    const poner = () =>
      setAhora(
        new Date().toLocaleTimeString("es-BO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    poner();
    const id = setInterval(poner, 20_000);
    return () => clearInterval(id);
  }, []);

  if (!ahora) return null;

  return (
    <Chip className="hidden sm:inline-flex">
      <Clock className="h-4 w-4 text-zinc-500" />
      {ahora}
    </Chip>
  );
}
