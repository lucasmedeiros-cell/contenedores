/**
 * Datos iniciales de Contenedores: usuarios, configuración, zonas, puestos,
 * arrendatarios y su historial de cobros.
 *
 * El armado del patio vive en `datos/patio.ts`, compartido con el botón
 * "Restablecer Demo" de la app, para que las dos vías carguen lo mismo.
 *
 * Ejecutar con: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sembrarPatio } from "./datos/patio";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Limpiando…");
  await prisma.pago.deleteMany();
  await prisma.arrendatario.deleteMany();
  await prisma.puesto.deleteMany();
  await prisma.zona.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.config.deleteMany();

  console.log("→ Usuarios…");
  const admin = await prisma.usuario.create({
    data: {
      email: "admin",
      nombre: "Admin",
      passwordHash: bcrypt.hashSync("1234", 10),
      rol: "ADMIN",
    },
  });
  await prisma.usuario.create({
    data: {
      email: "operador",
      nombre: "Operador",
      passwordHash: bcrypt.hashSync("1234", 10),
      rol: "OPERADOR",
    },
  });

  await prisma.config.createMany({
    data: [
      { clave: "nombre_lugar", valor: "Contenedores" },
      { clave: "subtitulo", valor: "Patio de Comidas" },
      { clave: "marca", valor: "easy pay · Alquileres" },
    ],
  });

  console.log("→ Zonas, puestos, arrendatarios y cobros…");
  await sembrarPatio(prisma, { registradoPor: admin.id, crearZonas: true });

  const [nPuestos, nArr, nPagos, nZonas] = await Promise.all([
    prisma.puesto.count(),
    prisma.arrendatario.count(),
    prisma.pago.count(),
    prisma.zona.count(),
  ]);

  console.log(`
✔ Patio listo.
  ${nZonas} zonas · ${nPuestos} puestos · ${nArr} arrendatarios · ${nPagos} cobros

  Ingresar con:  admin / 1234
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
