"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  History,
  Info,
  PenLine,
  QrCode,
  Receipt,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type { PuestoCliente } from "@alquileres/_lib/datos";
import { diasHasta, estiloDe } from "@alquileres/_lib/estados";
import { fecha as fmtFecha, plata } from "@/lib/format";
import { Aviso, Campo, Modal } from "@/components/ui";
import Comprobante from "./Comprobante";
import {
  asignarArrendatario,
  guardarPuesto,
  liberarPuesto,
  registrarPago,
} from "@alquileres/acciones";

// ---------------------------------------------------------------------------

/**
 * Con lo que se cobra en el patio. Eran cuatro —transferencia, tarjeta y
 * MercadoPago aparte del efectivo— y en la práctica todo lo que no es efectivo
 * entra por QR, así que el cobro se hace en dos toques en vez de completar un
 * formulario. Los pagos viejos conservan el nombre con el que se registraron:
 * el historial arma su filtro con lo que hay en la base, no con esta lista.
 */
export const METODOS = ["Efectivo", "QR"];

const FORMAS = [
  { valor: "Efectivo", icono: Banknote, ayuda: "Se cobra en el cajón" },
  { valor: "QR", icono: QrCode, ayuda: "Transferencia o billetera" },
] as const;

const RUBROS = [
  "Hamburguesas y Papas",
  "Comida Mexicana / Tacos",
  "Pizzas y Empanadas",
  "Comida Asiática / Wok",
  "Cafetería & Postres",
  "Sushi & Nikkei",
  "Cervecería & Tragos",
  "Comida Criolla / Parrilla",
  "Heladería Artesanal",
  "Saludable & Ensaladas",
];

const SERVICIOS = [
  "Agua Corriente",
  "Gas Natural",
  "Luz Monofásica",
  "Luz Trifásica",
  "Luz Comercial",
  "Extracción",
  "Extractor Industrial",
  "Cámara Fría de Apoyo",
  "Barra Exterior",
];

