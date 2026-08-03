"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { accion, dec, type Resultado } from "@/lib/servidor";
import { MESES } from "@/lib/format";
import { invalidar } from "@alquileres/_lib/datos";

/** Suma un período a una fecha, según la periodicidad del alquiler. */
function siguienteVencimiento(desde: Date, periodicidad: string) {
  const d = new Date(desde);
  if (periodicidad === "DIARIO") d.setDate(d.getDate() + 1);
  else if (periodicidad === "SEMANAL") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// ---------------------------------------------------------------------------
// Cobros
// ---------------------------------------------------------------------------

const esquemaCobro = z.object({
  puestoId: z.string().min(1),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero"),
  metodoPago: z.string().trim().min(1, "Elegí el método de cobro"),
  // La fecha y el comprobante dejaron de pedirse en el cobro de dos pasos: sin
  // fecha se cobra hoy, y sin comprobante lo numera `comprobanteDe()`. Siguen
  // aceptándose porque la importación de CSV trae los dos.
  fecha: z.string().optional(),
  comprobante: z.string().trim().optional(),
  concepto: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});

/** Prefijo del comprobante por forma de cobro, como los del prototipo. */
const PREFIJOS: Record<string, string> = { Efectivo: "EFE", QR: "QRP" };

/**
 * Numera el comprobante: prefijo de la forma de cobro, fecha y las cuatro
 * últimas del id del pago, que ya es único. Antes esto lo escribía a mano quien
 * cobraba, y quedaban campos vacíos o dos pagos con el mismo número.
 */
function comprobanteDe(metodo: string, fecha: Date, id: string) {
  const dia = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}${String(
    fecha.getDate(),
  ).padStart(2, "0")}`;
  return `${PREFIJOS[metodo] ?? "PAG"}-${dia}-${id.slice(-4).toUpperCase()}`;
}

/**
 * Registra el cobro del alquiler. Como en el prototipo, además de guardar el
 * pago deja el puesto al día y corre el próximo vencimiento del arrendatario
 * un período hacia adelante.
 */
export async function registrarPago(datos: FormData): Promise<
  Resultado<{ transaccion: string; concepto: string; comprobante: string }>
> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const p = esquemaCobro.parse(Object.fromEntries(datos));

    const puesto = await prisma.puesto.findUnique({
      where: { id: p.puestoId },
      include: { arrendatario: true },
    });
    if (!puesto) throw new Error("El puesto no existe");
    if (!puesto.arrendatario) {
      throw new Error("El puesto no tiene un arrendatario asignado.");
    }

    const fecha = p.fecha ? new Date(`${p.fecha}T12:00:00`) : new Date();
    const concepto =
      p.concepto?.trim() || `Alquiler ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;

    const pago = await prisma.$transaction(async (tx) => {
      const creado = await tx.pago.create({
        data: {
          puestoId: puesto.id,
          fecha,
          monto: dec(p.monto),
          periodicidad: puesto.periodicidad,
          metodoPago: p.metodoPago,
          comprobante: p.comprobante || null,
          estado: "COBRADO",
          concepto,
          notas: p.notas || null,
          registradoPor: sesion.id,
        },
      });

      // El número sale del id recién creado, así que el comprobante se completa
      // en el mismo `$transaction`: o queda el que vino del CSV, o este.
      const comprobante =
        creado.comprobante || comprobanteDe(p.metodoPago, fecha, creado.id);
      if (!creado.comprobante) {
        await tx.pago.update({ where: { id: creado.id }, data: { comprobante } });
      }

      await tx.puesto.update({ where: { id: puesto.id }, data: { estado: "OCUPADO" } });
      await tx.arrendatario.update({
        where: { puestoId: puesto.id },
        data: {
          proximoVencimiento: siguienteVencimiento(
            puesto.arrendatario!.proximoVencimiento,
            puesto.periodicidad,
          ),
        },
      });

      return { ...creado, comprobante };
    });
    return {
      transaccion: pago.id.slice(-8).toUpperCase(),
      concepto,
      comprobante: pago.comprobante,
    };
  }, invalidar);
}

// ---------------------------------------------------------------------------
// Puestos
// ---------------------------------------------------------------------------

const esquemaPuesto = z.object({
  id: z.string().optional(),
  numero: z.string().trim().min(1, "El identificador es obligatorio"),
  zonaId: z.string().min(1, "Elegí una zona"),
  tamanoM2: z.coerce.number().positive("El tamaño debe ser mayor a cero"),
  precioBase: z.coerce.number().min(0),
  periodicidad: z.enum(["DIARIO", "SEMANAL", "MENSUAL"]),
  servicios: z.string().optional(),
  descripcion: z.string().trim().optional(),
});

export async function guardarPuesto(datos: FormData): Promise<Resultado<{ id: string }>> {
  return accion(async () => {
    await requerirSesion();
    const p = esquemaPuesto.parse(Object.fromEntries(datos));
    const servicios = (p.servicios ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    const comunes = {
      numero: p.numero,
      zonaId: p.zonaId,
      tamanoM2: p.tamanoM2,
      precioBase: dec(p.precioBase),
      periodicidad: p.periodicidad,
      servicios,
      descripcion: p.descripcion || null,
    };

    let id = p.id;
    if (id) {
      await prisma.puesto.update({ where: { id }, data: comunes });
    } else {
      // Se ubica abajo de todo, tanto en el mapa como en la grilla isométrica
      const ultimo = await prisma.puesto.findFirst({ orderBy: { posY: "desc" } });
      const creado = await prisma.puesto.create({
        data: {
          ...comunes,
          estado: "LIBRE",
          posX: 40,
          posY: (ultimo?.posY ?? 70) + 120,
          gridX: 0,
          gridY: (ultimo?.gridY ?? 0) + 3,
        },
      });
      id = creado.id;
    }
    return { id };
  }, invalidar);
}

export async function borrarPuesto(id: string): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    await prisma.puesto.delete({ where: { id } });
  }, invalidar);
}

