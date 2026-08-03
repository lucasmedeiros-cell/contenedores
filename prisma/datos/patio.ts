import { Prisma, type PrismaClient } from "@prisma/client";
import puestosV13 from "./puestos-v13.json";

/**
 * El juego de datos del patio, en un solo lugar.
 *
 * Lo usan las dos vías que lo cargan: `prisma/seed.ts` al preparar la base y
 * `sembrarDemo()` desde el botón "Restablecer Demo". Antes cada una tenía su
 * copia de la geometría, los colores y el armado de puestos, y ya habían
 * divergido —el seed guardaba `descripcion` y las medidas del módulo, el botón
 * no—, así que restablecer la demo devolvía un patio distinto del sembrado.
 */

const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));

// ---------------------------------------------------------------------------
// Geometría
// ---------------------------------------------------------------------------

/**
 * El mapa del prototipo es una grilla de píxeles: las x van 40/210/380/550 y
 * las y 70/190/310/430/550. Se traduce a celdas para el plano isométrico.
 */
const COLUMNAS = [40, 210, 380, 550];
const FILAS = [70, 190, 310, 430, 550];

function aGrilla(x: number, y: number) {
  const col = COLUMNAS.indexOf(x) >= 0 ? COLUMNAS.indexOf(x) : Math.round((x - 40) / 170);
  const fila = FILAS.indexOf(y) >= 0 ? FILAS.indexOf(y) : Math.round((y - 70) / 120);
  return { gridX: Math.max(0, col) * 4, gridY: Math.max(0, fila) * 3 };
}

/** El suelo de una zona en la grilla isométrica. Lo reusa el tipo del plano. */
export type GeoZona = {
  textura: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  cubierta: boolean;
};

export const ZONAS: Record<string, GeoZona & { orden: number }> = {
  "Acceso Principal": { textura: "adoquin", gridX: 0, gridY: 0, gridW: 8, gridH: 3, cubierta: false, orden: 1 },
  "Zona Central": { textura: "cemento", gridX: 8, gridY: 0, gridW: 8, gridH: 3, cubierta: true, orden: 2 },
  "Paso Peatonal": { textura: "cemento", gridX: 0, gridY: 3, gridW: 16, gridH: 3, cubierta: false, orden: 3 },
  Terraza: { textura: "deck", gridX: 0, gridY: 6, gridW: 12, gridH: 3, cubierta: false, orden: 4 },
  "Patio de Luces": { textura: "cesped", gridX: 12, gridY: 6, gridW: 4, gridH: 6, cubierta: false, orden: 5 },
  "Módulo Gastronómico Sur": { textura: "deck", gridX: 0, gridY: 9, gridW: 12, gridH: 3, cubierta: true, orden: 6 },
  "Terraza Peatonal": { textura: "deck", gridX: 0, gridY: 12, gridW: 8, gridH: 3, cubierta: false, orden: 7 },
  "Paso Central": { textura: "cemento", gridX: 8, gridY: 12, gridW: 8, gridH: 3, cubierta: false, orden: 8 },
  "Zona Principal (Frente)": { textura: "adoquin", gridX: 0, gridY: 15, gridW: 8, gridH: 3, cubierta: false, orden: 9 },
  "Planta Alta / Mezzanine": { textura: "cemento", gridX: 8, gridY: 15, gridW: 8, gridH: 3, cubierta: true, orden: 10 },
};

/** El prototipo no guarda color ni ícono; se derivan del rubro para el plano. */
const POR_RUBRO: Record<string, { color: string; icono: string }> = {
  Mexicana: { color: "#15803d", icono: "🌮" },
  Hamburguesas: { color: "#c2410c", icono: "🍔" },
  Pizzas: { color: "#b91c1c", icono: "🍕" },
  Heladería: { color: "#0e7490", icono: "🍦" },
  Sushi: { color: "#1d4ed8", icono: "🍣" },
  Cervecería: { color: "#a16207", icono: "🍺" },
  Cafetería: { color: "#78350f", icono: "☕" },
  Parrilla: { color: "#991b1b", icono: "🥩" },
  Caribeña: { color: "#7e22ce", icono: "🫓" },
  Asiática: { color: "#1d4ed8", icono: "🥢" },
  Saludable: { color: "#4d7c0f", icono: "🥗" },
};

function estiloDe(rubro?: string) {
  if (!rubro) return { color: "#52525b", icono: null as string | null };
  const clave = Object.keys(POR_RUBRO).find((k) => rubro.toLowerCase().includes(k.toLowerCase()));
  const e = clave ? POR_RUBRO[clave] : null;
  return { color: e?.color ?? "#e2711d", icono: e?.icono ?? null };
}

const ESTADOS = { libre: "LIBRE", ocupado: "OCUPADO", pendiente: "PENDIENTE" } as const;
const PERIODICIDADES = { diario: "DIARIO", semanal: "SEMANAL", mensual: "MENSUAL" } as const;

// ---------------------------------------------------------------------------
// Historial de pagos
// ---------------------------------------------------------------------------

/** Meses de historial hacia atrás. El dashboard grafica los últimos seis. */
const MESES_DE_HISTORIAL = 10;

