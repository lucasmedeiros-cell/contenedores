"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { Resultado } from "@/lib/tipos";
import { Campo } from "@/components/ui";

/**
 * Lo propio de las pantallas de la barra: tarjetas negras de borde fino, ámbar
 * para lo que importa.
 *
 * El modal, el campo de formulario, el aviso de error y el estado vacío eran
 * copias de los del patio y ahora viven en `@/components/ui`; el formato de
 * plata, litros y horas, en `@/lib/format`.
 */

/**
 * Corre una acción del servidor mostrando el error si falla y refrescando la
 * pantalla si sale bien. El `router.refresh()` es lo que hace que el stock y
 * la caja se actualicen sin recargar a mano: la acción invalida el caché del
 * servidor, pero la vista ya montada hay que volver a pedirla.
 */
export function useAccion() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [, transicion] = useTransition();

  async function correr<T>(
    accion: () => Promise<Resultado<T>>,
    alSalirBien?: (datos?: T) => void,
  ): Promise<boolean> {
    setOcupado(true);
    setError(null);
    try {
      const res = await accion();
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      alSalirBien?.(res.datos);
      transicion(() => router.refresh());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la operación.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  return { correr, error, setError, ocupado };
}

// ---------------------------------------------------------------------------

export function TarjetaBar({
  etiqueta,
  valor,
  pie,
  icono,
  tono = "marca",
}: {
  etiqueta: string;
  valor: ReactNode;
  pie?: ReactNode;
  icono?: ReactNode;
  tono?: "marca" | "alerta" | "apagado";
}) {
  const fondo =
    tono === "alerta"
      ? "bg-rose-500 text-white"
      : tono === "apagado"
        ? "bg-white/10 text-zinc-300"
        : "bg-[#FFC200] text-black";

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 transition hover:border-[#FFC200]/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
            {etiqueta}
          </p>
          <p className="tabular mt-1 truncate text-3xl font-black text-white">{valor}</p>
          {pie && <p className="text-[12px] text-zinc-600">{pie}</p>}
        </div>
        {icono && (
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${fondo}`}>
            {icono}
          </span>
        )}
      </div>
    </div>
  );
}

export function Seccion({
  titulo,
  accion,
  children,
  className = "",
  pegajosa = false,
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Deja el título clavado arriba mientras se scrollea el contenido. */
  pegajosa?: boolean;
}) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-zinc-950 ${className}`}>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3.5 ${
          pegajosa
            ? // El `before` tapa el respiro que deja el padding de la página:
              // sin él, las filas se ven pasar por encima del título clavado.
              "sticky top-0 z-20 rounded-t-3xl bg-zinc-950 before:absolute before:inset-x-0 before:bottom-full before:h-7 before:bg-black before:content-['']"
            : ""
        }`}
      >
        <h2 className="text-[13px] font-bold tracking-widest text-zinc-400 uppercase">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function BotonBar({
  children,
  onClick,
  tipo = "marca",
  ocupado = false,
  deshabilitado = false,
  submit = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "marca" | "fantasma" | "peligro";
  ocupado?: boolean;
  deshabilitado?: boolean;
  submit?: boolean;
  className?: string;
}) {
  const estilos = {
    marca: "bg-[#FFC200] text-black hover:brightness-110",
    fantasma: "border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10",
    peligro: "border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
  }[tipo];

  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={deshabilitado || ocupado}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-black transition active:scale-[.97] disabled:opacity-40 ${estilos} ${className}`}
    >
      {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Botón de una tira de opciones excluyentes. Se ve igual en toda la barra. */
function Pastilla({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`rounded-2xl border px-3.5 py-2 text-[12.5px] font-bold transition ${
        activa
          ? "border-[#FFC200] bg-[#FFC200]/15 text-[#FFC200]"
          : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Buscador con filtros al lado, la cabecera de las pantallas de listado
 * (ventas y movimientos la tenían escrita igual las dos).
 */
export function Buscador<T extends string>({
  valor,
  onBuscar,
  marcador,
  filtros,
  activo,
  onFiltrar,
  accion,
}: {
  valor: string;
  onBuscar: (v: string) => void;
  marcador: string;
  filtros: { clave: T; etiqueta: string }[];
  activo: T;
  onFiltrar: (c: T) => void;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-600" />
        <input
          className="campo pl-9"
          placeholder={marcador}
          value={valor}
          onChange={(e) => onBuscar(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtros.map((f) => (
          <Pastilla key={f.clave} activa={activo === f.clave} onClick={() => onFiltrar(f.clave)}>
            {f.etiqueta}
          </Pastilla>
        ))}
      </div>
      {accion}
    </div>
  );
}

/** Cómo se cobra, en el punto de venta. */
export function SelectorMetodo({
  metodos,
  valor,
  onElegir,
}: {
  metodos: string[];
  valor: string;
  onElegir: (m: string) => void;
}) {
  return (
    <Campo etiqueta="Método de cobro">
      <div className="grid grid-cols-2 gap-2">
        {metodos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onElegir(m)}
            aria-pressed={valor === m}
            className={`rounded-2xl border px-3 py-2.5 text-[13px] font-black transition ${
              valor === m
                ? "border-[#FFC200] bg-[#FFC200]/15 text-[#FFC200]"
                : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </Campo>
  );
}

/** La casilla de activo/inactivo, igual en categorías y en productos. */
export function CasillaActivo({
  nombre,
  marcada,
}: {
  nombre: string;
  marcada: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-[13px] font-bold text-zinc-200">
      <input
        type="checkbox"
        name={nombre}
        defaultChecked={marcada}
        className="h-4 w-4 accent-[#FFC200]"
      />
      Se muestra en el punto de venta
    </label>
  );
}

/** El par de botones con que terminan todos los formularios del bar. */
export function PieFormulario({
  onCerrar,
  children,
}: {
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
      {children}
      <BotonBar tipo="fantasma" onClick={onCerrar}>
        Cancelar
      </BotonBar>
    </div>
  );
}

/** Etiqueta de estado de una venta. */
export function ChipEstado({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    COMPLETADA: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    ABIERTA: "border-[#FFC200]/40 bg-[#FFC200]/10 text-[#FFC200]",
    ANULADA: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  };
  const texto: Record<string, string> = {
    COMPLETADA: "Cobrada",
    ABIERTA: "Abierta",
    ANULADA: "Anulada",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${
        estilos[estado] ?? "border-white/10 bg-white/5 text-zinc-400"
      }`}
    >
      {texto[estado] ?? estado}
    </span>
  );
}