/** Mueve uno o varios puestos en el plano isométrico. */
export async function moverPuesto(
  cambios: { id: string; gridX: number; gridY: number; rotacion: number }[],
): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    const datos = z
      .array(
        z.object({
          id: z.string().min(1),
          gridX: z.number().int().min(0).max(120),
          gridY: z.number().int().min(0).max(120),
          rotacion: z.number().int().refine((v) => [0, 90, 180, 270].includes(v)),
        }),
      )
      .parse(cambios);

    await prisma.$transaction(
      datos.map((c) =>
        prisma.puesto.update({
          where: { id: c.id },
          data: { gridX: c.gridX, gridY: c.gridY, rotacion: c.rotacion },
        }),
      ),
    );
  }, invalidar);
}

// ---------------------------------------------------------------------------
// Arrendatarios
// ---------------------------------------------------------------------------

const esquemaArrendatario = z.object({
  puestoId: z.string().min(1),
  negocio: z.string().trim().min(1, "Poné el nombre del comercio"),
  rubro: z.string().trim().min(1, "Elegí el rubro"),
  nombre: z.string().trim().min(1, "Poné el nombre del responsable"),
  telefono: z.string().trim().optional(),
  email: z.string().trim().optional(),
  montoAcordado: z.coerce.number().positive("El alquiler debe ser mayor a cero"),
  fechaInicio: z.string().min(1, "Elegí la fecha de inicio"),
  proximoVencimiento: z.string().min(1, "Elegí la fecha del próximo cobro"),
});

export async function asignarArrendatario(datos: FormData): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    const p = esquemaArrendatario.parse(Object.fromEntries(datos));

    const comunes = {
      negocio: p.negocio,
      rubro: p.rubro,
      nombre: p.nombre,
      telefono: p.telefono || null,
      email: p.email || null,
      montoAcordado: dec(p.montoAcordado),
      fechaInicio: new Date(`${p.fechaInicio}T12:00:00`),
      proximoVencimiento: new Date(`${p.proximoVencimiento}T12:00:00`),
    };

    await prisma.$transaction([
      prisma.arrendatario.upsert({
        where: { puestoId: p.puestoId },
        create: { puestoId: p.puestoId, ...comunes },
        update: comunes,
      }),
      prisma.puesto.update({ where: { id: p.puestoId }, data: { estado: "OCUPADO" } }),
    ]);
  }, invalidar);
}

/** Libera el puesto: borra el arrendatario y lo deja disponible. */
export async function liberarPuesto(puestoId: string): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    await prisma.$transaction([
      prisma.arrendatario.deleteMany({ where: { puestoId } }),
      prisma.puesto.update({ where: { id: puestoId }, data: { estado: "LIBRE" } }),
    ]);
  }, invalidar);
}

// ---------------------------------------------------------------------------
// Importación de pagos por CSV
// ---------------------------------------------------------------------------

export type FilaImportacion = {
  puesto: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  comprobante?: string;
  concepto?: string;
};

export async function importarPagos(filas: FilaImportacion[]): Promise<
  Resultado<{ importados: number; omitidos: { fila: number; motivo: string }[] }>
> {
  return accion(async () => {
    const sesion = await requerirSesion();
    const puestos = await prisma.puesto.findMany();
    const porNumero = new Map(puestos.map((p) => [p.numero.toUpperCase().trim(), p]));

    const omitidos: { fila: number; motivo: string }[] = [];
    let importados = 0;

    for (const [i, f] of filas.entries()) {
      const puesto = porNumero.get(String(f.puesto).toUpperCase().trim());
      if (!puesto) {
        omitidos.push({ fila: i + 1, motivo: `No existe el puesto “${f.puesto}”` });
        continue;
      }
      const fecha = new Date(`${f.fecha}T12:00:00`);
      if (Number.isNaN(fecha.getTime())) {
        omitidos.push({ fila: i + 1, motivo: `Fecha inválida “${f.fecha}”` });
        continue;
      }

      await prisma.pago.create({
        data: {
          puestoId: puesto.id,
          fecha,
          monto: dec(Number(f.monto)),
          periodicidad: puesto.periodicidad,
          metodoPago: f.metodoPago || "Otro",
          comprobante: f.comprobante || null,
          estado: "COBRADO",
          concepto: f.concepto || `Alquiler ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`,
          notas: "Importado desde CSV",
          registradoPor: sesion.id,
        },
      });
      if (puesto.estado === "PENDIENTE") {
        await prisma.puesto.update({ where: { id: puesto.id }, data: { estado: "OCUPADO" } });
      }
      importados++;
    }
    return { importados, omitidos };
  }, invalidar);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

/**
 * Vuelve el patio a los datos iniciales, como el botón "Restablecer Demo" del
 * prototipo. Borra puestos, arrendatarios y pagos, y recarga el juego de datos
 * original. No toca los usuarios.
 */
export async function restablecerDemo(): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    const { sembrarDemo } = await import("@alquileres/_lib/demo");
    await sembrarDemo();
  }, invalidar);
}

/** Guarda la posición de un puesto en el mapa del patio (en píxeles). */
export async function moverEnMapa(id: string, x: number, y: number): Promise<Resultado> {
  return accion(async () => {
    await requerirSesion();
    const p = z
      .object({ id: z.string().min(1), x: z.number().int().min(0).max(4000), y: z.number().int().min(0).max(4000) })
      .parse({ id, x, y });
    await prisma.puesto.update({ where: { id: p.id }, data: { posX: p.x, posY: p.y } });
  }, invalidar);
}
