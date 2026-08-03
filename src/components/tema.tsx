"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * El selector Día/Noche aparece en la barra lateral, en el cajón del menú
 * móvil y en el encabezado: tres montajes del mismo control.
 *
 * Cada uno tenía su propio `useState`, así que al tocar uno los otros seguían
 * resaltando la opción vieja. Acá el estado vive fuera de React —en la clase
 * del `<html>`, que es donde ya lo dejaba el script del layout antes de
 * pintar— y los tres se suscriben al mismo lugar.
 */

export type Tema = "dia" | "noche";

const CLAVE_TEMA = "patio_tema";

const suscriptores = new Set<() => void>();

function suscribir(avisar: () => void) {
  suscriptores.add(avisar);
  return () => {
    suscriptores.delete(avisar);
  };
}

function leer(): Tema {
  return document.documentElement.classList.contains("light-mode") ? "dia" : "noche";
}

/** En el servidor no hay documento; se pinta el tema oscuro, que es el base. */
const leerEnServidor = (): Tema => "noche";

export function useTema(): [Tema, (valor: Tema) => void] {
  const tema = useSyncExternalStore(suscribir, leer, leerEnServidor);

  function cambiar(valor: Tema) {
    document.documentElement.classList.toggle("light-mode", valor === "dia");
    try {
      localStorage.setItem(CLAVE_TEMA, valor);
    } catch {
      // Modo privado sin storage: el tema igual se aplica, solo no se recuerda.
    }
    for (const avisar of suscriptores) avisar();
  }

  return [tema, cambiar];
}

// ---------------------------------------------------------------------------

const OPCIONES = [
  ["dia", "Día", Sun],
  ["noche", "Noche", Moon],
] as const;

/** El par de botones Día/Noche. Se monta en el menú y en el encabezado. */
export function SelectorTema({ className = "" }: { className?: string }) {
  const [tema, cambiar] = useTema();

  return (
    <div className={`flex gap-1 rounded-2xl border border-white/10 bg-black p-1 ${className}`}>
      {OPCIONES.map(([valor, texto, Icono]) => (
        <button
          key={valor}
          type="button"
          onClick={() => cambiar(valor)}
          aria-pressed={tema === valor}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            tema === valor ? "bg-[#FFC200] text-black shadow-md" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Icono className="h-3.5 w-3.5" />
          {texto}
        </button>
      ))}
    </div>
  );
}