// Lo que se cobra en el patio: efectivo o QR. Ver `METODOS` en dialogos.tsx.
const METODOS = ["Efectivo", "QR"];
const PREFIJOS: Record<string, string> = {
  Efectivo: "EFE",
  QR: "QRP",
};

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Serie fija: dos corridas dan exactamente el mismo historial. */
function azarDe(inicial: number) {
  let s = inicial;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

type PagoGenerado = {
  fecha: Date;
  monto: Prisma.Decimal;
  periodicidad: "DIARIO" | "SEMANAL" | "MENSUAL";
  metodoPago: string;
  comprobante: string;
  estado: "COBRADO" | "PENDIENTE";
  concepto: string;
};

/**
 * Un cobro por mes desde que arrancó el contrato hasta hoy.
 *
 * El mes corriente se trata según el estado del puesto: un puesto al día lo
 * tiene cobrado y uno en mora deja el cobro asentado como PENDIENTE, que es lo
 * que hace que la pantalla de pagos tenga algo en las dos solapas y que el
 * anillo de cumplimiento no dé siempre 100 %.
 */
function historialDe(
  indice: number,
  monto: number,
  inicioContrato: Date,
  estado: "LIBRE" | "OCUPADO" | "PENDIENTE",
  periodicidad: "DIARIO" | "SEMANAL" | "MENSUAL",
): PagoGenerado[] {
  const azar = azarDe(20260801 + indice * 7919);
  const hoy = new Date();
  const pagos: PagoGenerado[] = [];

  for (let atras = MESES_DE_HISTORIAL; atras >= 0; atras--) {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
    if (mes < new Date(inicioContrato.getFullYear(), inicioContrato.getMonth(), 1)) continue;

    const esMesActual = atras === 0;
    if (esMesActual && estado === "PENDIENTE") {
      // Se emitió el cobro pero todavía no entró.
      pagos.push({
        fecha: new Date(mes.getFullYear(), mes.getMonth(), 1, 12),
        monto: dec(monto),
        periodicidad,
        metodoPago: "Transferencia",
        comprobante: `TRF-${mes.getFullYear()}${String(mes.getMonth() + 1).padStart(2, "0")}${String(indice + 1).padStart(2, "0")}`,
        estado: "PENDIENTE",
        concepto: `Alquiler ${NOMBRES_MES[mes.getMonth()]} ${mes.getFullYear()}`,
      });
      continue;
    }

    // Se cobra entre el 1 y el 8, que es la ventana del patio.
    const dia = 1 + Math.floor(azar() * 8);
    const metodo = METODOS[Math.floor(azar() * METODOS.length)];
    // Alguna variación en el monto: ajustes, expensas, un mes con descuento.
    const ajuste = azar() < 0.18 ? 1 + (azar() - 0.5) * 0.12 : 1;

    pagos.push({
      fecha: new Date(mes.getFullYear(), mes.getMonth(), dia, 12),
      monto: dec(Math.round((monto * ajuste) / 10) * 10),
      periodicidad,
      metodoPago: metodo,
      comprobante: `${PREFIJOS[metodo]}-${mes.getFullYear()}${String(mes.getMonth() + 1).padStart(2, "0")}${String(indice + 1).padStart(2, "0")}`,
      estado: "COBRADO",
      concepto: `Alquiler ${NOMBRES_MES[mes.getMonth()]} ${mes.getFullYear()}`,
    });
  }

  return pagos;
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

type ClientePrisma = Pick<PrismaClient, "zona" | "puesto" | "arrendatario" | "pago">;

/** Borra el patio y lo vuelve a armar. No toca usuarios ni configuración. */
export async function sembrarPatio(
  db: ClientePrisma,
  opciones: { registradoPor?: string | null; crearZonas?: boolean } = {},
) {
  const { registradoPor = null, crearZonas = false } = opciones;

  await db.pago.deleteMany();
  await db.arrendatario.deleteMany();
  await db.puesto.deleteMany();

  if (crearZonas) {
    await db.zona.deleteMany();
    for (const [nombre, geo] of Object.entries(ZONAS)) {
      await db.zona.create({ data: { nombre, ...geo } });
    }
  }

  const zonas = new Map((await db.zona.findMany()).map((z) => [z.nombre, z.id]));

  let indice = 0;
  for (const p of puestosV13) {
    const zonaId = zonas.get(p.zona);
    if (!zonaId) continue;

    const { gridX, gridY } = aGrilla(p.posicionMap.x, p.posicionMap.y);
    const estilo = estiloDe(p.arrendatario?.rubro);
    const estado = ESTADOS[p.estado as keyof typeof ESTADOS] ?? "LIBRE";
    const periodicidad = PERIODICIDADES[p.periodicidad as keyof typeof PERIODICIDADES] ?? "MENSUAL";

    const puesto = await db.puesto.create({
      data: {
        numero: p.numero,
        zonaId,
        tamanoM2: p.tamanoM2,
        precioBase: dec(p.precioBase),
        periodicidad,
        estado,
        servicios: p.servicios,
        descripcion: (p as { descripcion?: string }).descripcion ?? null,
        posX: p.posicionMap.x,
        posY: p.posicionMap.y,
        gridX,
        gridY,
        ancho: 3,
        largo: 1,
        alto: 1,
        colorBase: estilo.color,
        icono: estilo.icono,
      },
    });

    if (!p.arrendatario) continue;

    const a = p.arrendatario;
    const inicio = new Date(`${a.fechaInicio}T12:00:00`);
    await db.arrendatario.create({
      data: {
        puestoId: puesto.id,
        negocio: a.negocio,
        rubro: a.rubro,
        nombre: a.nombre,
        telefono: a.telefono,
        email: a.email,
        fechaInicio: inicio,
        proximoVencimiento: new Date(`${a.proximoVencimiento}T12:00:00`),
        montoAcordado: dec(a.montoAcordado),
      },
    });

    for (const pago of historialDe(indice++, a.montoAcordado, inicio, estado, periodicidad)) {
      await db.pago.create({ data: { puestoId: puesto.id, ...pago, registradoPor } });
    }
  }
}