export const botonPrimario =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC200] py-3 text-sm font-black text-black shadow-lg shadow-[#FFC200]/25 transition hover:brightness-110 disabled:opacity-50";
export const botonSecundario =
  "flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/10";

// ---------------------------------------------------------------------------
// Cobrar alquiler
// ---------------------------------------------------------------------------

export function DialogoCobrar({
  puesto,
  onCerrar,
}: {
  puesto: PuestoCliente;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const acordado = puesto.arrendatario?.montoAcordado ?? puesto.precioBase;
  const [monto, setMonto] = useState(String(acordado));
  /** `null` es el paso 1: todavía no eligieron con qué pagan. */
  const [metodo, setMetodo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{
    transaccion: string;
    concepto: string;
    comprobante: string;
  } | null>(null);

  function elegir(forma: string) {
    if (!(Number(monto) > 0)) {
      setError("El monto debe ser mayor a cero");
      return;
    }
    setError(null);
    setMetodo(forma);
  }

  async function cobrar() {
    setEnviando(true);
    setError(null);
    // La fecha es hoy y el comprobante lo numera el servidor: son los dos
    // campos que antes había que completar a mano en cada cobro.
    const datos = new FormData();
    datos.set("puestoId", puesto.id);
    datos.set("monto", monto);
    datos.set("metodoPago", metodo ?? "");
    const res = await registrarPago(datos);
    setEnviando(false);
    if (!res.ok) setError(res.error);
    else {
      setListo(res.datos!);
      router.refresh();
    }
  }

  // Cobrado: se muestra el mismo comprobante que abren el historial y la ficha.
  if (listo) {
    return (
      <Comprobante
        onCerrar={onCerrar}
        datos={{
          transaccion: listo.comprobante || listo.transaccion,
          fecha: new Date(),
          puesto: puesto.numero,
          comercio: puesto.arrendatario?.negocio ?? "—",
          titular: puesto.arrendatario?.nombre,
          concepto: listo.concepto,
          metodoPago: metodo ?? "",
          monto: Number(monto),
        }}
      />
    );
  }

  const titular = (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
        Inquilino / Titular
      </p>
      <p className="font-bold text-zinc-100">{puesto.arrendatario?.nombre}</p>
      <p className="mt-1 text-[11px] text-zinc-500">
        Monto Pactado · <span className="font-bold text-[#FFC200]">{plata(acordado)}</span>
      </p>
    </div>
  );

  return (
    <Modal
      titulo="Cobrar Alquiler"
      bajada={`${puesto.numero} · ${puesto.arrendatario?.negocio ?? ""}`}
      onCerrar={onCerrar}
    >
      <div className="space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
          {metodo ? "Paso 2 de 2 · Confirmar" : "Paso 1 de 2 · Cómo paga"}
        </p>

        {titular}

        {/* ---------------- Paso 1: monto y forma de pago ---------------- */}
        {!metodo && (
          <>
            <Campo etiqueta="Monto a Cobrar (Bs)">
              <input
                type="number"
                min="1"
                step="0.01"
                className="campo text-lg font-black"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
              />
            </Campo>

            <div className="grid grid-cols-2 gap-2.5">
              {FORMAS.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => elegir(f.valor)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-5 text-center transition hover:border-[#FFC200]/50 hover:bg-[#FFC200]/10"
                >
                  <f.icono className="h-7 w-7 text-[#FFC200]" />
                  <span className="text-sm font-black text-zinc-100">{f.valor}</span>
                  <span className="text-[10px] text-zinc-500">{f.ayuda}</span>
                </button>
              ))}
            </div>

            <Aviso mensaje={error} />

            <button type="button" onClick={onCerrar} className={botonSecundario}>
              Cancelar
            </button>
          </>
        )}

        {/* ---------------- Paso 2: confirmar ---------------- */}
        {metodo && (
          <>
            <div className="rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 p-4 text-center">
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Se registra un cobro de
              </p>
              <p className="tabular mt-1 text-3xl font-black text-[#FFC200]">
                {plata(Number(monto))}
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-300">en {metodo}</p>
            </div>

            <Aviso mensaje={error} />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMetodo(null)}
                disabled={enviando}
                className={botonSecundario}
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>
              <button type="button" onClick={cobrar} disabled={enviando} className={botonPrimario}>
                {enviando ? "Registrando…" : `Cobrar ${plata(Number(monto))}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Asignar arrendatario
// ---------------------------------------------------------------------------

export function DialogoArrendatario({
  puesto,
  onCerrar,
}: {
  puesto: PuestoCliente;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const a = puesto.arrendatario;
  const hoy = new Date().toISOString().slice(0, 10);
  const enUnMes = new Date();
  enUnMes.setMonth(enUnMes.getMonth() + 1);

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await asignarArrendatario(new FormData(e.currentTarget));
    setEnviando(false);
    if (!res.ok) setError(res.error);
    else {
      onCerrar();
      router.refresh();
    }
  }

  return (
    <Modal
      titulo={a ? "Editar Arrendatario" : "Asignar Nuevo Arrendatario"}
      bajada={puesto.numero}
      onCerrar={onCerrar}
      ancho="max-w-xl"
    >
      <form onSubmit={enviar} className="space-y-4">
        <input type="hidden" name="puestoId" value={puesto.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre del Comercial / Puesto" className="sm:col-span-2">
            <input name="negocio" className="campo" defaultValue={a?.negocio} required />
          </Campo>
          <Campo etiqueta="Rubro / Gastronomía" className="sm:col-span-2">
            <select name="rubro" className="campo" defaultValue={a?.rubro ?? RUBROS[0]}>
              {RUBROS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              {a?.rubro && !RUBROS.includes(a.rubro) && <option value={a.rubro}>{a.rubro}</option>}
            </select>
          </Campo>
          <Campo etiqueta="Nombre Completo del Responsable" className="sm:col-span-2">
            <input name="nombre" className="campo" defaultValue={a?.nombre} required />
          </Campo>
          <Campo etiqueta="Teléfono de Contacto">
            <input name="telefono" className="campo" defaultValue={a?.telefono ?? ""} />
          </Campo>
          <Campo etiqueta="Correo Electrónico">
            <input name="email" type="email" className="campo" defaultValue={a?.email ?? ""} />
          </Campo>
          <Campo etiqueta="Alquiler Acordado (Bs)">
            <input
              name="montoAcordado"
              type="number"
              min="1"
              step="0.01"
              className="campo"
              defaultValue={a?.montoAcordado ?? puesto.precioBase}
              required
            />
          </Campo>
          <Campo etiqueta="Inicio Contrato">
            <input
              name="fechaInicio"
              type="date"
              className="campo"
              defaultValue={a ? a.fechaInicio.slice(0, 10) : hoy}
              required
            />
          </Campo>
          <Campo etiqueta="Próximo Cobro" className="sm:col-span-2">
            <input
              name="proximoVencimiento"
              type="date"
              className="campo"
              defaultValue={
                a ? a.proximoVencimiento.slice(0, 10) : enUnMes.toISOString().slice(0, 10)
              }
              required
            />
          </Campo>
        </div>

        <Aviso mensaje={error} />

        <div className="flex gap-2">
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={botonPrimario}>
            {enviando ? "Guardando…" : "Confirmar Contrato"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Alta / edición de puesto
// ---------------------------------------------------------------------------

export function DialogoPuesto({
  puesto,
  zonas,
  onCerrar,
}: {
  puesto: PuestoCliente | null;
  zonas: { id: string; nombre: string }[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [servicios, setServicios] = useState<string[]>(puesto?.servicios ?? []);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("servicios", servicios.join(","));
    const res = await guardarPuesto(fd);
    setEnviando(false);
    if (!res.ok) setError(res.error);
    else {
      onCerrar();
      router.refresh();
    }
  }

  return (
    <Modal
      titulo={puesto ? "Editar Puesto" : "Añadir Nuevo Puesto"}
      bajada="Define las características, precio base e instalaciones"
      onCerrar={onCerrar}
      ancho="max-w-xl"
    >
      <form onSubmit={enviar} className="space-y-4">
        {puesto && <input type="hidden" name="id" value={puesto.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Identificador / Número">
            <input name="numero" className="campo" defaultValue={puesto?.numero} required />
          </Campo>
          <Campo etiqueta="Zona / Sector del Patio">
            <select name="zonaId" className="campo" defaultValue={puesto?.zonaId ?? zonas[0]?.id}>
              {zonas.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Tamaño (m²)">
            <input
              name="tamanoM2"
              type="number"
              step="0.5"
              min="1"
              className="campo"
              defaultValue={puesto?.tamanoM2 ?? 20}
              required
            />
          </Campo>
          <Campo etiqueta="Precio Base (Bs)">
            <input
              name="precioBase"
              type="number"
              step="0.01"
              min="0"
              className="campo"
              defaultValue={puesto?.precioBase ?? 400000}
              required
            />
          </Campo>
          <Campo etiqueta="Periodicidad" className="sm:col-span-2">
            <select
              name="periodicidad"
              className="campo"
              defaultValue={puesto?.periodicidad ?? "MENSUAL"}
            >
              <option value="MENSUAL">Mensual</option>
              <option value="SEMANAL">Semanal</option>
              <option value="DIARIO">Diario</option>
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Servicios e Instalaciones Disponibles">
          <div className="flex flex-wrap gap-1.5">
            {SERVICIOS.map((s) => {
              const activo = servicios.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setServicios((v) => (activo ? v.filter((x) => x !== s) : [...v, s]))
                  }
                  className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold transition ${
                    activo
                      ? "border-[#FFC200]/40 bg-[#FFC200]/15 text-[#FFC200]"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Campo>

        <Campo etiqueta="Descripción o Equipamiento Específico">
          <textarea
            name="descripcion"
            rows={3}
            className="campo resize-none"
            defaultValue={puesto?.descripcion ?? ""}
          />
        </Campo>

        <Aviso mensaje={error} />

        <div className="flex gap-2">
          <button type="button" onClick={onCerrar} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={botonPrimario}>
            {enviando ? "Guardando…" : puesto ? "Guardar Cambios" : "Añadir Puesto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Ficha del puesto
// ---------------------------------------------------------------------------

export function DialogoDetalle({
  puesto,
  onCerrar,
  onCobrar,
  onAsignar,
  onEditar,
  onVerComprobante,
}: {
  puesto: PuestoCliente;
  onCerrar: () => void;
  onCobrar: () => void;
  onAsignar: () => void;
  onEditar: () => void;
  /** Abre el comprobante de un cobro del historial. */
  onVerComprobante?: (pago: PuestoCliente["historialPagos"][number]) => void;
}) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"info" | "historial">("info");
  const c = estiloDe(puesto.estado);
  const a = puesto.arrendatario;
  const dias = a ? diasHasta(a.proximoVencimiento) : 0;
  const vencido = puesto.estado === "PENDIENTE" && dias < 0;

  async function liberar() {
    if (
      !confirm(
        `¿Estás seguro de finalizar el alquiler del puesto ${puesto.numero}` +
          `${a ? ` (${a.negocio})` : ""}? El puesto pasará a estado Libre.`,
      )
    )
      return;
    await liberarPuesto(puesto.id);
    onCerrar();
    router.refresh();
  }

  return (
    <Modal
      titulo={a?.negocio ?? "Puesto Libre / Disponible"}
      bajada={`${puesto.numero} · ${puesto.zona} • Superficie: ${puesto.tamanoM2} m²`}
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${c.fondo} ${c.borde} ${c.texto}`}
          >
            {c.etiqueta}
          </span>
          {a && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
              {a.rubro}
            </span>
          )}
        </div>

        {/* Pestañas, como en el prototipo */}
        <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-black p-1.5">
          {(
            [
              ["info", "Datos & Alquiler", Info],
              ["historial", `Historial de Pagos (${puesto.historialPagos.length})`, History],
            ] as const
          ).map(([clave, texto, Icono]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setPestana(clave)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                pestana === clave
                  ? "bg-[#FFC200] text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icono className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{texto}</span>
            </button>
          ))}
        </div>

        {pestana === "info" ? (
          <>
            {puesto.estado === "PENDIENTE" && (
              <div className="rounded-2xl border border-[#FFC200]/40 bg-[#FFC200]/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FFC200]/40 bg-[#FFC200]/20 text-[#FFC200]">
                    <AlertCircle className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[#FFC200]">
                      {vencido ? "Pago Vencido" : "Cobro Pendiente del Mes"}
                    </h3>
                    <p className="text-[11px] text-[#FFC200]/80">
                      Próximo vencimiento:{" "}
                      <strong>{a ? fmtFecha(a.proximoVencimiento) : "—"}</strong>
                      {vencido && ` (${Math.abs(dias)} días atrasado)`}
                    </p>
                  </div>
                </div>
                <button onClick={onCobrar} className={`${botonPrimario} mt-3`}>
                  <CircleDollarSign className="h-4 w-4" /> Cobrar Alquiler
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="mb-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                  Datos &amp; Alquiler
                </p>
                <dl className="space-y-1.5 text-xs">
                  {[
                    ["Superficie", `${puesto.tamanoM2} m²`],
                    ["Precio Base", plata(puesto.precioBase)],
                    ["Periodicidad", puesto.periodicidad.toLowerCase()],
                    ...(a
                      ? ([
                          ["Alquiler Pactado", plata(a.montoAcordado)],
                          ["Inicio Contrato", fmtFecha(a.fechaInicio)],
                          ["Próximo vencimiento", fmtFecha(a.proximoVencimiento)],
                        ] as [string, string][])
                      : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-zinc-500">{k}</dt>
                      <dd className="text-right font-medium text-zinc-200">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="mb-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                  Titular
                </p>
                {a ? (
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-500">Nombre</dt>
                      <dd className="text-right font-medium text-zinc-200">{a.nombre}</dd>
                    </div>
                    {a.telefono && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Teléfono</dt>
                        <dd className="text-right">
                          <a href={`tel:${a.telefono}`} className="font-medium text-[#FFC200]">
                            {a.telefono}
                          </a>
                        </dd>
                      </div>
                    )}
                    {a.email && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Correo</dt>
                        <dd className="truncate text-right">
                          <a href={`mailto:${a.email}`} className="font-medium text-[#FFC200]">
                            {a.email}
                          </a>
                        </dd>
                      </div>
                    )}
                    <p
                      className={`mt-2 rounded-xl px-2.5 py-1.5 text-[11px] font-bold ${
                        dias < 0
                          ? "bg-rose-500/15 text-rose-400"
                          : dias <= 5
                            ? "bg-[#FFC200]/15 text-[#FFC200]"
                            : "bg-[#FFC200]/15 text-[#FFC200]"
                      }`}
                    >
                      {dias < 0
                        ? `Vencido hace ${Math.abs(dias)} día(s)`
                        : dias === 0
                          ? "Vence hoy"
                          : `Vence en ${dias} día(s)`}
                    </p>
                  </dl>
                ) : (
                  <p className="py-4 text-center text-xs text-zinc-500">Sin arrendatario asignado</p>
                )}
              </div>
            </div>

            {puesto.servicios.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                  Servicios e Instalaciones Incluidas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {puesto.servicios.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {puesto.descripcion && (
              <p className="text-xs text-zinc-400">
                <span className="text-zinc-500">Observaciones del espacio: </span>
                {puesto.descripcion}
              </p>
            )}

          </>
        ) : (
          /* --- Pestaña: historial de pagos --- */
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                Registro de Cobros de este Puesto
              </p>
              {a && (
                <button
                  onClick={onCobrar}
                  className="flex items-center gap-1.5 rounded-xl bg-[#FFC200] px-3 py-1.5 text-[11px] font-black text-black transition hover:brightness-110"
                >
                  <CircleDollarSign className="h-3.5 w-3.5" /> Registrar Nuevo Cobro
                </button>
              )}
            </div>

            {puesto.historialPagos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/40 py-10 text-center">
                <History className="h-7 w-7 text-zinc-600" />
                <p className="text-xs text-zinc-500">
                  Aún no hay ningún pago registrado en el historial de este puesto.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {puesto.historialPagos.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/40 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold text-zinc-200">{g.concepto}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                            g.estado === "COBRADO"
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                              : "border-[#FFC200]/40 bg-[#FFC200]/15 text-[#FFC200]"
                          }`}
                        >
                          {g.estado === "COBRADO" ? "Cobrado" : "Pendiente"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        Fecha: {fmtFecha(g.fecha)} • Método: {g.metodoPago}
                        {g.comprobante ? ` • Comp: ${g.comprobante}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-black text-[#FFC200]">{plata(g.monto)}</span>
                      {onVerComprobante && (
                        <button
                          onClick={() => onVerComprobante(g)}
                          title="Ver Comprobante Digital"
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:text-[#FFC200]"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Una grilla de columnas iguales, no `flex-1` sobre etiquetas de largo
            distinto: así "Dar de Baja Alquiler" y "Marcar Pago como Cobrado" se
            partían en dos renglones y cada botón terminaba de un alto. Los
            textos son los cortos por el mismo motivo. */}
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
          <button onClick={onEditar} className={botonSecundario}>
            <PenLine className="h-4 w-4" /> Editar Puesto
          </button>
          {a ? (
            <>
              <button onClick={onAsignar} className={botonSecundario}>
                <UserPlus className="h-4 w-4" /> Editar Titular
              </button>
              <button onClick={liberar} className={`${botonSecundario} !text-rose-400`}>
                <UserMinus className="h-4 w-4" /> Dar de Baja
              </button>
              <button onClick={onCobrar} className={botonPrimario}>
                <CircleDollarSign className="h-4 w-4" /> Cobrar
              </button>
            </>
          ) : (
            <button onClick={onAsignar} className={`${botonPrimario} col-span-2`}>
              <UserPlus className="h-4 w-4" /> Asignar Arrendatario
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
