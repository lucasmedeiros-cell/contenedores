import { reportes } from "@cerveza/_lib/datos";
import Reportes from "@cerveza/_componentes/Reportes";
import { EncabezadoBar } from "@cerveza/_componentes/EncabezadoBar";

export const metadata = { title: "Reportes · Cervecería" };

const PERMITIDOS = [7, 30, 90];

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias: crudo } = await searchParams;
  const dias = PERMITIDOS.includes(Number(crudo)) ? Number(crudo) : 30;
  const datos = await reportes(dias);

  return (
    <>
      <EncabezadoBar titulo="Reportes" subtitulo={`Últimos ${dias} días de la cervecería`} />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Reportes datos={datos} dias={dias} />
      </main>
    </>
  );
}
