/**
 * Chequeo de salud de la base: cuenta registros y busca incoherencias, tanto
 * del patio como de la cervecería. Corre contra PostgreSQL directo, sin pasar
 * por Next.
 *   npm run db:verificar
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const bs = (n: number) => `Bs ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`;

const filas = await prisma.$queryRaw<{ clave: string; valor: string }[]>`
  SELECT 'puestos' AS clave, count(*)::text AS valor FROM puestos
  UNION ALL SELECT 'arrendatarios', count(*)::text FROM arrendatarios
  UNION ALL SELECT 'pagos cobrados', count(*)::text FROM pagos WHERE estado = 'COBRADO'
  UNION ALL SELECT 'productos activos', count(*)::text FROM productos_bebida WHERE activo
  UNION ALL SELECT 'ventas del bar', count(*)::text FROM ventas_bebida WHERE estado = 'COMPLETADA'
  UNION ALL SELECT 'comandas abiertas', count(*)::text FROM ventas_bebida WHERE estado = 'ABIERTA'
  UNION ALL SELECT 'movimientos de stock', count(*)::text FROM movimientos_stock
  UNION ALL SELECT 'mesas', count(*)::text FROM mesas_bar WHERE activa
  UNION ALL SELECT 'barriles conectados', count(*)::text FROM barriles WHERE conectado
`;

console.log("CONTENIDO");
for (const f of filas) console.log(`  ${f.clave.padEnd(22)} ${f.valor.padStart(6)}`);

// --- Patio -----------------------------------------------------------------

const [patio] = await prisma.$queryRaw<
  { ocupados: number; libres: number; pendientes: number; proyeccion: string }[]
>`
  SELECT
    count(*) FILTER (WHERE estado = 'OCUPADO')::int AS ocupados,
    count(*) FILTER (WHERE estado = 'LIBRE')::int AS libres,
    count(*) FILTER (WHERE estado = 'PENDIENTE')::int AS pendientes,
    COALESCE((SELECT sum("montoAcordado") FROM arrendatarios), 0)::text AS proyeccion
  FROM puestos
`;
console.log(
  `\nPATIO\n  ${patio.ocupados} ocupados · ${patio.pendientes} por cobrar · ${patio.libres} libres` +
    `\n  proyección mensual ${pesos.format(Number(patio.proyeccion))}`,
);

// --- Cervecería ------------------------------------------------------------

const [bar] = await prisma.$queryRaw<
  { hoy: string; tickets: number; litros: number; enMesas: string }[]
>`
  SELECT
    COALESCE((SELECT sum(total) FROM ventas_bebida
              WHERE estado = 'COMPLETADA' AND fecha >= date_trunc('day', now())), 0)::text AS hoy,
    (SELECT count(*) FROM ventas_bebida
     WHERE estado = 'COMPLETADA' AND fecha >= date_trunc('day', now()))::int AS tickets,
    COALESCE((SELECT sum("restanteL") FROM barriles WHERE conectado), 0)::float AS litros,
    COALESCE((SELECT sum(total) FROM ventas_bebida WHERE estado = 'ABIERTA'), 0)::text AS "enMesas"
`;
console.log(
  `\nCERVECERÍA\n  hoy ${bs(Number(bar.hoy))} en ${bar.tickets} tickets · ${Math.round(bar.litros)} L en barril` +
    `\n  ${bs(Number(bar.enMesas))} sin cobrar en las mesas`,
);

// --- Chequeos de integridad ------------------------------------------------

const problemas: string[] = [];

/** Corre una consulta que cuenta filas problemáticas y arma el aviso. */
async function revisar(aviso: (n: number) => string, consulta: Promise<{ n: bigint }[]>) {
  const n = Number((await consulta)[0]?.n ?? 0);
  if (n > 0) problemas.push(aviso(n));
}

await revisar(
  (n) => `${n} arrendatario(s) apuntando a un puesto que no existe`,
  prisma.$queryRaw`
    SELECT count(*) AS n FROM arrendatarios a
    WHERE NOT EXISTS (SELECT 1 FROM puestos p WHERE p.id = a."puestoId")
  `,
);

await revisar(
  (n) => `${n} puesto(s) ocupados o pendientes sin arrendatario asignado`,
  prisma.$queryRaw`
    SELECT count(*) AS n FROM puestos p
    WHERE p.estado <> 'LIBRE'
      AND NOT EXISTS (SELECT 1 FROM arrendatarios WHERE "puestoId" = p.id)
  `,
);

await revisar(
  (n) => `${n} producto(s) con stock negativo`,
  prisma.$queryRaw`SELECT count(*) AS n FROM productos_bebida WHERE stock < 0`,
);

await revisar(
  (n) => `${n} barril(es) con litros fuera de rango`,
  prisma.$queryRaw`
    SELECT count(*) AS n FROM barriles WHERE "restanteL" > "capacidadL" OR "restanteL" < 0
  `,
);

await revisar(
  (n) => `${n} turno(s) de caja abiertos de más`,
  prisma.$queryRaw`
    SELECT (count(*) - 1) AS n FROM cajas_turno WHERE "cerradaEn" IS NULL HAVING count(*) > 1
  `,
);

await revisar(
  (n) => `${n} mesa(s) con más de una comanda abierta`,
  prisma.$queryRaw`
    SELECT count(*) AS n FROM (
      SELECT "mesaId" FROM ventas_bebida
      WHERE estado = 'ABIERTA' AND "mesaId" IS NOT NULL
      GROUP BY "mesaId" HAVING count(*) > 1
    ) x
  `,
);

await revisar(
  (n) => `${n} venta(s) cobradas sin ninguna línea`,
  prisma.$queryRaw`
    SELECT count(*) AS n FROM ventas_bebida v
    WHERE v.estado = 'COMPLETADA'
      AND NOT EXISTS (SELECT 1 FROM lineas_venta_bebida WHERE "ventaId" = v.id)
  `,
);

await revisar(
  (n) => `${n} venta(s) cuyo total no coincide con sus líneas`,
  prisma.$queryRaw`
    SELECT count(*) AS n FROM (
      SELECT v.id FROM ventas_bebida v
      JOIN lineas_venta_bebida l ON l."ventaId" = v.id
      WHERE v.estado = 'COMPLETADA'
      GROUP BY v.id, v.total, v.descuento
      HAVING abs(sum(l.total) - v.descuento - v.total) > 0.01
    ) x
  `,
);

console.log("\nCHEQUEOS");
if (problemas.length === 0) console.log("  Sin problemas");
else for (const p of problemas) console.log(`  ⚠ ${p}`);

await prisma.$disconnect();
process.exit(problemas.length ? 1 : 0);
