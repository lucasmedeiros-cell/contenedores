"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Box,
  LayoutGrid,
  List,
  Map as MapIcon,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import type { DatosPlano, PuestoCliente } from "@alquileres/_lib/datos";
import { ESTADOS, ORDEN_ESTADOS, diasHasta, estiloDe } from "@alquileres/_lib/estados";
import MapaPuestos from "./MapaPuestos";
import PlanoIsometrico from "@alquileres/_componentes/plano/PlanoIsometrico";
import DialogosPuesto, { useDialogosPuesto } from "./DialogosPuesto";
import { fecha as fmtFecha, plata } from "@/lib/format";
import { CampoBusqueda } from "@/components/ui";
import { borrarPuesto, moverPuesto } from "@alquileres/acciones";

export type Vista = "plano" | "puestos" | "arrendatarios";

const FILTROS = [
  { clave: "todos" as const, etiqueta: "Todos" },
  ...ORDEN_ESTADOS.map((e) => ({ clave: e, etiqueta: ESTADOS[e].etiqueta })),
];

export default function Patio({
  vista,
  puestos,
  zonas,
  plano,
}: {
  vista: Vista;
  puestos: PuestoCliente[];
  zonas: { id: string; nombre: string }[];
  /** Geometría del plano isométrico. Solo la manda la pantalla del plano. */
  plano?: DatosPlano;
}) {
  const router = useRouter();
  const dialogos = useDialogosPuesto();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [zona, setZona] = useState("");
  const [sub, setSub] = useState<"mapa" | "iso" | "tarjetas" | "lista">("mapa");
  /**
   * En "Gestión de Puestos" se alterna entre tarjetas y tabla, como el
   * prototipo. Arranca en tarjetas; la tabla queda a un clic.
   */
  const [comoTabla, setComoTabla] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return puestos.filter((p) => {
      const coincide =
        !q ||
        p.numero.toLowerCase().includes(q) ||
        p.zona.toLowerCase().includes(q) ||
        p.arrendatario?.negocio.toLowerCase().includes(q) ||
        p.arrendatario?.nombre.toLowerCase().includes(q) ||
        p.arrendatario?.rubro.toLowerCase().includes(q);
      return coincide && (estado === "todos" || p.estado === estado) && (!zona || p.zona === zona);
    });
  }, [puestos, busqueda, estado, zona]);

  /** El plano isométrico atenúa lo que quedó fuera del filtro de la barra. */
  const idsFiltrados = useMemo(() => new Set(filtrados.map((p) => p.id)), [filtrados]);


  async function borrar(p: PuestoCliente) {
    if (!confirm(`¿Borrar ${p.numero}? Se pierden sus pagos registrados.`)) return;
    await borrarPuesto(p.id);
    router.refresh();
  }

  const barraFiltros = (
    <div className="panel flex flex-col items-stretch justify-between gap-4 p-4 lg:flex-row lg:flex-wrap lg:items-center">
      {vista === "plano" && (
        /* `shrink-0`: sin eso, en pantallas medianas el grupo cedía ancho a los
           filtros de al lado y "Lista" quedaba cortada a la mitad. */
        <div className="scrollbar-none flex shrink-0 overflow-x-auto rounded-2xl border border-white/10 bg-black p-1.5">
          {(
            [
              ["mapa", "Plano", MapIcon],
              ...(plano ? ([["iso", "Isométrico", Box]] as const) : []),
              ["tarjetas", "Tarjetas", LayoutGrid],
              ["lista", "Lista", List],
            ] as const
          ).map(([clave, texto, Icono]) => (
            <button
              key={clave}
              onClick={() => setSub(clave)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                sub === clave ? "bg-[#FFC200] text-black shadow-md" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icono className="h-3.5 w-3.5" />
              <span>{texto}</span>
            </button>
          ))}
        </div>
      )}

      <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            onClick={() => setEstado(f.clave)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
              estado === f.clave
                ? "border border-white/30 bg-white/20 font-bold text-white"
                : "border border-white/5 bg-black/60 text-zinc-400 hover:text-white"
            }`}
          >
            {f.etiqueta} (
            {f.clave === "todos"
              ? puestos.length
              : puestos.filter((p) => p.estado === f.clave).length}
            )
          </button>
        ))}
        <select
          className="campo !w-auto !py-1.5 text-xs"
          value={zona}
          onChange={(e) => setZona(e.target.value)}
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.nombre}>
              {z.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <CampoBusqueda valor={busqueda} onBuscar={setBusqueda} />
        <button
          onClick={() => dialogos.nuevoPuesto()}
          className="flex items-center gap-1.5 rounded-2xl bg-[#FFC200] px-3 py-2 text-xs font-black whitespace-nowrap text-black shadow-lg shadow-[#FFC200]/25 transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Añadir Puesto
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      {barraFiltros}

      {/* ---------------- Gestión de Puestos ---------------- */}
      {vista === "puestos" && (
        <div className="panel flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 text-[#FFC200]">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">
                Directorio de Puestos Comercial
              </h2>
              <p className="text-[11px] text-zinc-500">
                Administración de espacios, precios base y arrendatarios
              </p>
            </div>
          </div>
          <button
            onClick={() => setComoTabla((v) => !v)}
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10"
          >
            {comoTabla ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
            {comoTabla ? "Ver en Tarjetas" : "Ver en Tabla"}
          </button>
        </div>
      )}

      {/* ---------------- Plano ---------------- */}
      {vista === "plano" && sub === "mapa" && (
        <MapaPuestos puestos={filtrados} onSeleccionar={dialogos.verPuesto} />
      )}

      {vista === "plano" && sub === "iso" && plano && (
        <div className="panel overflow-hidden p-2">
          <PlanoIsometrico
            datos={plano}
            visibles={idsFiltrados}
            editable
            onGuardar={async (cambios) => {
              await moverPuesto(cambios);
              router.refresh();
            }}
            onSeleccionar={(iso) => {
              const p = puestos.find((x) => x.id === iso.id);
              if (p) dialogos.verPuesto(p);
            }}
          />
        </div>
      )}

      {((vista === "plano" && sub === "tarjetas") || (vista === "puestos" && !comoTabla)) && (
        <Tarjetas
          puestos={filtrados}
          onVer={dialogos.verPuesto}
          onCobrar={dialogos.cobrar}
          onBorrar={borrar}
        />
      )}

      {((vista === "plano" && sub === "lista") || (vista === "puestos" && comoTabla)) && (
        <Tabla puestos={filtrados} onVer={dialogos.verPuesto} onBorrar={borrar} />
      )}

      {/* ---------------- Arrendatarios ---------------- */}
      {vista === "arrendatarios" && (
        <Directorio puestos={filtrados.filter((p) => p.arrendatario)} onVer={dialogos.verPuesto} />
      )}

      <DialogosPuesto control={dialogos} zonas={zonas} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Tarjetas({
  puestos,
  onVer,
  onCobrar,
  onBorrar,
}: {
  puestos: PuestoCliente[];
  onVer: (p: PuestoCliente) => void;
  onCobrar: (p: PuestoCliente) => void;
  onBorrar: (p: PuestoCliente) => void;
}) {
  if (puestos.length === 0) {
    return (
      <div className="panel py-14 text-center text-sm text-zinc-500">
        No hay puestos para ese filtro
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {puestos.map((p) => {
        const c = estiloDe(p.estado);
        const a = p.arrendatario;
        const dias = a ? diasHasta(a.proximoVencimiento) : 0;
        return (
          <div
            key={p.id}
            onClick={() => onVer(p)}
            className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 transition-all duration-200 hover:border-[#FFC200]/40 hover:shadow-lg"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBorrar(p);
              }}
              title="Borrar Puesto"
              className="absolute top-2 right-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {a?.negocio ?? "Puesto Libre / Disponible"}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {p.numero} · {p.zona}
                  </p>
                </div>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.hex }} />
              </div>

              {a ? (
                <div className="space-y-1 text-[11px]">
                  <p className="flex justify-between gap-2">
                    <span className="text-zinc-500">Titular:</span>
                    <span className="truncate font-medium text-zinc-300">{a.nombre}</span>
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-zinc-500">Próximo vencimiento:</span>
                    <span
                      className={`font-bold ${dias < 0 ? "text-rose-400" : dias <= 5 ? "text-[#FFC200]" : "text-zinc-300"}`}
                    >
                      {fmtFecha(a.proximoVencimiento)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="py-2 text-[11px] text-zinc-500">Sin arrendatario asignado</p>
              )}
            </div>

            <div className="mt-3 border-t border-white/10 pt-2.5">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Alquiler Pactado
                </span>
                <span className="text-sm font-black text-[#FFC200]">
                  {plata(a?.montoAcordado ?? p.precioBase)}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVer(p);
                  }}
                  className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
                >
                  Ver Puesto
                </button>
                {a && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCobrar(p);
                    }}
                    className="flex-1 rounded-lg bg-[#FFC200] px-3 py-1.5 text-xs font-black text-black transition hover:brightness-110"
                  >
                    Cobrar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Tabla({
  puestos,
  onVer,
  onBorrar,
}: {
  puestos: PuestoCliente[];
  onVer: (p: PuestoCliente) => void;
  onBorrar: (p: PuestoCliente) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] font-black tracking-widest text-zinc-500 uppercase">
              <th className="px-4 py-3">Nº Puesto</th>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Superficie</th>
              <th className="px-4 py-3">Comercio</th>
              <th className="px-4 py-3">Inquilino</th>
              <th className="px-4 py-3 text-right">Precio Base</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {puestos.map((p) => {
              const c = estiloDe(p.estado);
              return (
                <tr
                  key={p.id}
                  onClick={() => onVer(p)}
                  className="cursor-pointer transition hover:bg-white/3"
                >
                  <td className="px-4 py-2.5 font-bold text-zinc-100">{p.numero}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.zona}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.tamanoM2} m²</td>
                  <td className="px-4 py-2.5 text-zinc-300">{p.arrendatario?.negocio ?? "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.arrendatario?.nombre ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#FFC200]">
                    {plata(p.precioBase)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${c.fondo} ${c.borde} ${c.texto}`}
                    >
                      {c.etiqueta}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBorrar(p);
                      }}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-400 transition hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {puestos.length === 0 && (
        <p className="py-12 text-center text-sm text-zinc-500">No hay puestos para ese filtro</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Directorio({
  puestos,
  onVer,
}: {
  puestos: PuestoCliente[];
  onVer: (p: PuestoCliente) => void;
}) {
  if (puestos.length === 0) {
    return (
      <div className="panel py-14 text-center text-sm text-zinc-500">
        No se encontraron arrendatarios
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {puestos.map((p) => {
        const a = p.arrendatario!;
        const pagado = p.historialPagos
          .filter((g) => g.estado === "COBRADO")
          .reduce((s, g) => s + g.monto, 0);
        const c = estiloDe(p.estado);
        return (
          <div key={p.id} className="panel flex flex-col p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{a.negocio}</p>
                <p className="truncate text-[11px] text-zinc-500">{a.nombre}</p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${c.fondo} ${c.borde} ${c.texto}`}
              >
                {c.etiqueta}
              </span>
            </div>

            <p className="mb-2 text-[11px] text-zinc-500">{a.rubro}</p>

            <div className="mb-3 space-y-1 text-[11px]">
              {a.telefono && (
                <a href={`tel:${a.telefono}`} className="block text-[#FFC200] hover:underline">
                  {a.telefono}
                </a>
              )}
              {a.email && (
                <a
                  href={`mailto:${a.email}`}
                  className="block truncate text-[#FFC200] hover:underline"
                >
                  {a.email}
                </a>
              )}
              <p className="text-zinc-500">
                {p.numero} · desde el {fmtFecha(a.fechaInicio)}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div>
                <p className="text-[10px] tracking-wider text-zinc-600 uppercase">Pagado</p>
                <p className="text-sm font-black text-emerald-400">{plata(pagado)}</p>
              </div>
              <button
                onClick={() => onVer(p)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:bg-white/10"
              >
                Ver Detalle <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
