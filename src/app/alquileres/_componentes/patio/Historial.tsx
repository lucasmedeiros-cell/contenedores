"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Upload,
} from "lucide-react";
import type { PuestoCliente } from "@alquileres/_lib/datos";
import { fecha as fmtFecha, plata } from "@/lib/format";
import { descargarTexto, exportarCsv } from "@/lib/csv";
import { importarPagos, type FilaImportacion } from "@alquileres/acciones";
import { CampoBusqueda, Modal } from "@/components/ui";
import { METODOS, botonPrimario, botonSecundario } from "./dialogos";
import Comprobante, { type DatosComprobante } from "./Comprobante";


type Transaccion = {
  id: string;
  comprobante: string | null;
  fecha: string;
  puesto: string;
  negocio: string;
  metodoPago: string;
  monto: number;
  concepto: string;
};

export default function Historial({ puestos }: { puestos: PuestoCliente[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [metodo, setMetodo] = useState("");
  const [importando, setImportando] = useState(false);
  const [ticket, setTicket] = useState<DatosComprobante | null>(null);

  const transacciones = useMemo<Transaccion[]>(
    () =>
      puestos
        .flatMap((p) =>
          p.historialPagos.map((g) => ({
            id: g.id,
            comprobante: g.comprobante,
            fecha: g.fecha,
            puesto: p.numero,
            negocio: p.arrendatario?.negocio ?? "—",
            metodoPago: g.metodoPago,
            monto: g.monto,
            concepto: g.concepto,
          })),
        )
        .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)),
    [puestos],
  );

  /**
   * Las formas de cobro para el filtro: las que usa hoy el sistema más las que
   * tengan los pagos ya registrados. Sin esto, al dejar solo Efectivo y QR, los
   * cobros viejos —transferencia, tarjeta, MercadoPago— dejaban de poder
   * filtrarse aunque siguieran en la lista.
   */
  const metodosDisponibles = useMemo(
    () => [...new Set([...METODOS, ...transacciones.map((t) => t.metodoPago)])].filter(Boolean),
    [transacciones],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return transacciones.filter((t) => {
      if (metodo && t.metodoPago !== metodo) return false;
      if (!q) return true;
      return [t.comprobante, t.puesto, t.negocio, t.concepto]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [transacciones, busqueda, metodo]);

  function exportar() {
    exportarCsv(
      "historial-patio",
      ["comprobante", "fecha", "puesto", "comercio", "metodo", "monto", "concepto"],
      filtradas.map((t) => [
        t.comprobante,
        new Date(t.fecha).toISOString().slice(0, 10),
        t.puesto,
        t.negocio,
        t.metodoPago,
        t.monto,
        t.concepto,
      ]),
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="panel flex flex-col items-stretch justify-between gap-4 p-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-sm font-black tracking-tight text-white">
            Historial de Transacciones
          </h2>
          <p className="text-[11px] text-zinc-500">
            Auditoría completa de comprobantes y pagos procesados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CampoBusqueda valor={busqueda} onBuscar={setBusqueda} />
          <select
            className="campo !w-auto !py-1.5 text-xs"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
          >
            <option value="">Todos los Métodos</option>
            {metodosDisponibles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={exportar}
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button
            onClick={() => setImportando(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-[#FFC200] px-3 py-2 text-xs font-black text-black shadow-lg shadow-[#FFC200]/25 transition hover:brightness-110"
          >
            <Upload className="h-3.5 w-3.5" /> Importar Pagos
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Puesto &amp; Comercio</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtradas.map((t) => (
                <tr key={t.id} className="transition hover:bg-white/3">
                  <td className="px-4 py-2.5 text-xs font-bold text-[#FFC200]">
                    {t.comprobante ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{fmtFecha(t.fecha)}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-zinc-200">{t.negocio}</p>
                    <p className="text-[11px] text-zinc-600">
                      {t.puesto} · {t.concepto}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{t.metodoPago}</td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-400">
                    {plata(t.monto)}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() =>
                        setTicket({
                          transaccion: t.comprobante ?? t.id.slice(-8).toUpperCase(),
                          fecha: t.fecha,
                          puesto: t.puesto,
                          comercio: t.negocio,
                          concepto: t.concepto,
                          metodoPago: t.metodoPago,
                          monto: t.monto,
                        })
                      }
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                    >
                      Ver Ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtradas.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            No se encontraron transacciones con el criterio ingresado.
          </p>
        )}
      </div>

      {ticket && <Comprobante datos={ticket} onCerrar={() => setTicket(null)} />}
      {importando && (
        <DialogoImportar puestos={puestos} onCerrar={() => setImportando(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Importación masiva
// ---------------------------------------------------------------------------

const PLANTILLA = `Puesto,Comercio,Monto,Metodo,Fecha,Comprobante
Puesto 05,Gelato & Waffles,360000,Efectivo,2026-07-30,EFE-20260730-1A2B
Puesto 03,Burgers & Fries,420000,QR,2026-07-30,QRP-20260730-90C4
Puesto 10,Smoothies & Juices,380000,QR,2026-07-29,QRP-20260729-77D1`;

const EJEMPLO = `Puesto,Comercio,Monto,Metodo,Fecha,Comprobante
Puesto 05,Gelato & Waffles Artesanales,360000,Efectivo,2026-07-30,EFE-20260730-109288
Puesto 02,Tacos & Burritos del Sol,440000,QR,2026-07-30,QRP-20260730-889102
Puesto 08,Arepas & Sabores Caribeños,390000,Efectivo,2026-07-29,EFE-20260729-772810`;

/** Una fila del CSV ya revisada contra los puestos que existen. */
type FilaRevisada = FilaImportacion & {
  comercio: string;
  esValido: boolean;
  error?: string;
};

/**
 * Deja el método que vino en el CSV con alguno de los nombres que usa la app.
 * Hoy se cobra en Efectivo o por QR, así que todo lo que no sea efectivo
 * —transferencia, tarjeta, MercadoPago, billeteras— entra como QR, que es como
 * llega la plata en la práctica.
 */
function normalizarMetodo(valor: string) {
  const v = valor.toLowerCase();
  if (v.includes("efec")) return "Efectivo";
  if (v.includes("qr") || v.includes("transf") || v.includes("tarj") || v.includes("mercado")) {
    return "QR";
  }
  return valor.trim() || "Efectivo";
}

/**
 * Lee el CSV y marca fila por fila si se puede importar. Admite tanto la
 * plantilla del prototipo (Puesto, Comercio, Monto, Metodo, Fecha, Comprobante)
 * como cualquier orden de columnas, porque se guía por los encabezados.
 */
function parsear(texto: string, puestos: PuestoCliente[]): FilaRevisada[] {
  const lineas = texto.trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return [];

  const sep = lineas[0].includes(";") ? ";" : ",";
  const cortar = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const cab = cortar(lineas[0]).map((c) => c.toLowerCase());
  const tieneCabecera = cab.some((c) => ["puesto", "monto", "comercio"].includes(c));

  // Sin encabezados se asume el orden de la plantilla del prototipo.
  const POSICIONAL = ["puesto", "comercio", "monto", "metodo", "fecha", "comprobante"];
  const columnas = tieneCabecera ? cab : POSICIONAL;
  const i = (n: string) => columnas.indexOf(n);
  const dato = (c: string[], n: string) => (i(n) >= 0 ? (c[i(n)] ?? "") : "");

  const hoy = new Date().toISOString().slice(0, 10);
  const porNumero = new Map(puestos.map((p) => [p.numero.toLowerCase(), p]));

  const filas: FilaRevisada[] = [];
  for (const linea of lineas.slice(tieneCabecera ? 1 : 0)) {
    const c = cortar(linea);
    if (c.length < 2) continue;

    // "5", "Puesto 5" y "PUESTO 05" apuntan todos al mismo puesto.
    const bruto = dato(c, "puesto");
    const digitos = bruto.match(/\d+/);
    const buscado = digitos ? `puesto ${digitos[0].padStart(2, "0")}` : bruto.toLowerCase();
    const puesto = porNumero.get(buscado) ?? porNumero.get(bruto.toLowerCase());

    const monto = Number(String(dato(c, "monto")).replace(/[^\d.-]/g, ""));
    const fecha = dato(c, "fecha") || hoy;
    const fechaValida = !Number.isNaN(new Date(`${fecha}T12:00:00`).getTime());

    let error: string | undefined;
    if (!puesto) error = `No existe el puesto “${bruto || "—"}”`;
    else if (!Number.isFinite(monto) || monto <= 0) error = "El monto debe ser mayor a 0";
    else if (!fechaValida) error = `Fecha inválida “${fecha}”`;

    filas.push({
      puesto: puesto?.numero ?? bruto,
      comercio: dato(c, "comercio") || puesto?.arrendatario?.negocio || "Comercio",
      fecha,
      monto: Number.isFinite(monto) ? monto : 0,
      metodoPago: normalizarMetodo(dato(c, "metodo")),
      comprobante: dato(c, "comprobante") || undefined,
      concepto: dato(c, "concepto") || undefined,
      esValido: !error,
      error,
    });
  }
  return filas;
}


function DialogoImportar({
  puestos,
  onCerrar,
}: {
  puestos: PuestoCliente[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const archivo = useRef<HTMLInputElement>(null);
  const [paso, setPaso] = useState<"cargar" | "previsualizar" | "exito">("cargar");
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<FilaRevisada[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    importados: number;
    omitidos: { fila: number; motivo: string }[];
  } | null>(null);

  const validas = filas.filter((f) => f.esValido);

  function analizar(csv: string) {
    const revisadas = parsear(csv, puestos);
    setFilas(revisadas);
    if (revisadas.length > 0) setPaso("previsualizar");
  }

  function cargarEjemplo() {
    setTexto(EJEMPLO);
    analizar(EJEMPLO);
  }

  async function confirmar() {
    if (validas.length === 0) return;
    setEnviando(true);
    setError(null);
    const res = await importarPagos(
      validas.map(({ puesto, fecha, monto, metodoPago, comprobante, concepto }) => ({
        puesto,
        fecha,
        monto,
        metodoPago,
        comprobante,
        concepto,
      })),
    );
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResultado(res.datos!);
    setPaso("exito");
    router.refresh();
  }

  // --- Paso 3: listo ---
  if (paso === "exito" && resultado) {
    return (
      <Modal titulo="¡Importación Completada con Éxito!" onCerrar={onCerrar}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </span>
          <p className="text-sm text-zinc-300">
            Se han añadido <strong className="text-[#FFC200]">{resultado.importados} comprobantes</strong>{" "}
            al historial de pagos del patio.
          </p>
        </div>

        {resultado.omitidos.length > 0 && (
          <div className="rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 p-3">
            <p className="mb-1.5 text-xs font-bold text-[#FFC200]">
              {resultado.omitidos.length} fila(s) omitida(s)
            </p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[11px] text-[#FFC200]/80">
              {resultado.omitidos.map((o, i) => (
                <li key={i}>
                  Fila {o.fila}: {o.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onCerrar} className={`${botonPrimario} mt-4`}>
          Cerrar Ventana
        </button>
      </Modal>
    );
  }

  // --- Paso 2: previsualización ---
  if (paso === "previsualizar") {
    return (
      <Modal
        titulo={`Previsualización de Transacciones (${filas.length})`}
        bajada={`Se importarán ${validas.length} de ${filas.length} registros válidos`}
        onCerrar={onCerrar}
        ancho="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="border-b border-white/10 text-left text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                    <th className="px-3 py-2.5">Puesto</th>
                    <th className="px-3 py-2.5">Comercio</th>
                    <th className="px-3 py-2.5 text-right">Monto</th>
                    <th className="px-3 py-2.5">Método</th>
                    <th className="px-3 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filas.map((f, n) => (
                    <tr key={n} className={f.esValido ? "hover:bg-white/3" : "bg-rose-500/10"}>
                      <td className="px-3 py-2 font-bold text-zinc-100">{f.puesto}</td>
                      <td className="px-3 py-2 text-zinc-300">{f.comercio}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#FFC200]">
                        {plata(f.monto)}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{f.metodoPago}</td>
                      <td className="px-3 py-2">
                        {f.esValido ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Check className="h-3 w-3" /> Válido
                          </span>
                        ) : (
                          <span
                            title={f.error}
                            className="flex items-center gap-1 text-[11px] font-bold text-rose-400"
                          >
                            <AlertCircle className="h-3 w-3" /> {f.error ?? "Inválido"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaso("cargar")}
              className={`${botonSecundario} flex-1`}
            >
              Cambiar Archivo
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={validas.length === 0 || enviando}
              className={`${botonPrimario} flex-1`}
            >
              {enviando ? "Importando…" : `Confirmar e Importar (${validas.length})`}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // --- Paso 1: cargar ---
  return (
    <Modal
      titulo="Importar Registro de Pagos"
      bajada="Carga comprobantes y transacciones masivas mediante CSV"
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      <div className="space-y-4">
        <button
          onClick={() => archivo.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-white/15 bg-black/40 px-4 py-8 transition hover:border-[#FFC200]/50"
        >
          <FileUp className="h-7 w-7 text-zinc-600" />
          <span className="text-sm font-bold text-zinc-300">
            Arrastra tu archivo CSV o haz clic para examinar
          </span>
          <span className="text-[11px] text-zinc-600">
            Admite archivos formato CSV estructurados por comas
          </span>
        </button>
        <input
          ref={archivo}
          type="file"
          accept=".csv,.txt,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const t = await f.text();
            setTexto(t);
            analizar(t);
          }}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => descargarTexto(PLANTILLA, "plantilla-pagos.csv")} className={botonSecundario}>
            <Download className="h-4 w-4" /> Descargar Plantilla CSV
          </button>
          <button type="button" onClick={cargarEjemplo} className={botonSecundario}>
            <FileText className="h-4 w-4" /> Cargar Datos de Ejemplo
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            O pega el texto CSV directamente:
          </p>
          <textarea
            rows={5}
            className="campo resize-none font-mono text-xs"
            placeholder={PLANTILLA}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => analizar(texto)}
          disabled={!texto.trim()}
          className={botonPrimario}
        >
          Analizar Texto Pegado
        </button>
      </div>
    </Modal>
  );
}
