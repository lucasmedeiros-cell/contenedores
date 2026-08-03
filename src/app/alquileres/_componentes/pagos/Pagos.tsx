"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CircleDollarSign,
  Layers,
  Receipt,
  User,
  Wallet,
} from "lucide-react";
import type { PuestoCliente } from "@alquileres/_lib/datos";
import { diasHasta } from "@alquileres/_lib/estados";
import { fecha as fmtFecha, plata } from "@/lib/format";
import { Vacio } from "@/components/ui";
import DialogosPuesto, {
  useDialogosPuesto,
} from "@alquileres/_componentes/patio/DialogosPuesto";

type Filtro = "pagados" | "porcobrar" | "todos";

const TEXTOS: Record<Filtro, { titulo: string; sub: string }> = {
  todos: { titulo: "Todos los pagos", sub: "Historial completo de movimientos del patio" },
  pagados: { titulo: "Pagos cobrados", sub: "Comprobantes ya registrados como cobrados" },
  porcobrar: {
    titulo: "Comercios por cobrar",
    sub: "Comercios con pagos pendientes de este período",
  },
};

const GAMA = {
  emerald: {
    icono: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    anillo: "border-emerald-500/60 ring-2 ring-emerald-500/40",
    valor: "text-emerald-400",
  },
  gold: {
    icono: "bg-[#FFC200]/20 text-[#FFC200] border-[#FFC200]/40",
    anillo: "border-[#FFC200]/60 ring-2 ring-[#FFC200]/40",
    valor: "text-[#FFC200]",
  },
  blue: {
    icono: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    anillo: "border-blue-500/60 ring-2 ring-blue-500/40",
    valor: "text-white",
  },
} as const;

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/** El número que se muestra en la chapita redonda de cada tarjeta. */
function chapa(numero: string) {
  return numero.replace(/\D/g, "") || numero.slice(0, 2);
}

/**
 * "Evolución de Pagos" del prototipo: tres tarjetas que filtran el listado de
 * abajo —lo cobrado, lo que falta cobrar y todos los movimientos juntos—.
 */
