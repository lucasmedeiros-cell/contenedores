import Link from "next/link";
import { Beer, Droplet, Receipt, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import { resumenDelDia } from "@cerveza/_lib/datos";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";
import { PanelResumen } from "@cerveza/_componentes/PanelResumen";

export const metadata = { title: "Resumen · Cervecería" };

export default async function PaginaResumen() {
  const resumen = await resumenDelDia();

  const tarjetas = [
    {
      etiqueta: "Ventas de hoy",
      valor: String(resumen.ventasHoy),
      pie: "tickets emitidos",
      icono: <Receipt className="h-6 w-6" />,
    },
    {
      etiqueta: "Recaudado hoy",
      valor: resumen.recaudadoHoy,
      moneda: true,
      pie: `ticket promedio ${Math.round(resumen.ticketPromedio)}`,
      icono: <Wallet className="h-6 w-6" />,
    },
    {
      etiqueta: "Litros disponibles",
      valor: `${resumen.litrosDisponibles.toLocaleString("es-BO")} L`,
      pie: `${resumen.litrosServidosHoy} L servidos hoy`,
      icono: <Droplet className="h-6 w-6" />,
    },
    {
      etiqueta: "Litros servidos hoy",
      valor: `${resumen.litrosServidosHoy.toLocaleString("es-BO")} L`,
      moneda: false,
      pie: "de los barriles conectados",
      icono: <Beer className="h-6 w-6" />,
    },
  ];

  return (
    <>
      <EncabezadoBar titulo="Resumen" subtitulo="Cómo va la cervecería hoy" />
      <main className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <PanelResumen resumen={resumen} tarjetas={tarjetas} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/cerveza/venta"
            className="flex items-center justify-center gap-3 rounded-3xl border-2 border-[#FFC200] bg-black px-6 py-6 text-xl font-black text-[#FFC200] shadow-[0_0_50px_-16px_rgba(255,194,0,.8)] transition hover:bg-[#FFC200] hover:text-black"
          >
            <Beer className="h-7 w-7" />
            Abrir el Punto de Venta
          </Link>
          <Link
            href="/cerveza/ventas"
            className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-zinc-950 px-6 py-6 text-xl font-black text-white transition hover:border-[#FFC200]/40"
          >
            <Receipt className="h-7 w-7 text-[#FFC200]" />
            Ver las ventas
          </Link>
        </div>

        {resumen.faltantes > 0 && (
          <Link
            href="/cerveza/inventario"
            className="flex items-center gap-3 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-300 transition hover:bg-rose-500/15"
          >
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <span className="text-[13.5px] font-bold">
              {resumen.faltantes} producto(s) por debajo del stock mínimo. Revisá el inventario.
            </span>
            <TrendingUp className="ml-auto hidden h-4 w-4 sm:block" />
          </Link>
        )}
      </main>
    </>
  );
}
