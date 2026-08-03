"use client";

import { useState } from "react";
import {
  Beer,
  Cigarette,
  CupSoda,
  Droplet,
  Pencil,
  Percent,
  Plus,
  Tags,
  Trash2,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Inventario } from "@cerveza/_lib/datos";
import { borrarCategoria, guardarCategoria } from "@cerveza/acciones-inventario";
import { Aviso, Campo, Modal } from "@/components/ui";
import { BotonBar, CasillaActivo, PieFormulario, Seccion, useAccion } from "@cerveza/_componentes/piezas";

const ICONOS: Record<string, ComponentType<{ className?: string }>> = {
  Beer,
  Percent,
  Droplet,
  CupSoda,
  Zap,
  Cigarette,
  Tags,
};

const NOMBRES_ICONO = Object.keys(ICONOS);

type Categoria = Inventario["categorias"][number];

/**
 * Lo que define cómo se ve el POS: las categorías del anillo. Los métodos de
 * cobro son fijos y se listan para que se sepa cuáles hay sin tener que abrir
 * el código.
 */
export default function Configuracion({
  categorias,
  metodos,
}: {
  categorias: Categoria[];
  metodos: string[];
}) {
  const [categoria, setCategoria] = useState<Categoria | "nueva" | null>(null);
  const { correr, error, ocupado } = useAccion();

  return (
    <div className="space-y-6">
      <Aviso mensaje={error} />

      <Seccion
        titulo="Categorías del punto de venta"
        accion={
          <BotonBar onClick={() => setCategoria("nueva")}>
            <Plus className="h-4 w-4" />
            Nueva
          </BotonBar>
        }
      >
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {categorias.map((c) => {
            const Icono = ICONOS[c.icono] ?? Beer;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  c.activa ? "border-white/10 bg-black" : "border-white/5 bg-black/50 opacity-60"
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFC200]/15 text-[#FFC200]">
                  <Icono className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black text-white">{c.nombre}</p>
                  <p className="text-[11px] text-zinc-500">
                    {c.productos} productos {c.activa ? "" : "· oculta"}
                  </p>
                </div>
                <button
                  onClick={() => setCategoria(c)}
                  aria-label={`Editar ${c.nombre}`}
                  className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Borrar la categoría ${c.nombre}?`)) {
                      correr(() => borrarCategoria(c.id));
                    }
                  }}
                  disabled={ocupado}
                  aria-label={`Borrar ${c.nombre}`}
                  className="rounded-xl border border-rose-500/25 p-2 text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="Formas de cobro">
        <div className="flex flex-wrap gap-2 p-4">
          {metodos.map((m) => (
            <span
              key={m}
              className="rounded-2xl border border-white/10 bg-black px-4 py-2 text-[13px] font-bold text-zinc-300"
            >
              {m}
            </span>
          ))}
        </div>
        <p className="px-5 pb-4 text-[12px] text-zinc-600">
          Son las que ofrece el punto de venta al cobrar. Para cambiarlas se toca
          <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-[11px]">METODOS_PAGO</code>
          en <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px]">src/lib/cerveceria.ts</code>.
        </p>
      </Seccion>

      {categoria && (
        <FichaCategoria
          categoria={categoria === "nueva" ? null : categoria}
          onCerrar={() => setCategoria(null)}
        />
      )}
    </div>
  );
}

function FichaCategoria({
  categoria,
  onCerrar,
}: {
  categoria: Categoria | null;
  onCerrar: () => void;
}) {
  const { correr, error, ocupado } = useAccion();
  const [icono, setIcono] = useState(categoria?.icono ?? "Beer");

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo={categoria ? "Editar categoría" : "Nueva categoría"}
      bajada="Es uno de los botones del anillo del punto de venta"
      ancho="max-w-md"
    >
      <form
        action={async (datos) => {
          await correr(() => guardarCategoria(datos), onCerrar);
        }}
        className="space-y-4"
      >
        {categoria && <input type="hidden" name="id" value={categoria.id} />}
        <input type="hidden" name="icono" value={icono} />

        <Campo etiqueta="Nombre">
          <input name="nombre" required autoFocus className="campo" defaultValue={categoria?.nombre} />
        </Campo>

        <Campo etiqueta="Ícono">
          <div className="flex flex-wrap gap-2">
            {NOMBRES_ICONO.map((n) => {
              const Icono = ICONOS[n];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIcono(n)}
                  aria-label={n}
                  className={`grid h-11 w-11 place-items-center rounded-2xl border transition ${
                    icono === n
                      ? "border-[#FFC200] bg-[#FFC200]/15 text-[#FFC200]"
                      : "border-white/10 bg-black text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icono className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </Campo>

        <Campo etiqueta="Orden" ayuda="Define en qué posición del anillo aparece.">
          <input
            name="orden"
            type="number"
            min="0"
            className="campo tabular"
            defaultValue={categoria ? undefined : 0}
          />
        </Campo>

        <CasillaActivo nombre="activa" marcada={categoria?.activa ?? true} />

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
