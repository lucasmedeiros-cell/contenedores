/**
 * Lo que se ve mientras el panel trae los datos: la misma silueta de la
 * pantalla, con el barrido del esqueleto, para que no salte el contenido
 * cuando llega.
 */
export default function Cargando() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Tarjetas de arriba */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="esqueleto h-2.5 w-28" />
                <div className="esqueleto h-6 w-32" />
              </div>
              <div className="esqueleto h-10 w-10 rounded-full" />
            </div>
            <div className="esqueleto mb-3 h-2.5 w-24" />
            <div className="esqueleto h-2 w-full rounded-full" />
            <div className="esqueleto mt-3 h-2.5 w-36" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Evolución de pagos */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl">
            <div className="mb-5 flex items-start gap-3">
              <div className="esqueleto h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <div className="esqueleto h-4 w-44" />
                <div className="esqueleto h-2.5 w-72" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="esqueleto h-[200px] w-[200px] rounded-full" />
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/50 px-4 py-3.5"
                  >
                    <div className="esqueleto h-3 w-32" />
                    <div className="esqueleto h-3 w-20" />
                    <div className="esqueleto h-6 w-12 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/50 px-4 py-3"
                >
                  <div className="esqueleto h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="esqueleto h-2 w-20" />
                    <div className="esqueleto h-3.5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial mensual */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="esqueleto h-3.5 w-56" />
              <div className="flex gap-1.5">
                <div className="esqueleto h-8 w-8 rounded-xl" />
                <div className="esqueleto h-8 w-8 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-white/5 bg-black/50 py-4"
                >
                  <div className="esqueleto h-2.5 w-16" />
                  <div className="esqueleto h-[46px] w-[46px] rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estado del patio */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl xl:col-span-1">
          <div className="mb-4 flex items-start gap-3">
            <div className="esqueleto h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <div className="esqueleto h-4 w-36" />
              <div className="esqueleto h-2.5 w-48" />
            </div>
          </div>
          <div className="mb-4 flex gap-3 border-b border-white/10 pb-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="esqueleto h-2.5 w-24" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="esqueleto aspect-square rounded-2xl" />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="esqueleto h-2.5 w-40" />
            <div className="esqueleto h-8 w-36 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
