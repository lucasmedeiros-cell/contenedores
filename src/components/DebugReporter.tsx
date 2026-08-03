"use client";

import { useState } from "react";
import { Bug, Check, Loader2, Send, X } from "lucide-react";
import { Aviso, Campo } from "@/components/ui";

/**
 * Botón flotante para reportar bugs o mejoras. Abre un formulario corto y crea
 * un ticket en Tickets a través del proxy `/api/tickets/report` (la API key vive
 * solo en el servidor).
 *
 * `surface` dice desde dónde se reportó y va al contexto del ticket.
 *
 * El FAB va abajo a la DERECHA: a la izquierda se sentaría justo encima del
 * "Cerrar Sesión" del menú lateral, que ocupa esa esquina en todas las pantallas.
 */
export default function DebugReporter({ surface = "crm" }: { surface?: "web" | "crm" }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"error" | "optimizacion">("error");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [email, setEmail] = useState("desarrolloia@petroboxinc.com");
  const [imagen, setImagen] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    setAbierto(false);
    setTimeout(() => {
      setTipo("error");
      setTitulo("");
      setDescripcion("");
      setImagen(null);
      setTicket(null);
      setError(null);
    }, 200);
  }

  async function enviar() {
    setError(null);
    if (!titulo.trim() || !descripcion.trim()) {
      setError("Completá título y descripción.");
      return;
    }
    if (!email.trim()) {
      setError("Ingresá un correo de contacto.");
      return;
    }

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("tipo", tipo);
      fd.append("titulo", titulo.trim());
      fd.append("descripcion", descripcion.trim());
      fd.append("email", email.trim());
      fd.append("surface", surface);
      fd.append("url", typeof window !== "undefined" ? window.location.href : "");
      if (imagen) fd.append("imagen", imagen);

      const r = await fetch("/api/tickets/report", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "No se pudo enviar el reporte.");
      setTicket(data?.numero_ticket || "Reporte enviado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar el reporte.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Reportar un bug"
        title="Reportar un bug"
        className="no-imprimir fixed right-5 bottom-5 z-[85] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-zinc-100 shadow-[0_6px_20px_rgba(0,0,0,.45)] transition-transform hover:scale-[1.04] active:scale-95"
      >
        <Bug size={19} className="text-[#FFC200]" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="anim-hoja sm:anim-escalar max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-white">
                <Bug size={18} className="text-[#FFC200]" />
                Reportar bug o mejora
              </h3>
              <button
                onClick={cerrar}
                aria-label="Cerrar"
                className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {ticket ? (
              <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
                  <Check size={30} />
                </span>
                <p className="text-[15px] font-black text-white">¡Reporte enviado!</p>
                <p className="text-[13px] text-zinc-400">
                  Ticket <span className="font-bold text-[#FFC200]">{ticket}</span> creado en
                  Desarrollo. El equipo ya puede verlo.
                </p>
                <button
                  onClick={cerrar}
                  className="mt-2 rounded-full bg-[#FFC200] px-6 py-2.5 text-[13px] font-black text-black transition hover:brightness-110"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["error", "optimizacion"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`rounded-2xl border px-3 py-2.5 text-[13px] font-bold transition-colors ${
                        tipo === t
                          ? "border-[#FFC200] bg-[#FFC200] text-black"
                          : "border-white/10 bg-black/50 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {t === "error" ? "🐞 Error" : "✨ Mejora"}
                    </button>
                  ))}
                </div>

                <Campo etiqueta="Título">
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Resumen corto del problema"
                    className="campo"
                  />
                </Campo>

                <Campo etiqueta="Descripción">
                  <textarea
                    rows={4}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="¿Qué pasó? ¿Qué esperabas que pasara?"
                    className="campo resize-none"
                  />
                </Campo>

                <Campo etiqueta="Correo de contacto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="campo"
                  />
                </Campo>

                <Campo etiqueta="Captura (opcional)">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
                    className="mt-1.5 block w-full text-[12.5px] text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[12.5px] file:font-bold file:text-zinc-200"
                  />
                </Campo>

                <Aviso mensaje={error} />

                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#FFC200] px-5 py-3 text-[14px] font-black text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {enviando ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
                  {enviando ? "Enviando…" : "Enviar reporte"}
                </button>
                <p className="text-center text-[11px] text-zinc-600">
                  Se registra en Tickets (Desarrollo) · Proyecto Contenedores
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}