export default function Pagos({
  puestos,
  zonas,
}: {
  puestos: PuestoCliente[];
  zonas: { id: string; nombre: string }[];
}) {
  const dialogos = useDialogosPuesto();
  /**
   * Arranca en lo que pida la URL. La tarjeta "Por Cobrar" del dashboard entra
   * con `?ver=porcobrar` y cae directo en "Comercios por cobrar", con su botón
   * de cobrar en cada tarjeta, en vez de dejar al operador buscándolos entre
   * todos los movimientos.
   */
  const params = useSearchParams();
  const inicial = params.get("ver");
  const [filtro, setFiltro] = useState<Filtro>(
    inicial === "porcobrar" || inicial === "pagados" ? inicial : "todos",
  );

  /**
   * `?puesto=` abre la ficha de ese puesto al entrar: es con lo que la campana
   * de la barra manda a cada aviso a su detalle. Se dispara una vez por id,
   * para que cerrar la ficha no la vuelva a abrir.
   */
  const pedido = params.get("puesto");
  const abierto = useRef<string | null>(null);
  useEffect(() => {
    if (!pedido || abierto.current === pedido) return;
    const p = puestos.find((x) => x.id === pedido);
    if (!p) return;
    abierto.current = pedido;
    dialogos.verPuesto(p);
  }, [pedido, puestos, dialogos]);

  const pendientes = useMemo(() => puestos.filter((p) => p.estado === "PENDIENTE"), [puestos]);

  const porCobrar = useMemo(
    () => pendientes.reduce((s, p) => s + (p.arrendatario?.montoAcordado ?? p.precioBase), 0),
    [pendientes],
  );

  const movimientos = useMemo(
    () =>
      puestos
        .flatMap((p) => p.historialPagos.map((g) => ({ puesto: p, pago: g })))
        .sort((a, b) => +new Date(b.pago.fecha) - +new Date(a.pago.fecha)),
    [puestos],
  );

  const cobrados = useMemo(
    () => movimientos.filter((m) => m.pago.estado === "COBRADO"),
    [movimientos],
  );
  const totalCobrado = useMemo(() => cobrados.reduce((s, m) => s + m.pago.monto, 0), [cobrados]);
  const totalMovimientos = useMemo(
    () => movimientos.reduce((s, m) => s + m.pago.monto, 0),
    [movimientos],
  );

  const tarjetas = [
    {
      id: "pagados" as const,
      etiqueta: "Cobrado",
      valor: totalCobrado,
      detalle: `${cobrados.length} ${plural(cobrados.length, "pago cobrado", "pagos cobrados")}`,
      Icono: CheckCircle2,
      gama: "emerald" as const,
    },
    {
      id: "porcobrar" as const,
      etiqueta: "Por cobrar",
      valor: porCobrar,
      detalle: `${pendientes.length} ${plural(pendientes.length, "comercio pendiente", "comercios pendientes")}`,
      Icono: AlertTriangle,
      gama: "gold" as const,
    },
    {
      id: "todos" as const,
      etiqueta: "Todos los pagos",
      valor: totalMovimientos,
      detalle: `${movimientos.length} ${plural(movimientos.length, "movimiento", "movimientos")}`,
      Icono: Layers,
      gama: "blue" as const,
    },
  ];

  const lista = filtro === "pagados" ? cobrados : movimientos;
  const textos = TEXTOS[filtro];

  return (
    <div className="animate-fade-in space-y-6">
      {/* ---------------- Tarjetas que filtran ---------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map((t) => {
          const activa = filtro === t.id;
          const g = GAMA[t.gama];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFiltro(t.id)}
              className={`panel border p-5 text-left transition-all duration-200 active:scale-[0.99] ${
                activa ? g.anillo : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  {t.etiqueta}
                </span>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${g.icono}`}
                >
                  <t.Icono className="h-5 w-5 stroke-[2.5]" />
                </span>
              </div>
              <div className={`text-2xl font-black tracking-tight ${g.valor}`}>{plata(t.valor)}</div>
              <p className="mt-1 text-xs text-zinc-500">{t.detalle}</p>
              {activa && (
                <span className="mt-2 block text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  ● Filtro activo
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------- Listado ---------------- */}
      <div className="panel p-5">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 text-[#FFC200]">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">{textos.titulo}</h2>
              <p className="text-[11px] text-zinc-500">{textos.sub}</p>
            </div>
          </div>
          <Link
            href="/alquileres/historial"
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10"
          >
            <Receipt className="h-3.5 w-3.5" /> Ver historial de pagos
          </Link>
        </div>

        {filtro === "porcobrar" ? (
          pendientes.length === 0 ? (
            <Vacio
              icono={<CheckCircle2 className="h-6 w-6" />}
              titulo="¡Todo al día!"
              bajada="No hay comercios con pagos pendientes en este momento."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {pendientes.map((p) => {
                const monto = p.arrendatario?.montoAcordado ?? p.precioBase;
                const vence = p.arrendatario?.proximoVencimiento ?? "";
                const dias = vence ? diasHasta(vence) : 0;
                const enMora = dias < 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-2xl border border-[#FFC200]/25 bg-black/40 p-4 transition hover:border-[#FFC200]/50"
                  >
                    <div
                      onClick={() => dialogos.verPuesto(p)}
                      className="flex cursor-pointer items-start gap-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FFC200]/40 bg-[#FFC200]/15 text-sm font-black text-[#FFC200]">
                        {chapa(p.numero)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-white">
                          {p.arrendatario?.negocio ?? p.numero}
                        </h3>
                        <p className="flex items-center gap-1 truncate text-[11px] text-zinc-500">
                          <User className="h-3 w-3 shrink-0" />
                          Titular: {p.arrendatario?.nombre ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-[11px]">
                      <p className="flex items-center gap-1.5 text-zinc-400">
                        <Calendar className="h-3 w-3 shrink-0" />
                        Vence: <strong className="text-zinc-200">{vence ? fmtFecha(vence) : "—"}</strong>
                      </p>
                      <p
                        className={`flex items-center gap-1.5 font-bold ${enMora ? "text-rose-400" : "text-[#FFC200]"}`}
                      >
                        <Clock className="h-3 w-3 shrink-0" />
                        {enMora
                          ? `${Math.abs(dias)} ${plural(Math.abs(dias), "día", "días")} de atraso`
                          : `Vence en ${dias} ${plural(dias, "día", "días")}`}
                      </p>
                      <div className="flex items-baseline justify-between gap-2 pt-1">
                        <span className="text-[10px] tracking-wider text-zinc-500 uppercase">
                          Monto adeudado
                        </span>
                        <span className="text-base font-black text-[#FFC200]">{plata(monto)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                      <span
                        className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                          enMora
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                            : "border-[#FFC200]/40 bg-[#FFC200]/15 text-[#FFC200]"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {enMora ? "En mora" : "Pendiente"}
                      </span>
                      <button
                        type="button"
                        onClick={() => dialogos.cobrar(p)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-black transition hover:brightness-110"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5" /> Cobrar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : lista.length === 0 ? (
          <Vacio
            icono={<Receipt className="h-6 w-6" />}
            titulo="Sin movimientos"
            bajada="Todavía no hay pagos registrados en esta categoría."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {lista.map(({ puesto: p, pago: g }) => {
              const cobrado = g.estado === "COBRADO";
              return (
                <div
                  key={g.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-white/25"
                >
                  <div
                    onClick={() => dialogos.verPuesto(p)}
                    className="flex cursor-pointer items-start gap-3"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${
                        cobrado
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                          : "border-[#FFC200]/40 bg-[#FFC200]/15 text-[#FFC200]"
                      }`}
                    >
                      {chapa(p.numero)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-white">
                        {p.arrendatario?.negocio ?? p.numero}
                      </h3>
                      <p className="truncate text-[11px] text-zinc-500">{g.concepto}</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-[11px]">
                    <p className="flex items-center gap-1.5 text-zinc-400">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {fmtFecha(g.fecha)}
                    </p>
                    <p className="truncate font-mono text-[10px] text-zinc-500">
                      {g.metodoPago}
                      {g.comprobante ? ` · ${g.comprobante}` : ""}
                    </p>
                    <div className="flex items-baseline justify-between gap-2 pt-1">
                      <span className="text-[10px] tracking-wider text-zinc-500 uppercase">
                        Monto
                      </span>
                      <span
                        className={`text-base font-black ${cobrado ? "text-emerald-400" : "text-[#FFC200]"}`}
                      >
                        {plata(g.monto)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        cobrado
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                          : "border-[#FFC200]/40 bg-[#FFC200]/15 text-[#FFC200]"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {cobrado ? "Cobrado" : "Pendiente"}
                    </span>
                    <button
                      type="button"
                      onClick={() => dialogos.verComprobante(p, g)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:bg-white/10"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Ver ticket
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DialogosPuesto control={dialogos} zonas={zonas} />
    </div>
  );
}

