"use client";

import { useMemo, useState } from "react";
import {
  Beer,
  Cigarette,
  ClipboardList,
  CupSoda,
  Droplet,
  Loader2,
  Minus,
  Percent,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { registrarVentaBebida } from "@cerveza/acciones";
import type { CatalogoPos, ProductoPos } from "@cerveza/_lib/datos";
import { Aviso, Campo, Modal, Vacio } from "@/components/ui";
import { plata } from "@/lib/format";
import { BotonBar, SelectorMetodo, useAccion } from "@cerveza/_componentes/piezas";
import TicketVenta, { type DatosTicket } from "@cerveza/_componentes/TicketVenta";
import Comanda, { type DatosComanda } from "@cerveza/_componentes/Comanda";
import { FotoProducto } from "@cerveza/_componentes/FotoProducto";
import {
  Carrusel,
  Puntos,
  Ruleta,
  SelectorModo,
  useGiro,
  useModo,
} from "@cerveza/_componentes/modos";

// ---------------------------------------------------------------------------

const ICONOS: Record<string, ComponentType<{ className?: string }>> = {
  Beer,
  Percent,
  Droplet,
  CupSoda,
  Zap,
  Cigarette,
};

/** Cuántas unidades más se pueden cargar de un producto sin quedar en rojo. */
function disponible(p: ProductoPos, litrosLibres: number) {
  if (!p.deBarril) return p.stock;
  if (p.litros <= 0) return Infinity;
  return Math.floor(litrosLibres / p.litros);
}

// ---------------------------------------------------------------------------

export default function PuntoDeVenta({ catalogo }: { catalogo: CatalogoPos }) {
  const { categorias, productos, litrosDisponibles, metodos } = catalogo;
  const { correr, error, setError, ocupado } = useAccion();
  const [modo, setModo] = useModo("pos", "ruleta");

  const [categoria, setCategoria] = useState(
    categorias.find((c) => c.nombre === "Cervezas")?.id ?? categorias[0]?.id ?? "",
  );
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [cobrando, setCobrando] = useState(false);
  const [ticket, setTicket] = useState<DatosTicket | null>(null);
  const [comanda, setComanda] = useState<DatosComanda | null>(null);
  const [vista, setVista] = useState<"ticket" | "comanda">("ticket");

  // Datos del cobro
  const [metodo, setMetodo] = useState(metodos[0] ?? "Efectivo");
  const [descuento, setDescuento] = useState(0);
  const [recibido, setRecibido] = useState("");

  const lista = useMemo(
    () => productos.filter((p) => p.categoriaId === categoria),
    [productos, categoria],
  );

  const { indice, giro, setIndice, girar } = useGiro(
    lista.length,
    !cobrando && !ticket && (modo === "ruleta" || modo === "carrusel"),
  );

  const pedido = useMemo(
    () =>
      productos
        .filter((p) => (cantidades[p.id] ?? 0) > 0)
        .map((p) => ({ producto: p, cantidad: cantidades[p.id] })),
    [productos, cantidades],
  );

  const total = useMemo(
    () => pedido.reduce((s, l) => s + l.cantidad * l.producto.precio, 0),
    [pedido],
  );
  const unidades = useMemo(() => pedido.reduce((s, l) => s + l.cantidad, 0), [pedido]);

  /** Litros que ya se llevó el pedido, para no dejar cargar de más. */
  const litrosEnPedido = useMemo(
    () => pedido.reduce((s, l) => s + (l.producto.deBarril ? l.producto.litros * l.cantidad : 0), 0),
    [pedido],
  );
  const litrosLibres = Math.max(0, litrosDisponibles - litrosEnPedido);

  const aCobrar = Math.max(0, total - descuento);
  const vuelto = metodo === "Efectivo" && recibido ? Number(recibido) - aCobrar : null;

  function cambiarCantidad(id: string, delta: number) {
    setError(null);
    setCantidades((c) => {
      const producto = productos.find((p) => p.id === id)!;
      const actual = c[id] ?? 0;
      if (delta > 0) {
        const tope = disponible(producto, litrosLibres);
        if (tope < delta) {
          setError(
            producto.deBarril
              ? "No quedan litros en los barriles conectados."
              : `Sin stock de ${producto.nombre}.`,
          );
          return c;
        }
      }
      const nueva = Math.max(0, actual + delta);
      const copia = { ...c };
      if (nueva === 0) delete copia[id];
      else copia[id] = nueva;
      return copia;
    });
  }

  function limpiar() {
    setCantidades({});
    setDescuento(0);
    setRecibido("");
  }

  /** Cobra en el mostrador: saca el ticket y la comanda para la barra. */
  async function cobrar() {
    const items = pedido.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad }));
    const lineas = pedido.map((l) => ({
      nombre: `${l.producto.nombre} ${l.producto.presentacion}`,
      cantidad: l.cantidad,
      precioUnit: l.producto.precio,
      total: l.cantidad * l.producto.precio,
    }));

    await correr(
      () => registrarVentaBebida({ items, metodo, descuento }),
      (datos) => {
        const d = datos as { ticket: string; total: number } | undefined;
        const fecha = new Date().toISOString();
        setTicket({
          ticket: d?.ticket ?? "—",
          fecha,
          total: d?.total ?? aCobrar,
          descuento,
          metodo,
          cliente: null,
          lineas,
          recibido: metodo === "Efectivo" && recibido ? Number(recibido) : null,
        });
        setComanda({
          ticket: d?.ticket ?? "—",
          fecha,
          lineas: lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })),
        });
        // La comanda es lo primero que se lleva a la barra: se muestra ella.
        setVista("comanda");
        limpiar();
        setCobrando(false);
      },
    );
  }

  const botonCobrar = (
    <>
      {error && !cobrando && <div className="mb-2">{<Aviso mensaje={error} />}</div>}
      <button
        onClick={() => setCobrando(true)}
        disabled={unidades === 0 || ocupado}
        className="cta-venta flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#FFC200] bg-black px-6 py-4 text-lg font-black text-[#FFC200] shadow-[0_0_40px_-12px_rgba(255,194,0,.7)] transition hover:bg-[#FFC200] hover:text-black disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-[#FFC200]"
      >
        {ocupado ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShoppingCart className="h-6 w-6" />}
        Proceder con venta
        {unidades > 0 && (
          <span className="tabular rounded-lg bg-[#FFC200] px-2.5 py-1 text-sm font-black text-black">
            {plata(total)}
          </span>
        )}
      </button>
    </>
  );

  const gajosCategoria = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    Icono: ICONOS[c.icono] ?? Beer,
  }));

  const centroRuleta = (
    <>
      <p className="text-[12px] font-bold tracking-[.12em] whitespace-nowrap text-zinc-500 uppercase">
        Litros disponibles
      </p>
      <p className="tabular text-[40px] leading-none font-black text-white">
        {Math.floor(litrosLibres).toLocaleString("es-BO")} L
      </p>
      <div className="mt-[8px]">
        <Puntos cantidad={lista.length} indice={indice} />
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <div className="mb-1 flex w-full items-center justify-between gap-2">
          <TiraCategorias
            categorias={categorias}
            activa={categoria}
            onElegir={(id) => {
              setCategoria(id);
              setIndice(0);
            }}
            oculta={modo === "ruleta"}
          />
          <SelectorModo valor={modo} onElegir={setModo} className="ml-auto" />
        </div>

        {modo === "ruleta" ? (
          <Ruleta
            items={lista}
            giro={giro}
            onIndice={setIndice}
            girar={girar}
            categorias={gajosCategoria}
            categoriaActiva={categoria}
            onCategoria={(id) => {
              setCategoria(id);
              setIndice(0);
            }}
            centro={centroRuleta}
            pie={botonCobrar}
            vacio={
              <div className="text-center text-[20px] font-bold text-zinc-500">
                No hay productos en esta categoría.
              </div>
            }
            render={(p, activo) => (
              <GajoProducto
                producto={p}
                activo={activo}
                cantidad={cantidades[p.id] ?? 0}
                restante={disponible(p, litrosLibres)}
                onCambiar={(d) => cambiarCantidad(p.id, d)}
              />
            )}
          />
        ) : (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div
              className={`min-h-0 flex-1 ${
                modo === "carrusel" ? "flex items-center" : "overflow-y-auto"
              }`}
            >
              {lista.length === 0 ? (
                <Vacio
                  icono={<Beer className="h-7 w-7" />}
                  titulo="No hay productos en esta categoría"
                  bajada="Elegí otra categoría o cargá productos desde el inventario."
                />
              ) : modo === "carrusel" ? (
                <Carrusel
                  items={lista}
                  indice={indice}
                  onIndice={setIndice}
                  girar={girar}
                  render={(p, activo) => (
                    <TarjetaProducto
                      producto={p}
                      activo={activo}
                      cantidad={cantidades[p.id] ?? 0}
                      restante={disponible(p, litrosLibres)}
                      onCambiar={(d) => cambiarCantidad(p.id, d)}
                    />
                  )}
                />
              ) : modo === "tarjeta" ? (
                <div className="grid gap-3 p-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {lista.map((p) => (
                    <TarjetaProducto
                      key={p.id}
                      producto={p}
                      activo={false}
                      cantidad={cantidades[p.id] ?? 0}
                      restante={disponible(p, litrosLibres)}
                      onCambiar={(d) => cambiarCantidad(p.id, d)}
                    />
                  ))}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {lista.map((p) => (
                    <FilaProducto
                      key={p.id}
                      producto={p}
                      cantidad={cantidades[p.id] ?? 0}
                      restante={disponible(p, litrosLibres)}
                      onCambiar={(d) => cambiarCantidad(p.id, d)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 border-t border-white/10 pt-3">
              <p className="tabular shrink-0 text-[12px] font-bold tracking-widest text-zinc-500 uppercase">
                Litros disponibles
                <span className="ml-2 text-[18px] text-white">
                  {Math.floor(litrosLibres).toLocaleString("es-BO")} L
                </span>
              </p>
              <div className="w-full max-w-md">{botonCobrar}</div>
            </div>
          </div>
        )}
      </div>

      {/* --- Pedido en curso --- */}
      <aside className="hidden w-[300px] shrink-0 flex-col rounded-3xl border border-white/10 bg-zinc-950 xl:flex">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-[12px] font-bold tracking-widest text-zinc-400 uppercase">Pedido</p>
          {unidades > 0 && (
            <button
              onClick={limpiar}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 transition hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vaciar
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {pedido.length === 0 ? (
            <p className="px-2 py-10 text-center text-[13px] text-zinc-600">
              Tocá el + de un producto para empezar.
            </p>
          ) : (
            <ul className="space-y-2">
              {pedido.map(({ producto, cantidad }) => (
                <li
                  key={producto.id}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black px-3 py-2"
                >
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: producto.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-white">{producto.nombre}</p>
                    <p className="tabular text-[11px] text-zinc-500">
                      {cantidad} × {plata(producto.precio)}
                    </p>
                  </div>
                  <p className="tabular text-[13px] font-black text-[#FFC200]">
                    {plata(cantidad * producto.precio)}
                  </p>
                  <button
                    onClick={() => cambiarCantidad(producto.id, -1)}
                    aria-label={`Quitar uno de ${producto.nombre}`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1 border-t border-white/10 p-4">
          <div className="flex items-center justify-between text-[13px] text-zinc-400">
            <span>{unidades} unidades</span>
            <span className="tabular">{plata(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold tracking-widest text-zinc-500 uppercase">
              Total
            </span>
            <span className="tabular text-2xl font-black text-[#FFC200]">{plata(total)}</span>
          </div>
        </div>
      </aside>

      {/* --- Cobro --- */}
      <Modal
        abierta={cobrando}
        onCerrar={() => setCobrando(false)}
        titulo="Cobrar la venta"
        bajada={`${unidades} unidades · ${plata(total)}`}
      >
        <div className="space-y-4">
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {pedido.map(({ producto, cantidad }) => (
              <li
                key={producto.id}
                className="flex items-center justify-between gap-2 text-[13px] text-zinc-300"
              >
                <span className="truncate">
                  {cantidad} × {producto.nombre} {producto.presentacion}
                </span>
                <span className="tabular shrink-0 font-bold">
                  {plata(cantidad * producto.precio)}
                </span>
              </li>
            ))}
          </ul>

          <SelectorMetodo metodos={metodos} valor={metodo} onElegir={setMetodo} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Descuento">
              <input
                type="number"
                min={0}
                max={total}
                className="campo tabular"
                value={descuento || ""}
                onChange={(e) => setDescuento(Math.max(0, Math.min(total, Number(e.target.value))))}
                placeholder="0"
              />
            </Campo>

            {metodo === "Efectivo" && (
              <Campo
                etiqueta="Paga con"
                ayuda={vuelto !== null && vuelto >= 0 ? `Vuelto ${plata(vuelto, true)}` : undefined}
              >
                <input
                  type="number"
                  min={0}
                  className="campo tabular"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                  placeholder={String(aCobrar)}
                />
              </Campo>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#FFC200]/30 bg-[#FFC200]/10 px-4 py-3">
            <span className="text-[12px] font-bold tracking-widest text-[#FFC200] uppercase">
              A cobrar
            </span>
            <span className="tabular text-2xl font-black text-[#FFC200]">{plata(aCobrar)}</span>
          </div>

          {vuelto !== null && vuelto < 0 && (
            <Aviso mensaje={`Faltan ${plata(-vuelto, true)} para cubrir la cuenta.`} />
          )}
          <Aviso mensaje={error} />

          <BotonBar onClick={cobrar} ocupado={ocupado} className="w-full">
            <ShoppingCart className="h-4 w-4" />
            Cobrar {plata(aCobrar)}
          </BotonBar>
        </div>
      </Modal>

      {/* --- Comanda y ticket --- */}
      <Modal
        abierta={!!ticket}
        onCerrar={() => setTicket(null)}
        titulo={vista === "comanda" ? "Comanda para la barra" : "Venta registrada"}
        bajada={ticket?.ticket}
        ancho="max-w-sm"
        pie={
          <>
            <BotonBar
              onClick={() => setVista((v) => (v === "ticket" ? "comanda" : "ticket"))}
              tipo="fantasma"
              className="flex-1"
            >
              <ClipboardList className="h-4 w-4" />
              {vista === "ticket" ? "Ver comanda" : "Ver ticket"}
            </BotonBar>
            <BotonBar onClick={() => window.print()} tipo="fantasma" className="flex-1">
              <Printer className="h-4 w-4" />
              Imprimir
            </BotonBar>
            <BotonBar onClick={() => setTicket(null)} className="flex-1">
              <Beer className="h-4 w-4" />
              Nueva venta
            </BotonBar>
          </>
        }
      >
        {vista === "comanda"
          ? comanda && <Comanda datos={comanda} />
          : ticket && <TicketVenta datos={ticket} />}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Las categorías como tira de pastillas, para los modos que no son ruleta. */
function TiraCategorias({
  categorias,
  activa,
  onElegir,
  oculta,
}: {
  categorias: { id: string; nombre: string; icono: string }[];
  activa: string;
  onElegir: (id: string) => void;
  oculta: boolean;
}) {
  if (oculta) return <span />;

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {categorias.map((c) => {
        const Icono = ICONOS[c.icono] ?? Beer;
        const esta = c.id === activa;
        return (
          <button
            key={c.id}
            onClick={() => onElegir(c.id)}
            aria-pressed={esta}
            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[12.5px] font-bold transition ${
              esta
                ? "border-[#FFC200] bg-[#FFC200]/15 text-[#FFC200]"
                : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <Icono className="h-4 w-4" />
            {c.nombre}
          </button>
        );
      })}
    </div>
  );
}

/** El +/− de cantidad. Va igual en el gajo, en la tarjeta y en la fila. */
function Stepper({
  cantidad,
  agotado,
  onCambiar,
  tono,
}: {
  cantidad: number;
  agotado: boolean;
  onCambiar: (delta: number) => void;
  tono: "gajo-activo" | "oscuro";
}) {
  const fondo = tono === "gajo-activo" ? "bg-black/85" : "border border-white/10 bg-black/70";

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 ${fondo}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onCambiar(-1)}
        aria-label="Restar"
        className="grid h-7 w-7 place-items-center rounded-lg text-[#FFC200] transition hover:bg-white/10"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="tabular text-sm font-bold text-white">Cant. {cantidad}</span>
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label="Sumar"
        disabled={agotado}
        className="grid h-7 w-7 place-items-center rounded-lg text-[#FFC200] transition hover:bg-white/10 disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * El contenido de un gajo del anillo. Vive dentro de un `foreignObject`, así
 * que las medidas están en unidades del lienzo (1100 × 740) y escalan solas.
 */
function GajoProducto({
  producto,
  activo,
  cantidad,
  restante,
  onCambiar,
}: {
  producto: ProductoPos;
  activo: boolean;
  cantidad: number;
  restante: number;
  onCambiar: (delta: number) => void;
}) {
  const agotado = restante <= 0;

  const precio = (
    <span
      className={`tabular inline-block rounded-[11px] px-[13px] py-[3px] text-[22px] font-black ${
        activo ? "bg-black text-[#FFC200]" : "border-[2.5px] border-[#FFC200] text-[#FFC200]"
      }`}
    >
      {plata(producto.precio)}
    </span>
  );

  const stepper = (
    <div
      className={`flex items-center justify-between gap-[8px] rounded-[11px] px-[8px] py-[4px] ${
        activo ? "bg-black/85" : "border border-white/15 bg-black/70"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onCambiar(-1)}
        aria-label="Restar"
        className="grid h-[26px] w-[26px] place-items-center rounded-[8px] text-[#FFC200]"
      >
        <Minus className="h-[16px] w-[16px]" />
      </button>
      <span className="tabular text-[16px] font-bold text-white">Cant. {cantidad}</span>
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label="Sumar"
        disabled={agotado}
        className="grid h-[26px] w-[26px] place-items-center rounded-[8px] text-[#FFC200] disabled:opacity-30"
      >
        <Plus className="h-[16px] w-[16px]" />
      </button>
    </div>
  );

  /** Lo que queda, cuando es poco: en un POS eso decide si se promete o no. */
  const aviso = agotado
    ? "Sin stock"
    : !producto.deBarril && producto.stock <= 5
      ? `Quedan ${producto.stock}`
      : null;

  if (activo) {
    return (
      <div className={`flex h-full w-full items-center gap-[10px] ${agotado ? "opacity-60" : ""}`}>
        <span className="block h-[112px] w-[92px] shrink-0">
          <FotoProducto producto={producto} oscuro />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[28px] leading-[.9] font-black tracking-tight text-black uppercase">
            {producto.nombre}
          </p>
          <p className="text-[16px] font-bold text-black/60">
            {producto.presentacion}
            {aviso && <span className="text-[#B91C1C]"> · {aviso}</span>}
          </p>
          <div className="mt-[7px]">{precio}</div>
          <div className="mt-[7px]">{stepper}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-[4px] px-[6px] text-center ${
        agotado ? "opacity-60" : ""
      }`}
    >
      <span className="block h-[70px] w-[58px]">
        <FotoProducto producto={producto} />
      </span>
      <p className="text-[24px] leading-[.9] font-black tracking-tight text-white uppercase">
        {producto.nombre}
      </p>
      <p className="text-[14px] font-bold text-zinc-500">
        {producto.presentacion}
        {aviso && <span className="text-rose-400"> · {aviso}</span>}
      </p>
      {precio}
      <div className="w-full">{stepper}</div>
    </div>
  );
}

/** La ficha rectangular, para los modos tarjeta y carrusel. */
function TarjetaProducto({
  producto,
  activo,
  cantidad,
  restante,
  onCambiar,
}: {
  producto: ProductoPos;
  activo: boolean;
  cantidad: number;
  restante: number;
  onCambiar: (delta: number) => void;
}) {
  const agotado = restante <= 0;

  return (
    <div
      className={`w-full rounded-[2rem] border-2 p-3.5 text-center transition-all duration-500 ${
        activo
          ? "border-[#FFC200] bg-gradient-to-b from-[#FFC200] to-[#E6A700] text-black shadow-[0_0_60px_-12px_rgba(255,194,0,.8)]"
          : "border-[#FFC200]/40 bg-zinc-950/80 text-white hover:border-[#FFC200]"
      } ${agotado ? "grayscale-[.5]" : ""}`}
    >
      <span className="mx-auto mb-1.5 block h-16 w-14">
        <FotoProducto producto={producto} oscuro={activo} />
      </span>

      <p
        className={`text-lg leading-tight font-black tracking-tight ${activo ? "text-black" : "text-white"}`}
      >
        {producto.nombre.toUpperCase()}
      </p>
      <p className={`text-xs font-bold ${activo ? "text-black/70" : "text-zinc-500"}`}>
        {producto.presentacion}
      </p>

      <p
        className={`tabular mt-2 inline-block rounded-xl px-4 py-1.5 text-xl font-black ${
          activo ? "bg-black text-[#FFC200]" : "border-2 border-[#FFC200] text-[#FFC200]"
        }`}
      >
        {plata(producto.precio)}
      </p>

      <p
        className={`mt-1.5 text-[11px] font-bold ${
          agotado ? "text-rose-500" : activo ? "text-black/70" : "text-zinc-500"
        }`}
      >
        {agotado
          ? "Sin stock"
          : producto.deBarril
            ? `${restante === Infinity ? "—" : restante} de barril`
            : `${producto.stock} en depósito`}
      </p>

      <div className="mt-2">
        <Stepper
          cantidad={cantidad}
          agotado={agotado}
          onCambiar={onCambiar}
          tono={activo ? "gajo-activo" : "oscuro"}
        />
      </div>
    </div>
  );
}

/** La fila del modo lista: mucha densidad, todo a la vista. */
function FilaProducto({
  producto,
  cantidad,
  restante,
  onCambiar,
}: {
  producto: ProductoPos;
  cantidad: number;
  restante: number;
  onCambiar: (delta: number) => void;
}) {
  const agotado = restante <= 0;

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
        cantidad > 0 ? "border-[#FFC200]/50 bg-[#FFC200]/[.06]" : "border-white/10 bg-zinc-950"
      } ${agotado ? "opacity-50" : ""}`}
    >
      {producto.imagen ? (
        <span className="h-10 w-10 shrink-0">
          <FotoProducto producto={producto} />
        </span>
      ) : (
        <span
          className="h-9 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: producto.color }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-black text-white">{producto.nombre}</p>
        <p className="text-[11.5px] text-zinc-500">
          {producto.presentacion}
          {agotado
            ? " · sin stock"
            : producto.deBarril
              ? " · de barril"
              : ` · ${producto.stock} en depósito`}
        </p>
      </div>
      <p className="tabular shrink-0 text-[15px] font-black text-[#FFC200]">
        {plata(producto.precio)}
      </p>
      <div className="w-[150px] shrink-0">
        <Stepper cantidad={cantidad} agotado={agotado} onCambiar={onCambiar} tono="oscuro" />
      </div>
    </li>
  );
}
