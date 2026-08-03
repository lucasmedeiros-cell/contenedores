"use client";

import { useState } from "react";
import { Coins, Lock, Unlock, Wallet } from "lucide-react";
import type { Turno } from "@cerveza/_lib/datos";
import { abrirCaja, cerrarCaja } from "@cerveza/acciones";
import { Aviso, Campo, Modal, Vacio } from "@/components/ui";
import { fechaHora, hora, plata } from "@/lib/format";
import { BotonBar, PieFormulario, Seccion, TarjetaBar, useAccion } from "@cerveza/_componentes/piezas";

/**
 * Caja del bar: el turno abierto con lo que lleva cobrado y el arqueo al
 * cerrarlo. La diferencia se calcula contra el efectivo, que es lo único que
 * de verdad está en el cajón.
 */
export default function Caja({ turno, historial }: { turno: Turno | null; historial: Turno[] }) {
  const [abriendo, setAbriendo] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [arqueo, setArqueo] = useState<number | null>(null);

  const cerrados = historial.filter((t) => t.cerradaEn);

  return (
    <div className="space-y-6">
      {turno ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaBar
              etiqueta="Fondo inicial"
              valor={plata(turno.montoInicial)}
              pie={`Apertura ${hora(turno.abiertaEn)}`}
              icono={<Wallet className="h-6 w-6" />}
            />
            <TarjetaBar
              etiqueta="Cobrado en el turno"
              valor={plata(turno.cobrado)}
              pie={`${turno.ventas} ventas`}
              icono={<Coins className="h-6 w-6" />}
            />
            <TarjetaBar
              etiqueta="Efectivo"
              valor={plata(turno.efectivo)}
              pie="lo que entró en el cajón"
            />
            <TarjetaBar
              etiqueta="Debería haber"
              valor={plata(turno.esperado)}
              pie="fondo + efectivo"
              tono="apagado"
            />
          </div>

          <Seccion
            titulo={`${turno.nombre} · abierta`}
            accion={
              <BotonBar tipo="peligro" onClick={() => setCerrando(true)}>
                <Lock className="h-4 w-4" />
                Cerrar caja y arquear
              </BotonBar>
            }
          >
            <div className="p-4">
              {turno.porMetodo.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-zinc-500">
                  Todavía no se cobró nada en este turno.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {turno.porMetodo.map((m) => (
                    <li key={m.metodo} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[13px] font-bold text-zinc-300">{m.metodo}</span>
                      <span className="text-[12px] text-zinc-500">{m.cantidad} tickets</span>
                      <span className="tabular text-[15px] font-black text-[#FFC200]">
                        {plata(m.monto)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[12px] text-zinc-600">
                Abrió {fechaHora(turno.abiertaEn)}
                {turno.abiertaPor ? ` · ${turno.abiertaPor}` : ""}
              </p>
            </div>
          </Seccion>
        </>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-zinc-950">
          <Vacio
            icono={<Unlock className="h-7 w-7" />}
            titulo="No hay ningún turno abierto"
            bajada="Abrí la caja con el fondo con el que arranca el día. Las ventas de hoy que todavía no tengan turno se enganchan sola."
            accion={
              <BotonBar onClick={() => setAbriendo(true)}>
                <Unlock className="h-4 w-4" />
                Abrir caja
              </BotonBar>
            }
          />
        </div>
      )}

      <Seccion titulo="Turnos anteriores" pegajosa>
        {cerrados.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-zinc-500">
            Todavía no se cerró ningún turno.
          </p>
        ) : (
          /* En pantalla grande no hay scroll horizontal, y sin él la fila de
             títulos puede quedarse pegada al scroll de la página. */
          <div className="overflow-x-auto lg:overflow-x-visible">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[10.5px] tracking-widest text-zinc-500 uppercase">
                <tr>
                  {[
                    "Caja",
                    "Apertura",
                    "Cierre",
                    "Ventas",
                    "Cobrado",
                    "Esperado",
                    "Contado",
                    "Diferencia",
                  ].map((t, i) => (
                    <th
                      key={t}
                      className={`bg-zinc-950 px-4 py-3 font-bold shadow-[inset_0_-1px_0_rgba(255,255,255,.1)] lg:sticky lg:top-[49px] lg:z-10 ${
                        i > 2 ? "text-right" : ""
                      }`}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cerrados.map((t) => {
                  const diferencia = (t.montoDeclarado ?? 0) - t.esperado;
                  return (
                    <tr key={t.id} className="transition hover:bg-white/[.03]">
                      <td className="px-4 py-3 font-bold text-white">{t.nombre}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {fechaHora(t.abiertaEn)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {t.cerradaEn ? fechaHora(t.cerradaEn) : "—"}
                      </td>
                      <td className="tabular px-4 py-3 text-right text-zinc-400">{t.ventas}</td>
                      <td className="tabular px-4 py-3 text-right font-bold text-[#FFC200]">
                        {plata(t.cobrado)}
                      </td>
                      <td className="tabular px-4 py-3 text-right text-zinc-400">
                        {plata(t.esperado)}
                      </td>
                      <td className="tabular px-4 py-3 text-right text-zinc-400">
                        {t.montoDeclarado === null ? "—" : plata(t.montoDeclarado)}
                      </td>
                      <td
                        className={`tabular px-4 py-3 text-right font-black ${
                          Math.abs(diferencia) < 0.005
                            ? "text-emerald-400"
                            : diferencia < 0
                              ? "text-rose-400"
                              : "text-[#FFC200]"
                        }`}
                      >
                        {diferencia > 0 ? "+" : ""}
                        {plata(diferencia, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      {abriendo && <DialogoApertura onCerrar={() => setAbriendo(false)} />}
      {cerrando && turno && (
        <DialogoCierre
          turno={turno}
          onCerrar={() => setCerrando(false)}
          onCerrada={(d) => {
            setCerrando(false);
            setArqueo(d);
          }}
        />
      )}

      <Modal
        abierta={arqueo !== null}
        onCerrar={() => setArqueo(null)}
        titulo="Caja cerrada"
        ancho="max-w-sm"
        pie={
          <BotonBar className="flex-1" onClick={() => setArqueo(null)}>
            Listo
          </BotonBar>
        }
      >
        <p className="text-center text-[13px] text-zinc-400">
          {arqueo !== null && Math.abs(arqueo) < 0.005
            ? "El arqueo cerró justo: no hay diferencia."
            : arqueo !== null && arqueo < 0
              ? `Faltan ${plata(-arqueo, true)} respecto de lo esperado.`
              : `Sobran ${plata(arqueo ?? 0, true)} respecto de lo esperado.`}
        </p>
      </Modal>
    </div>
  );
}

function DialogoApertura({ onCerrar }: { onCerrar: () => void }) {
  const { correr, error, ocupado } = useAccion();
  const [nombre, setNombre] = useState("Caja 1");
  const [monto, setMonto] = useState("200");

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo="Abrir la caja"
      bajada="El fondo es la plata con la que arranca el cajón"
      ancho="max-w-md"
    >
      <div className="space-y-4">
        <Campo etiqueta="Nombre de la caja">
          <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Fondo inicial">
          <input
            type="number"
            min="0"
            step="0.01"
            className="campo tabular text-lg"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </Campo>

        <Aviso mensaje={error} />

        <PieFormulario onCerrar={onCerrar}>
          <BotonBar
            className="flex-1"
            ocupado={ocupado}
            onClick={() =>
              correr(() => abrirCaja({ nombre, montoInicial: Number(monto || 0) }), onCerrar)
            }
          >
            <Unlock className="h-4 w-4" />
            Abrir caja
          </BotonBar>
        </PieFormulario>
      </div>
    </Modal>
  );
}

function DialogoCierre({
  turno,
  onCerrar,
  onCerrada,
}: {
  turno: Turno;
  onCerrar: () => void;
  onCerrada: (diferencia: number) => void;
}) {
  const { correr, error, ocupado } = useAccion();
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");

  const diferencia = contado === "" ? null : Number(contado) - turno.esperado;

  return (
    <Modal
      abierta
      onCerrar={onCerrar}
      titulo="Arqueo y cierre"
      bajada={`${turno.nombre} · abierta desde ${hora(turno.abiertaEn)}`}
    >
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black px-4 py-3 text-[13px]">
          <p className="flex justify-between text-zinc-400">
            <span>Fondo inicial</span>
            <span className="tabular">{plata(turno.montoInicial)}</span>
          </p>
          <p className="flex justify-between text-zinc-400">
            <span>Cobrado en efectivo</span>
            <span className="tabular">{plata(turno.efectivo)}</span>
          </p>
          <p className="flex justify-between border-t border-white/10 pt-1.5 font-black text-white">
            <span>Debería haber en el cajón</span>
            <span className="tabular text-[#FFC200]">{plata(turno.esperado)}</span>
          </p>
          <p className="pt-1 text-[11.5px] text-zinc-600">
            Lo cobrado por QR ({plata(turno.cobrado - turno.efectivo)}) no pasa por el cajón.
          </p>
        </div>

        <Campo etiqueta="Efectivo contado">
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            className="campo tabular text-lg"
            value={contado}
            placeholder={String(turno.esperado)}
            onChange={(e) => setContado(e.target.value)}
          />
        </Campo>

        {diferencia !== null && (
          <p
            className={`rounded-2xl border px-4 py-3 text-[13px] font-bold ${
              Math.abs(diferencia) < 0.005
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : diferencia < 0
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  : "border-[#FFC200]/30 bg-[#FFC200]/10 text-[#FFC200]"
            }`}
          >
            {Math.abs(diferencia) < 0.005
              ? "Cierra justo."
              : diferencia < 0
                ? `Faltan ${plata(-diferencia, true)}.`
                : `Sobran ${plata(diferencia, true)}.`}
          </p>
        )}

        <Campo etiqueta="Observaciones">
          <textarea
            rows={2}
            className="campo"
            value={notas}
            placeholder="Se pagó al proveedor de hielo, etc."
            onChange={(e) => setNotas(e.target.value)}
          />
        </Campo>

        <Aviso mensaje={error} />

        <PieFormulario onCerrar={onCerrar}>
          <BotonBar
            tipo="peligro"
            className="flex-1"
            ocupado={ocupado}
            deshabilitado={contado === ""}
            onClick={() =>
              correr(
                () =>
                  cerrarCaja({
                    id: turno.id,
                    montoDeclarado: Number(contado || 0),
                    notas: notas || undefined,
                  }),
                (datos) => onCerrada((datos as { diferencia: number } | undefined)?.diferencia ?? 0),
              )
            }
          >
            <Lock className="h-4 w-4" />
            Cerrar el turno
          </BotonBar>
        </PieFormulario>
      </div>
    </Modal>
  );
}
