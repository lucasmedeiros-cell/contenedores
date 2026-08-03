"use client";

import { useEffect, type ReactNode } from "react";
import { Search, X } from "lucide-react";

/**
 * Las piezas que comparten los dos sistemas. Antes cada uno tenía su propia
 * copia —`Marco` en el patio, `Ventana` en la barra— y se fueron separando:
 * la del patio cerraba con Escape y la de la barra no, la del patio bloqueaba
 * el scroll del fondo y la de la barra tampoco. Ahora es una sola.
 */

// ---------------------------------------------------------------------------

export function Modal({
  abierta = true,
  onCerrar,
  titulo,
  bajada,
  children,
  pie,
  ancho = "max-w-lg",
}: {
  /** Para quien la monta siempre y la muestra con una bandera. */
  abierta?: boolean;
  onCerrar: () => void;
  titulo: string;
  bajada?: string;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    if (!abierta) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  return (
    /* Las clases `modal-*` no pintan nada: las usa el `@media print` de
       `globals.css` para desarmar el diálogo al imprimir un comprobante. Sin
       eso, la altura máxima y el `overflow` del panel cortan el papel a la
       mitad. */
    <div className="modal-capa fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="anim-aparecer absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCerrar}
      />
      <div
        className={`modal-panel anim-hoja sm:anim-escalar relative z-10 flex max-h-[92vh] w-full ${ancho} flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-tight text-white">{titulo}</h2>
            {bajada && <p className="mt-0.5 text-[11px] text-zinc-400">{bajada}</p>}
          </div>
          <button
            onClick={onCerrar}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-cuerpo min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {pie && <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">{pie}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Campo({
  etiqueta,
  ayuda,
  children,
  className = "",
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
        {etiqueta}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-zinc-600">{ayuda}</span>}
    </label>
  );
}

/** El error de una acción, con el mismo tono en las dos aplicaciones. */
export function Aviso({ mensaje }: { mensaje: string | null | undefined }) {
  if (!mensaje) return null;
  return (
    <p className="anim-aparecer rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
      {mensaje}
    </p>
  );
}

export function Vacio({
  icono,
  titulo,
  bajada,
  accion,
}: {
  icono: ReactNode;
  titulo: string;
  bajada?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 grid h-14 w-14 place-items-center rounded-2xl border border-[#FFC200]/25 bg-[#FFC200]/10 text-[#FFC200]">
        {icono}
      </span>
      <p className="font-bold text-zinc-200">{titulo}</p>
      {bajada && <p className="max-w-sm text-[13px] text-zinc-500">{bajada}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

/** Caja de búsqueda con lupa. La usan el patio y el historial de cobros. */
export function CampoBusqueda({
  valor,
  onBuscar,
  marcador = "Buscar…",
  className = "",
}: {
  valor: string;
  onBuscar: (v: string) => void;
  marcador?: string;
  className?: string;
}) {
  return (
    <div className={`relative min-w-44 flex-1 ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
      <input
        className="campo !py-1.5 pl-9 text-xs"
        placeholder={marcador}
        value={valor}
        onChange={(e) => onBuscar(e.target.value)}
      />
    </div>
  );
}
