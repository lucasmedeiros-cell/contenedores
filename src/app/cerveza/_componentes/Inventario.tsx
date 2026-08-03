"use client";

import { useMemo, useRef, useState } from "react";
import {
  Beaker,
  Beer,
  Boxes,
  Cigarette,
  Coins,
  CupSoda,
  Droplet,
  ImagePlus,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  Trash2,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Inventario as DatosInventario, ProductoInventario } from "@cerveza/_lib/datos";
import {
  ajustarStock,
  borrarProducto,
  conectarBarril,
  guardarBarril,
  guardarProducto,
  reponerBarril,
  borrarBarril,
} from "@cerveza/acciones-inventario";
import { Aviso, Campo, Modal, Vacio } from "@/components/ui";
import { litros as enLitros, plata } from "@/lib/format";
import { BotonBar, CasillaActivo, PieFormulario, Seccion, TarjetaBar, useAccion } from "@cerveza/_componentes/piezas";
import { FotoProducto } from "@cerveza/_componentes/FotoProducto";
import {
  Carrusel,
  Puntos,
  Ruleta,
  SelectorModo,
  useGiro,
  useModo,
} from "@cerveza/_componentes/modos";

const ICONOS: Record<string, ComponentType<{ className?: string }>> = {
  Beer,
  Percent,
  Droplet,
  CupSoda,
  Zap,
  Cigarette,
  Boxes,
};

/**
 * Inventario del bar: lo que hay en el depósito y lo que queda en los
 * barriles. El stock nunca se edita a mano en la ficha del producto —se mueve
 * con ingreso, merma o ajuste— para que todo cambio quede explicado.
 */
export default function Inventario({
  datos,
  categorias,
}: {
  datos: DatosInventario;
  categorias: { id: string; nombre: string }[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [soloFaltantes, setSoloFaltantes] = useState(false);
  const [modo, setModo] = useModo("inventario", "lista");
  // La ruleta y el carrusel abren en la primera categoría con productos.
  const [categoria, setCategoria] = useState<string>(
    () => datos.categorias.find((c) => c.productos > 0)?.id ?? datos.categorias[0]?.id ?? "",
  );
  const [editando, setEditando] = useState<ProductoInventario | "nuevo" | null>(null);
  const [moviendo, setMoviendo] = useState<ProductoInventario | null>(null);
  const [barril, setBarril] = useState<DatosInventario["barriles"][number] | "nuevo" | null>(null);
  const { correr, error, ocupado } = useAccion();

  /**
   * La ruleta y el carrusel muestran de a uno: sin filtrar por categoría se
   * haría eterno pasar de la primera cerveza al último cigarrillo. La lista y
   * las tarjetas, en cambio, muestran todo junto.
   */
  const porCategoria = modo === "ruleta" || modo === "carrusel";

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return datos.productos.filter((p) => {
      if (porCategoria && categoria && p.categoriaId !== categoria) return false;
      if (soloFaltantes && !(p.activo && !p.deBarril && p.stock <= p.stockMinimo)) return false;
      if (!texto) return true;
      return (
        p.nombre.toLowerCase().includes(texto) ||
        p.presentacion.toLowerCase().includes(texto) ||
        p.categoria.toLowerCase().includes(texto)
      );
    });
  }, [datos.productos, busqueda, soloFaltantes, porCategoria, categoria]);

  const { indice, giro, setIndice, girar } = useGiro(lista.length, porCategoria);

  const acciones = {
    onEditar: (p: ProductoInventario) => setEditando(p),
    onStock: (p: ProductoInventario) => setMoviendo(p),
    onBorrar: (p: ProductoInventario) => {
      if (confirm(`¿Dar de baja ${p.nombre}?`)) correr(() => borrarProducto(p.id));
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaBar
          etiqueta="Litros en barril"
          valor={enLitros(datos.litrosDisponibles)}
          pie="barriles conectados"
          icono={<Droplet className="h-6 w-6" />}
        />
        <TarjetaBar
          etiqueta="Productos activos"
          valor={datos.productos.filter((p) => p.activo).length}
          pie={`${datos.productos.length} en total`}
          icono={<Boxes className="h-6 w-6" />}
        />
        <TarjetaBar
          etiqueta="Valor del depósito"
          valor={plata(datos.valorDeposito)}
          pie="a precio de costo"
          icono={<Coins className="h-6 w-6" />}
        />
        <TarjetaBar
          etiqueta="Para reponer"
          valor={datos.faltantes}
          pie="por debajo del mínimo"
          tono={datos.faltantes > 0 ? "alerta" : "apagado"}
          icono={<TriangleAlert className="h-6 w-6" />}
        />
      </div>

      <Aviso mensaje={error} />

      {/* --- Barriles --- */}
      <Seccion
        titulo="Barriles"
        accion={
          <BotonBar tipo="fantasma" onClick={() => setBarril("nuevo")}>
            <Plus className="h-4 w-4" />
            Nuevo barril
          </BotonBar>
        }
      >
        {datos.barriles.length === 0 ? (
          <Vacio
            icono={<Beaker className="h-7 w-7" />}
            titulo="No hay barriles cargados"
            bajada="Cargá el primero para que el punto de venta pueda servir chopps."
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {datos.barriles.map((b) => (
              <div
                key={b.id}
                className={`rounded-3xl border p-4 ${
                  b.conectado ? "border-[#FFC200]/40 bg-black" : "border-white/10 bg-black/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-black text-white">{b.estilo}</p>
                    <p className="text-[11px] text-zinc-500">
                      {b.conectado ? "Conectado" : "Desconectado"} · {b.capacidadL} L
                    </p>
                  </div>
                  <span className="tabular text-lg font-black text-[#FFC200]">{b.pct}%</span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: b.pct < 15 ? "#fb7185" : "#FFC200",
                    }}
                  />
                </div>
                <p className="tabular mt-1.5 text-[12px] text-zinc-400">
                  Quedan {enLitros(b.restanteL)}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => correr(() => reponerBarril(b.id))}
                    disabled={ocupado}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-300 transition hover:border-[#FFC200] hover:text-[#FFC200] disabled:opacity-40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Llenar
                  </button>
                  <button
                    onClick={() => correr(() => conectarBarril(b.id, !b.conectado))}
                    disabled={ocupado}
                    className="rounded-xl border border-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-300 transition hover:text-white disabled:opacity-40"
                  >
                    {b.conectado ? "Desconectar" : "Conectar"}
                  </button>
                  <button
                    onClick={() => setBarril(b)}
                    className="rounded-xl border border-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-300 transition hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Borrar el barril de ${b.estilo}?`)) {
                        correr(() => borrarBarril(b.id));
                      }
                    }}
                    className="rounded-xl border border-rose-500/25 px-2.5 py-1.5 text-[11.5px] font-bold text-rose-400 transition hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* --- Productos --- */}
      <Seccion
        titulo="Productos"
        accion={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                className="campo w-[200px] pl-9"
                placeholder="Buscar…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <button
              onClick={() => setSoloFaltantes((v) => !v)}
              className={`rounded-2xl border px-3.5 py-2 text-[12.5px] font-bold transition ${
                soloFaltantes
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              Faltantes
            </button>
            <SelectorModo valor={modo} onElegir={setModo} />
            <BotonBar onClick={() => setEditando("nuevo")}>
              <Plus className="h-4 w-4" />
              Nuevo
            </BotonBar>
          </div>
        }
      >
        {modo === "ruleta" ? (
          <div className="p-2">
            <Ruleta
              items={lista}
              giro={giro}
              onIndice={setIndice}
              girar={girar}
              maxAncho="min(100%, 820px)"
              categorias={datos.categorias.map((c) => ({
                id: c.id,
                nombre: c.nombre,
                Icono: ICONOS[c.icono] ?? Boxes,
              }))}
              categoriaActiva={categoria}
              onCategoria={(id) => {
                setCategoria(id);
                setIndice(0);
              }}
              centro={
                <>
                  <p className="text-[13px] font-bold tracking-[.14em] whitespace-nowrap text-zinc-500 uppercase">
                    Productos
                  </p>
                  <p className="tabular text-[46px] leading-none font-black text-white">
                    {lista.length}
                  </p>
                  <div className="mt-[10px]">
                    <Puntos cantidad={lista.length} indice={indice} />
                  </div>
                </>
              }
              vacio={
                <div className="text-center text-[20px] font-bold text-zinc-500">
                  Ningún producto en esta categoría.
                </div>
              }
              render={(p, activo) => (
                <GajoInventario producto={p} activo={activo} onEditar={acciones.onEditar} />
              )}
            />
          </div>
        ) : modo === "carrusel" ? (
          <div className="flex min-h-[380px] flex-col p-4">
            <Carrusel
              items={lista}
              indice={indice}
              onIndice={setIndice}
              girar={girar}
              ancho={280}
              render={(p, activo) => (
                <FichaInventario producto={p} activo={activo} {...acciones} />
              )}
            />
          </div>
        ) : modo === "tarjeta" ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {lista.map((p) => (
              <FichaInventario key={p.id} producto={p} activo={false} {...acciones} />
            ))}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="border-b border-white/10 text-[10.5px] tracking-widest text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3 font-bold">Producto</th>
                <th className="px-4 py-3 font-bold">Categoría</th>
                <th className="px-4 py-3 text-right font-bold">Precio</th>
                <th className="px-4 py-3 text-right font-bold">Costo</th>
                <th className="px-4 py-3 text-right font-bold">Stock</th>
                <th className="px-4 py-3 text-right font-bold">30 días</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lista.map((p) => {
                const falta = p.activo && !p.deBarril && p.stock <= p.stockMinimo;
                return (
                  <tr key={p.id} className={`transition hover:bg-white/[.03] ${!p.activo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.imagen ? (
                          <span className="h-9 w-9 shrink-0">
                            <FotoProducto producto={p} />
                          </span>
                        ) : (
                          <span
                            className="h-8 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{p.nombre}</p>
                          <p className="text-[11px] text-zinc-500">
                            {p.presentacion}
                            {p.deBarril ? ` · ${p.litros} L de barril` : ""}
                            {!p.activo ? " · inactivo" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{p.categoria}</td>
                    <td className="tabular px-4 py-3 text-right font-bold text-[#FFC200]">
                      {plata(p.precio)}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-zinc-500">{plata(p.costo)}</td>
                    <td className="tabular px-4 py-3 text-right">
                      {p.deBarril ? (
                        <span className="text-zinc-500">de barril</span>
                      ) : (
                        <span className={falta ? "font-black text-rose-400" : "font-bold text-white"}>
                          {p.stock}
                          <span className="ml-1 text-[11px] font-normal text-zinc-600">
                            / mín {p.stockMinimo}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-zinc-400">{p.vendidos30}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!p.deBarril && (
                        <button
                          onClick={() => setMoviendo(p)}
                          className="rounded-xl border border-white/10 px-3 py-1.5 text-[12px] font-bold text-zinc-300 transition hover:border-[#FFC200] hover:text-[#FFC200]"
                        >
                          Stock
                        </button>
                      )}
                      <button
                        onClick={() => setEditando(p)}
                        aria-label={`Editar ${p.nombre}`}
                        className="ml-1.5 rounded-xl border border-white/10 px-2.5 py-1.5 text-zinc-300 transition hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Dar de baja ${p.nombre}?`)) correr(() => borrarProducto(p.id));
                        }}
                        aria-label={`Borrar ${p.nombre}`}
                        className="ml-1.5 rounded-xl border border-rose-500/25 px-2.5 py-1.5 text-rose-400 transition hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {lista.length === 0 && modo !== "ruleta" && (
          <Vacio
            icono={<Boxes className="h-7 w-7" />}
            titulo="Ningún producto coincide"
            bajada="Cambiá la búsqueda o sacá el filtro de faltantes."
          />
        )}
      </Seccion>

      {editando && (
        <FichaProducto
          producto={editando === "nuevo" ? null : editando}
          categorias={categorias}
          onCerrar={() => setEditando(null)}
        />
      )}

      {moviendo && <DialogoStock producto={moviendo} onCerrar={() => setMoviendo(null)} />}

      {barril && (
        <FichaBarril
          barril={barril === "nuevo" ? null : barril}
          onCerrar={() => setBarril(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Si el producto está por debajo del mínimo. Solo aplica a lo envasado. */
function falta(p: ProductoInventario) {
  return p.activo && !p.deBarril && p.stock <= p.stockMinimo;
}

/** El producto dentro de un gajo del anillo. Medidas en unidades del lienzo. */
function GajoInventario({
  producto,
  activo,
  onEditar,
}: {
  producto: ProductoInventario;
  activo: boolean;
  onEditar: (p: ProductoInventario) => void;
}) {
  const enRojo = falta(producto);
  const color = activo ? "text-black" : "text-white";

  return (
    <div
      onClick={activo ? () => onEditar(producto) : undefined}
      title={activo ? "Tocá para editar el producto" : undefined}
      className={`flex h-full w-full flex-col items-center justify-center gap-[4px] px-[10px] text-center ${
        activo ? "cursor-pointer" : ""
      }`}
    >
      {producto.imagen ? (
        <span className="mb-[2px] block h-[74px] w-[62px]">
          <FotoProducto producto={producto} oscuro={activo} />
        </span>
      ) : (
        <span
          className="mb-[2px] block h-[10px] w-[64px] rounded-full"
          style={{ backgroundColor: producto.color }}
        />
      )}
      <p className={`text-[27px] leading-[.92] font-black tracking-tight uppercase ${color}`}>
        {producto.nombre}
      </p>
      <p className={`text-[16px] font-bold ${activo ? "text-black/60" : "text-zinc-500"}`}>
        {producto.presentacion}
      </p>
      <span
        className={`tabular inline-block rounded-[12px] px-[14px] py-[4px] text-[24px] font-black ${
          activo ? "bg-black text-[#FFC200]" : "border-[2.5px] border-[#FFC200] text-[#FFC200]"
        }`}
      >
        {plata(producto.precio)}
      </span>
      <p
        className={`text-[16px] font-bold ${
          enRojo ? "text-rose-500" : activo ? "text-black/70" : "text-zinc-400"
        }`}
      >
        {producto.deBarril ? `${producto.litros} L de barril` : `${producto.stock} en depósito`}
      </p>
      <p className={`text-[14px] ${activo ? "text-black/50" : "text-zinc-600"}`}>
        Costo {plata(producto.costo)}
      </p>
    </div>
  );
}

/** La ficha del producto para los modos tarjeta y carrusel del inventario. */
function FichaInventario({
  producto,
  activo,
  onEditar,
  onStock,
  onBorrar,
}: {
  producto: ProductoInventario;
  activo: boolean;
  onEditar: (p: ProductoInventario) => void;
  onStock: (p: ProductoInventario) => void;
  onBorrar: (p: ProductoInventario) => void;
}) {
  const enRojo = falta(producto);

  return (
    <div
      className={`flex h-full w-full flex-col rounded-3xl border p-4 transition ${
        activo ? "border-[#FFC200] bg-black" : "border-white/10 bg-black"
      } ${!producto.activo ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        {producto.imagen ? (
          <span className="h-12 w-12 shrink-0">
            <FotoProducto producto={producto} />
          </span>
        ) : (
          <span
            className="mt-1 h-9 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: producto.color }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-tight font-black text-white">
            {producto.nombre}
          </p>
          <p className="truncate text-[11.5px] text-zinc-500">
            {producto.presentacion} · {producto.categoria}
          </p>
        </div>
        <span className="tabular shrink-0 text-[17px] font-black text-[#FFC200]">
          {plata(producto.precio)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Dato etiqueta="Stock">
          {producto.deBarril ? (
            <span className="text-zinc-400">barril</span>
          ) : (
            <span className={enRojo ? "text-rose-400" : "text-white"}>
              {producto.stock}
              <span className="text-[10px] text-zinc-600"> / {producto.stockMinimo}</span>
            </span>
          )}
        </Dato>
        <Dato etiqueta="Costo">{plata(producto.costo)}</Dato>
        <Dato etiqueta="30 días">{producto.vendidos30}</Dato>
      </div>

      <div className="mt-3 flex gap-1.5">
        {!producto.deBarril && (
          <button
            onClick={() => onStock(producto)}
            className="flex-1 rounded-xl border border-white/10 px-2 py-1.5 text-[12px] font-bold text-zinc-300 transition hover:border-[#FFC200] hover:text-[#FFC200]"
          >
            Stock
          </button>
        )}
        <button
          onClick={() => onEditar(producto)}
          aria-label={`Editar ${producto.nombre}`}
          className="rounded-xl border border-white/10 px-2.5 py-1.5 text-zinc-300 transition hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onBorrar(producto)}
          aria-label={`Borrar ${producto.nombre}`}
          className="rounded-xl border border-rose-500/25 px-2.5 py-1.5 text-rose-400 transition hover:bg-rose-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[.03] px-1 py-1.5">
      <p className="text-[9.5px] font-bold tracking-widest text-zinc-600 uppercase">{etiqueta}</p>
      <p className="tabular text-[13px] font-black text-white">{children}</p>
    </div>
  );
}

/**
 * La foto del producto: se sube al vuelo a `public/productos/` y lo que viaja
 * en el formulario es la ruta. Las imágenes vienen sin fondo, así que la vista
 * previa va sobre un cuadro a cuadros —como en cualquier editor— para que se
 * note qué parte es transparente.
 */
function CampoFoto({ producto }: { producto: ProductoInventario | null }) {
  const [imagen, setImagen] = useState(producto?.imagen ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  async function subir(f: File | undefined) {
    if (!f) return;
    setSubiendo(true);
    setFallo(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append("archivo", f);
      cuerpo.append("nombre", producto?.nombre ?? f.name);
      const r = await fetch("/api/productos/imagen", { method: "POST", body: cuerpo });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? "No se pudo subir la imagen.");
      setImagen(datos.ruta);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-3">
      <p className="mb-2 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
        Foto del producto
      </p>
      <input type="hidden" name="imagen" value={imagen} />

      <div className="flex items-center gap-3">
        <span
          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10"
          style={{
            backgroundColor: "#18181b",
            backgroundImage:
              "linear-gradient(45deg,#27272a 25%,transparent 25%,transparent 75%,#27272a 75%),linear-gradient(45deg,#27272a 25%,transparent 25%,transparent 75%,#27272a 75%)",
            backgroundSize: "14px 14px",
            backgroundPosition: "0 0, 7px 7px",
          }}
        >
          <span className="h-[72px] w-[72px]">
            <FotoProducto
              producto={{
                nombre: producto?.nombre ?? "Producto",
                imagen: imagen || null,
                color: producto?.color ?? "#FFC200",
              }}
            />
          </span>
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <BotonBar
              tipo="fantasma"
              ocupado={subiendo}
              onClick={() => archivo.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {imagen ? "Cambiar foto" : "Subir foto"}
            </BotonBar>
            {imagen && (
              <BotonBar tipo="peligro" onClick={() => setImagen("")}>
                <Trash2 className="h-4 w-4" />
                Quitar
              </BotonBar>
            )}
          </div>
          <p className="text-[11.5px] text-zinc-500">
            {imagen
              ? imagen.replace("/productos/", "")
              : "PNG sin fondo, hasta 5 MB. Si no hay foto se dibuja el chopp con el color."}
          </p>
          {fallo && <p className="text-[11.5px] font-bold text-rose-400">{fallo}</p>}
        </div>
      </div>

      <input
        ref={archivo}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(e) => subir(e.target.files?.[0])}
      />
    </div>
  );
}

function FichaProducto({
  producto,
  categorias,
  onCerrar,
}: {
  producto: ProductoInventario | null;
  categorias: { id: string; nombre: string }[];
  onCerrar: () => void;
}) {
  const { correr, error, ocupado } = useAccion();
  const [deBarril, setDeBarril] = useState(producto?.deBarril ?? false);

  async function guardar(datos: FormData) {
    await correr(() => guardarProducto(datos), onCerrar);
  }

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo={producto ? "Editar producto" : "Nuevo producto"}
      bajada={producto ? `${producto.nombre} ${producto.presentacion}` : "Se suma al punto de venta"}
    >
      <form action={guardar} className="space-y-4">
        {producto && <input type="hidden" name="id" value={producto.id} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <input name="nombre" required className="campo" defaultValue={producto?.nombre} />
          </Campo>
          <Campo etiqueta="Presentación" ayuda="330ML, 1L, Box 20…">
            <input
              name="presentacion"
              required
              className="campo"
              defaultValue={producto?.presentacion}
            />
          </Campo>
          <Campo etiqueta="Categoría">
            <select name="categoriaId" className="campo" defaultValue={producto?.categoriaId}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Color" ayuda="El del vaso dibujado, cuando no hay foto.">
            <input
              name="color"
              type="color"
              className="campo h-[42px] p-1"
              defaultValue={producto?.color ?? "#FFC200"}
            />
          </Campo>
          <Campo etiqueta="Precio de venta">
            <input
              name="precio"
              type="number"
              step="0.01"
              min="0"
              required
              className="campo tabular"
              defaultValue={producto?.precio}
            />
          </Campo>
          <Campo etiqueta="Costo">
            <input
              name="costo"
              type="number"
              step="0.01"
              min="0"
              className="campo tabular"
              defaultValue={producto?.costo ?? 0}
            />
          </Campo>
        </div>

        <CampoFoto producto={producto} />

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3">
          <input
            type="checkbox"
            name="deBarril"
            checked={deBarril}
            onChange={(e) => setDeBarril(e.target.checked)}
            className="h-4 w-4 accent-[#FFC200]"
          />
          <span className="text-[13px] font-bold text-zinc-200">
            Sale de barril
            <span className="block text-[11px] font-normal text-zinc-500">
              Descuenta litros de los barriles conectados en vez de unidades.
            </span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {deBarril ? (
            <Campo etiqueta="Litros por unidad" ayuda="Un chopp de 500 ml son 0,5 L.">
              <input
                name="litros"
                type="number"
                step="0.001"
                min="0"
                className="campo tabular"
                defaultValue={producto?.litros || 0.5}
              />
            </Campo>
          ) : (
            <>
              {!producto && (
                <Campo etiqueta="Stock inicial">
                  <input
                    name="stock"
                    type="number"
                    step="1"
                    min="0"
                    className="campo tabular"
                    defaultValue={0}
                  />
                </Campo>
              )}
              <Campo etiqueta="Stock mínimo" ayuda="Debajo de esto se marca para reponer.">
                <input
                  name="stockMinimo"
                  type="number"
                  step="1"
                  min="0"
                  className="campo tabular"
                  defaultValue={producto?.stockMinimo ?? 6}
                />
              </Campo>
            </>
          )}
        </div>

        <CasillaActivo nombre="activo" marcada={producto?.activo ?? true} />

        <Aviso mensaje={error} />

        <PieFormulario onCerrar={onCerrar}>
          <BotonBar submit ocupado={ocupado} className="flex-1">
            Guardar
          </BotonBar>
        </PieFormulario>
      </form>
    </Modal>
  );
}

const TIPOS = [
  { clave: "INGRESO" as const, etiqueta: "Ingreso", ayuda: "Llegó mercadería" },
  { clave: "MERMA" as const, etiqueta: "Merma", ayuda: "Rotura, cortesía o vencido" },
  { clave: "AJUSTE" as const, etiqueta: "Ajuste", ayuda: "Lo que dio el conteo físico" },
];

function DialogoStock({
  producto,
  onCerrar,
}: {
  producto: ProductoInventario;
  onCerrar: () => void;
}) {
  const { correr, error, ocupado } = useAccion();
  const [tipo, setTipo] = useState<"INGRESO" | "MERMA" | "AJUSTE">("INGRESO");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  const n = Number(cantidad || 0);
  const resultado =
    tipo === "INGRESO" ? producto.stock + n : tipo === "MERMA" ? producto.stock - n : n;

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo="Mover el stock"
      bajada={`${producto.nombre} ${producto.presentacion} · hay ${producto.stock}`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.clave}
              onClick={() => setTipo(t.clave)}
              className={`rounded-2xl border px-3 py-2.5 text-[13px] font-black transition ${
                tipo === t.clave
                  ? "border-[#FFC200] bg-[#FFC200]/15 text-[#FFC200]"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-zinc-500">{TIPOS.find((t) => t.clave === tipo)!.ayuda}</p>

        <Campo etiqueta={tipo === "AJUSTE" ? "Stock contado" : "Cantidad"}>
          <input
            type="number"
            min="0"
            step="1"
            autoFocus
            className="campo tabular text-lg"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Motivo (opcional)">
          <input
            className="campo"
            value={motivo}
            placeholder="Compra al proveedor, se rompió una caja…"
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>

        <p className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-[13px] text-zinc-400">
          Queda en{" "}
          <span className={`tabular font-black ${resultado < 0 ? "text-rose-400" : "text-white"}`}>
            {resultado}
          </span>{" "}
          unidades.
        </p>

        <Aviso mensaje={error} />

        <PieFormulario onCerrar={onCerrar}>
          <BotonBar
            ocupado={ocupado}
            deshabilitado={cantidad === ""}
            className="flex-1"
            onClick={() =>
              correr(
                () =>
                  ajustarStock({
                    productoId: producto.id,
                    tipo,
                    cantidad: n,
                    motivo: motivo || undefined,
                  }),
                onCerrar,
              )
            }
          >
            Registrar movimiento
          </BotonBar>
        </PieFormulario>
      </div>
    </Modal>
  );
}

function FichaBarril({
  barril,
  onCerrar,
}: {
  barril: DatosInventario["barriles"][number] | null;
  onCerrar: () => void;
}) {
  const { correr, error, ocupado } = useAccion();

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo={barril ? "Editar barril" : "Nuevo barril"}
      bajada={barril?.estilo ?? "Se suma a los litros disponibles del POS"}
      ancho="max-w-md"
    >
      <form action={async (datos) => {
          await correr(() => guardarBarril(datos), onCerrar);
        }} className="space-y-4">
        {barril && <input type="hidden" name="id" value={barril.id} />}

        <Campo etiqueta="Estilo">
          <input name="estilo" required className="campo" defaultValue={barril?.estilo} />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Capacidad (L)">
            <input
              name="capacidadL"
              type="number"
              step="0.1"
              min="1"
              required
              className="campo tabular"
              defaultValue={barril?.capacidadL ?? 50}
            />
          </Campo>
          <Campo etiqueta="Restante (L)">
            <input
              name="restanteL"
              type="number"
              step="0.1"
              min="0"
              className="campo tabular"
              defaultValue={barril?.restanteL ?? 50}
            />
          </Campo>
        </div>

        <label className="flex items-center gap-3 text-[13px] font-bold text-zinc-200">
          <input
            type="checkbox"
            name="conectado"
            defaultChecked={barril?.conectado ?? true}
            className="h-4 w-4 accent-[#FFC200]"
          />
          Conectado a la canilla
        </label>

        <Aviso mensaje={error} />

        <PieFormulario onCerrar={onCerrar}>
          <BotonBar submit ocupado={ocupado} className="flex-1">
            Guardar
          </BotonBar>
        </PieFormulario>
      </form>
    </Modal>
  );
}
