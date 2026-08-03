/**
 * Datos iniciales de la cervecería. Es un sistema aparte del de alquileres: no
 * toca ninguna de sus tablas.
 *
 * No siembra un stock inventado y aparte un historial suelto: arranca de un
 * inventario inicial hace noventa días y **simula** la operación día por día
 * —ventas, reposiciones, mermas y ajustes—, guardando el saldo que quedó
 * después de cada movimiento. El stock de hoy es el resultado de esa corrida,
 * así que el inventario y el libro de movimientos cierran entre sí.
 *
 * Ejecutar con: npm run db:seed-cerveceria
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));
const redondear = (n: number) => Math.round(n * 100) / 100;

/** Días de operación a simular. Los reportes ofrecen 7, 30 y 90. */
const DIAS = 90;

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

const CATEGORIAS = [
  { nombre: "Promos", icono: "Percent", orden: 1 },
  { nombre: "Cervezas", icono: "Beer", orden: 2 },
  { nombre: "Agua", icono: "Droplet", orden: 3 },
  { nombre: "Gaseosas", icono: "CupSoda", orden: 4 },
  { nombre: "Energy", icono: "Zap", orden: 5 },
  { nombre: "Cigarrillos", icono: "Cigarette", orden: 6 },
];

type Semilla = {
  nombre: string;
  presentacion: string;
  categoria: string;
  precio: number;
  costo: number;
  litros?: number;
  deBarril?: boolean;
  /** Unidades en depósito al empezar la simulación. */
  stockInicial?: number;
  stockMinimo?: number;
  /** Cuánto se vende, en peso relativo. */
  tiron: number;
  color?: string;
};

const PRODUCTOS: Semilla[] = [
  // --- Cervezas de barril ---
  { nombre: "Chopp Paceña", presentacion: "330ML", categoria: "Cervezas", precio: 25, costo: 9, litros: 0.33, tiron: 20, color: "#FFC200" },
  { nombre: "Chopp Lager", presentacion: "550ML", categoria: "Cervezas", precio: 35, costo: 14, litros: 0.55, tiron: 14, color: "#FFB300" },
  { nombre: "Torre Paceña", presentacion: "2,5L", categoria: "Cervezas", precio: 140, costo: 62, litros: 2.5, tiron: 5, color: "#E2A812" },
  { nombre: "Chopp Negra", presentacion: "500ML", categoria: "Cervezas", precio: 38, costo: 15, litros: 0.5, tiron: 8, color: "#8A5A00" },
  { nombre: "Jarra Rubia", presentacion: "1L", categoria: "Cervezas", precio: 60, costo: 25, litros: 1, tiron: 9, color: "#FFD24A" },
  { nombre: "Chopp IPA", presentacion: "473ML", categoria: "Cervezas", precio: 40, costo: 17, litros: 0.473, tiron: 7, color: "#F59E0B" },

  // --- Promos ---
  { nombre: "2x Chopp Paceña", presentacion: "2 × 330ML", categoria: "Promos", precio: 45, costo: 18, litros: 0.66, tiron: 11, color: "#FFC200" },
  { nombre: "Balde x6", presentacion: "6 × 330ML", categoria: "Promos", precio: 130, costo: 54, litros: 1.98, tiron: 7, color: "#E2A812" },
  { nombre: "Torre + Picada", presentacion: "2,5L + tabla", categoria: "Promos", precio: 190, costo: 88, litros: 2.5, tiron: 4, color: "#D97706" },

  // --- Sin alcohol y kiosco ---
  { nombre: "Agua Mineral", presentacion: "500ML", categoria: "Agua", precio: 10, costo: 4, deBarril: false, stockInicial: 240, stockMinimo: 24, tiron: 9, color: "#38BDF8" },
  { nombre: "Agua con Gas", presentacion: "500ML", categoria: "Agua", precio: 12, costo: 5, deBarril: false, stockInicial: 144, stockMinimo: 24, tiron: 4, color: "#7DD3FC" },
  { nombre: "Coca Cola", presentacion: "500ML", categoria: "Gaseosas", precio: 15, costo: 7, deBarril: false, stockInicial: 240, stockMinimo: 24, tiron: 10, color: "#EF4444" },
  { nombre: "Sprite", presentacion: "500ML", categoria: "Gaseosas", precio: 15, costo: 7, deBarril: false, stockInicial: 144, stockMinimo: 24, tiron: 5, color: "#4ADE80" },
  { nombre: "Jarra Coca Cola", presentacion: "1,5L", categoria: "Gaseosas", precio: 35, costo: 15, deBarril: false, stockInicial: 96, stockMinimo: 12, tiron: 4, color: "#DC2626" },
  { nombre: "Red Bull", presentacion: "250ML", categoria: "Energy", precio: 25, costo: 13, deBarril: false, stockInicial: 120, stockMinimo: 12, tiron: 5, color: "#3B82F6" },
  { nombre: "Speed", presentacion: "500ML", categoria: "Energy", precio: 20, costo: 10, deBarril: false, stockInicial: 96, stockMinimo: 12, tiron: 3, color: "#A3E635" },
  { nombre: "Marlboro", presentacion: "Box 20", categoria: "Cigarrillos", precio: 30, costo: 22, deBarril: false, stockInicial: 90, stockMinimo: 10, tiron: 4, color: "#E5E7EB" },
  { nombre: "Lucky Strike", presentacion: "Box 20", categoria: "Cigarrillos", precio: 28, costo: 20, deBarril: false, stockInicial: 60, stockMinimo: 10, tiron: 2, color: "#F87171" },
];

const BARRILES = [
  { estilo: "Paceña", capacidadL: 500 },
  { estilo: "Lager", capacidadL: 500 },
  { estilo: "Negra", capacidadL: 200 },
  { estilo: "IPA", capacidadL: 200 },
];

/** El salón: doce mesas en tres sectores. */
const MESAS = [
  ...Array.from({ length: 6 }, (_, i) => ({ numero: String(i + 1), sector: "Salón", capacidad: i < 4 ? 4 : 6 })),
  ...Array.from({ length: 4 }, (_, i) => ({ numero: String(i + 7), sector: "Patio", capacidad: 6 })),
  { numero: "11", sector: "Barra", capacidad: 2 },
  { numero: "12", sector: "Barra", capacidad: 2 },
];

const CLIENTES = [
  { nombre: "Consumidor final", notas: "Cliente por defecto del mostrador" },
  { nombre: "Marcelo Suárez", telefono: "700 12345", documento: "4821993" },
  { nombre: "Ana Rocha", telefono: "700 98765", documento: "6712004" },
  { nombre: "Peña Los Andes", telefono: "700 55512", notas: "Reserva los viernes" },
  { nombre: "Javier Mendoza", telefono: "701 33210", documento: "5530871" },
  { nombre: "Carla Quispe", telefono: "712 44098", documento: "9012338" },
  { nombre: "Equipo Bolívar", telefono: "700 77123", notas: "Vienen después de los partidos" },
  { nombre: "Rodrigo Vaca", telefono: "715 90233", documento: "7788120" },
  { nombre: "Familia Ledezma", telefono: "702 11876", notas: "Mesa grande los domingos" },
  { nombre: "Sofía Camacho", telefono: "709 65432", documento: "6650012" },
];

/** Con repeticiones, para que el efectivo pese más que el resto. */
const METODOS = ["Efectivo", "Efectivo", "Efectivo", "Efectivo", "QR", "QR", "QR", "Tarjeta", "Transferencia"];
const CAJERAS = ["Ana", "Lucía", "Marcos", "Ana", "Lucía"];

// ---------------------------------------------------------------------------

/** Serie fija: dos corridas del seed dan exactamente la misma historia. */
let semilla = 20260802;
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
};
const entre = (a: number, b: number) => a + Math.floor(azar() * (b - a + 1));
const alguno = <T,>(xs: T[]) => xs[entre(0, xs.length - 1)];

let contador = 0;
const nuevoId = (p: string) => `${p}${String(++contador).padStart(7, "0")}`;

function aLas(diasAtras: number, hora: number, minuto: number) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------

type Fila = Record<string, unknown>;

async function enTandas(
  nombre: string,
  filas: Fila[],
  crear: (tanda: never[]) => Promise<unknown>,
  tamano = 500,
) {
  for (let i = 0; i < filas.length; i += tamano) {
    await crear(filas.slice(i, i + tamano) as never[]);
  }
  console.log(`   ${nombre}: ${filas.length}`);
}

async function main() {
  console.log("→ Limpiando la cervecería…");
  await prisma.movimientoStock.deleteMany();
  await prisma.lineaVentaBebida.deleteMany();
  await prisma.ventaBebida.deleteMany();
  await prisma.cajaTurno.deleteMany();
  await prisma.mesaBar.deleteMany();
  await prisma.clienteBar.deleteMany();
  await prisma.productoBebida.deleteMany();
  await prisma.categoriaBebida.deleteMany();
  await prisma.barril.deleteMany();

  console.log("→ Categorías, productos y barriles…");
  const cats = new Map<string, string>();
  for (const c of CATEGORIAS) {
    const creada = await prisma.categoriaBebida.create({ data: c });
    cats.set(c.nombre, creada.id);
  }

  // Estado que la simulación va moviendo.
  const productos = PRODUCTOS.map((p, i) => ({
    ...p,
    id: nuevoId("prod-"),
    orden: i,
    deBarril: p.deBarril ?? true,
    stockMinimo: p.stockMinimo ?? 6,
    stock: p.stockInicial ?? 0,
  }));
  const barriles = BARRILES.map((b) => ({ ...b, id: nuevoId("barr-"), restanteL: b.capacidadL }));

  await prisma.productoBebida.createMany({
    data: productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      presentacion: p.presentacion,
      categoriaId: cats.get(p.categoria)!,
      precio: dec(p.precio),
      costo: dec(p.costo),
      litros: p.litros ?? 0,
      deBarril: p.deBarril,
      stock: p.stock,
      stockMinimo: p.stockMinimo,
      color: p.color ?? "#FFC200",
      orden: p.orden,
    })),
  });
  await prisma.barril.createMany({
    data: barriles.map((b) => ({
      id: b.id,
      estilo: b.estilo,
      capacidadL: b.capacidadL,
      restanteL: b.restanteL,
      conectado: true,
    })),
  });

  console.log("→ Mesas y clientes…");
  const mesas = MESAS.map((m, i) => ({ ...m, id: nuevoId("mesa-"), orden: i }));
  const clientes = CLIENTES.map((c) => ({ ...c, id: nuevoId("clie-") }));
  await prisma.mesaBar.createMany({ data: mesas });
  await prisma.clienteBar.createMany({ data: clientes });

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------
  console.log(`→ Simulando ${DIAS} días de operación…`);

  const turnos: Fila[] = [];
  const ventas: Fila[] = [];
  const lineas: Fila[] = [];
  const movimientos: Fila[] = [];

  /** Elige producto según su tirón, así el top de ventas tiene forma. */
  const ruleta = productos.flatMap((p) => Array<typeof p>(p.tiron).fill(p));

  let ticket = 0;
  const anio = new Date().getFullYear();

  for (let dia = DIAS; dia >= 0; dia--) {
    const fecha = aLas(dia, 8, 0);
    const finDeSemana = fecha.getDay() === 0 || fecha.getDay() === 5 || fecha.getDay() === 6;
    const cajera = CAJERAS[(DIAS - dia) % CAJERAS.length];

    // --- Turno de caja del día ---
    const turnoId = nuevoId("caja-");
    const abierto = dia === 0;
    const inicial = 200;
    turnos.push({
      id: turnoId,
      nombre: `Caja ${((DIAS - dia) % 2) + 1}`,
      abiertaEn: aLas(dia, 17, 0),
      cerradaEn: abierto ? null : aLas(dia - 1, 0, 30),
      montoInicial: dec(inicial),
      montoDeclarado: null as Prisma.Decimal | null,
      abiertaPor: cajera,
      cerradaPor: abierto ? null : cajera,
      notas: null as string | null,
    });

    let efectivoDelTurno = 0;

    // --- Reposición de barriles: se cambia el que quedó por debajo del 15 % ---
    for (const b of barriles) {
      if (b.restanteL > b.capacidadL * 0.15) continue;
      const carga = redondear(b.capacidadL - b.restanteL);
      b.restanteL = b.capacidadL;
      movimientos.push({
        id: nuevoId("mov-"),
        tipo: "INGRESO",
        barrilId: b.id,
        cantidad: carga,
        unidad: "L",
        saldo: b.restanteL,
        motivo: `Barril ${b.estilo} nuevo conectado`,
        usuario: cajera,
        fecha: aLas(dia, 16, entre(0, 40)),
      });
    }

    // --- Reposición de kiosco: una compra semanal de lo que esté bajo ---
    if (dia % 7 === 0) {
      for (const p of productos) {
        if (p.deBarril || p.stock > p.stockMinimo * 3) continue;
        const carga = Math.max(24, Math.ceil((p.stockInicial ?? 48) * 0.6));
        p.stock += carga;
        movimientos.push({
          id: nuevoId("mov-"),
          tipo: "INGRESO",
          productoId: p.id,
          cantidad: carga,
          unidad: "u",
          saldo: p.stock,
          motivo: "Compra a proveedor",
          usuario: cajera,
          fecha: aLas(dia, 16, entre(0, 40)),
        });
      }
    }

    // --- Alguna merma o ajuste, de vez en cuando ---
    if (azar() < 0.12) {
      const p = alguno(productos.filter((x) => !x.deBarril && x.stock > 4));
      const baja = entre(1, 3);
      p.stock -= baja;
      movimientos.push({
        id: nuevoId("mov-"),
        tipo: azar() < 0.6 ? "MERMA" : "AJUSTE",
        productoId: p.id,
        cantidad: -baja,
        unidad: "u",
        saldo: p.stock,
        motivo: azar() < 0.6 ? "Botella rota en barra" : "Ajuste por conteo",
        usuario: cajera,
        fecha: aLas(dia, 16, entre(41, 59)),
      });
    }

    // --- Ventas de la noche ---
    // El día de hoy va aparte: la jornada está en curso, así que se reparte
    // desde el mediodía hasta esta hora. Si no, corriendo el seed a media
    // tarde el panel de "hoy" queda en blanco, que es la primera pantalla que
    // se muestra.
    const ahora = new Date();
    const desdeHora = dia === 0 ? 12 : 17;
    const hastaHora = dia === 0 ? Math.max(13, ahora.getHours()) : 23;
    const cuantas = dia === 0 ? entre(16, 22) : finDeSemana ? entre(14, 24) : entre(6, 12);

    for (let i = 0; i < cuantas; i++) {
      const hora = entre(desdeHora, hastaHora);
      const cuando = aLas(dia, hora, entre(0, 59));
      if (dia === 0 && cuando > ahora) continue;

      // Armado del pedido, descontando de verdad.
      const items: { p: (typeof productos)[number]; cantidad: number }[] = [];
      for (let n = entre(1, 4); n > 0; n--) {
        const p = alguno(ruleta);
        const cantidad = entre(1, 3);
        if (!p.deBarril && p.stock < cantidad) continue;
        const litros = (p.litros ?? 0) * cantidad;
        if (p.deBarril && barriles.reduce((s, b) => s + b.restanteL, 0) < litros) continue;
        items.push({ p, cantidad });
      }
      if (items.length === 0) continue;

      const ventaId = nuevoId("vent-");
      const anulada = azar() < 0.02;
      let total = 0;

      for (const { p, cantidad } of items) {
        total += p.precio * cantidad;
        lineas.push({
          id: nuevoId("lin-"),
          ventaId,
          productoId: p.id,
          nombre: `${p.nombre} ${p.presentacion}`,
          precioUnit: dec(p.precio),
          cantidad,
          total: dec(p.precio * cantidad),
        });

        if (p.deBarril) {
          // Del barril más lleno, igual que el punto de venta.
          let resta = redondear((p.litros ?? 0) * cantidad);
          for (const b of [...barriles].sort((x, y) => y.restanteL - x.restanteL)) {
            if (resta <= 0.001) break;
            const saca = Math.min(b.restanteL, resta);
            resta = redondear(resta - saca);
            b.restanteL = redondear(b.restanteL - saca);
            movimientos.push({
              id: nuevoId("mov-"),
              tipo: "VENTA",
              barrilId: b.id,
              cantidad: -redondear(saca),
              unidad: "L",
              saldo: b.restanteL,
              motivo: `Venta CV-${anio}-${String(ticket + 1).padStart(5, "0")}`,
              ventaId,
              usuario: cajera,
              fecha: cuando,
            });
          }
        } else {
          p.stock -= cantidad;
          movimientos.push({
            id: nuevoId("mov-"),
            tipo: "VENTA",
            productoId: p.id,
            cantidad: -cantidad,
            unidad: "u",
            saldo: p.stock,
            motivo: `Venta CV-${anio}-${String(ticket + 1).padStart(5, "0")}`,
            ventaId,
            usuario: cajera,
            fecha: cuando,
          });
        }
      }

      const metodo = alguno(METODOS);
      const descuento = azar() < 0.08 ? Math.round(total * 0.1) : 0;
      const cobrado = total - descuento;
      if (!anulada && metodo === "Efectivo") efectivoDelTurno += cobrado;

      ventas.push({
        id: ventaId,
        ticket: `CV-${anio}-${String(++ticket).padStart(5, "0")}`,
        total: dec(cobrado),
        descuento: dec(descuento),
        metodo,
        estado: anulada ? "ANULADA" : "COMPLETADA",
        cajera,
        fecha: cuando,
        abiertaEn: cuando,
        mesaId: azar() > 0.45 ? alguno(mesas).id : null,
        clienteId: azar() > 0.7 ? alguno(clientes).id : null,
        cajaId: turnoId,
        notas: anulada ? "Anulada: el cliente cambió el pedido" : null,
      });

      // Lo anulado vuelve al stock, con su rastro.
      if (anulada) {
        for (const { p, cantidad } of items) {
          if (p.deBarril) continue;
          p.stock += cantidad;
          movimientos.push({
            id: nuevoId("mov-"),
            tipo: "ANULACION",
            productoId: p.id,
            cantidad,
            unidad: "u",
            saldo: p.stock,
            motivo: `Anulación CV-${anio}-${String(ticket).padStart(5, "0")}`,
            ventaId,
            usuario: cajera,
            fecha: new Date(cuando.getTime() + 5 * 60000),
          });
        }
      }
    }

    // El arqueo del turno cerrado: casi siempre cuadra, a veces por poco no.
    const turno = turnos[turnos.length - 1];
    if (!abierto) {
      const diferencia = azar() < 0.25 ? entre(-15, 15) : 0;
      turno.montoDeclarado = dec(inicial + efectivoDelTurno + diferencia);
      if (diferencia !== 0) {
        turno.notas = diferencia > 0 ? "Sobró vuelto en el cajón" : "Faltó vuelto, revisar";
      }
    }
  }

  // --- Faltantes: el conteo de anoche encontró menos de lo anotado ---
  // Sin esto el inventario cierra perfecto y la pantalla nunca muestra el aviso
  // de reposición, que es media gracia de tener inventario.
  for (const nombre of ["Lucky Strike", "Speed", "Jarra Coca Cola"]) {
    const p = productos.find((x) => x.nombre === nombre);
    if (!p) continue;
    const objetivo = Math.max(0, p.stockMinimo - entre(2, 5));
    const baja = p.stock - objetivo;
    if (baja <= 0) continue;
    p.stock = objetivo;
    movimientos.push({
      id: nuevoId("mov-"),
      tipo: "AJUSTE",
      productoId: p.id,
      cantidad: -baja,
      unidad: "u",
      saldo: p.stock,
      motivo: "Ajuste por conteo físico: faltante, reponer",
      usuario: CAJERAS[0],
      fecha: aLas(1, 23, 50),
    });
  }

  // --- Comandas abiertas: mesas con la cuenta en curso ahora mismo ---
  const turnoDeHoy = turnos[turnos.length - 1].id as string;
  const mesasOcupadas = [mesas[1], mesas[4], mesas[6], mesas[10]];
  for (const [n, mesa] of mesasOcupadas.entries()) {
    const ventaId = nuevoId("vent-");
    const desde = new Date(Date.now() - (25 + n * 22) * 60000);
    let total = 0;

    for (let k = entre(2, 4); k > 0; k--) {
      const p = alguno(ruleta);
      const cantidad = entre(1, 3);
      if (!p.deBarril && p.stock < cantidad) continue;
      total += p.precio * cantidad;
      lineas.push({
        id: nuevoId("lin-"),
        ventaId,
        productoId: p.id,
        nombre: `${p.nombre} ${p.presentacion}`,
        precioUnit: dec(p.precio),
        cantidad,
        total: dec(p.precio * cantidad),
      });
      if (p.deBarril) {
        let resta = redondear((p.litros ?? 0) * cantidad);
        for (const b of [...barriles].sort((x, y) => y.restanteL - x.restanteL)) {
          if (resta <= 0.001) break;
          const saca = Math.min(b.restanteL, resta);
          resta = redondear(resta - saca);
          b.restanteL = redondear(b.restanteL - saca);
          movimientos.push({
            id: nuevoId("mov-"),
            tipo: "VENTA",
            barrilId: b.id,
            cantidad: -redondear(saca),
            unidad: "L",
            saldo: b.restanteL,
            motivo: `Comanda mesa ${mesa.numero}`,
            ventaId,
            usuario: CAJERAS[0],
            fecha: desde,
          });
        }
      } else {
        p.stock -= cantidad;
        movimientos.push({
          id: nuevoId("mov-"),
          tipo: "VENTA",
          productoId: p.id,
          cantidad: -cantidad,
          unidad: "u",
          saldo: p.stock,
          motivo: `Comanda mesa ${mesa.numero}`,
          ventaId,
          usuario: CAJERAS[0],
          fecha: desde,
        });
      }
    }

    ventas.push({
      id: ventaId,
      ticket: `CV-${anio}-${String(++ticket).padStart(5, "0")}`,
      total: dec(total),
      descuento: dec(0),
      metodo: "Efectivo",
      estado: "ABIERTA",
      cajera: CAJERAS[0],
      fecha: desde,
      abiertaEn: desde,
      mesaId: mesa.id,
      clienteId: n < 2 ? clientes[n + 1].id : null,
      cajaId: turnoDeHoy,
      notas: null,
    });
  }

  // -------------------------------------------------------------------------
  console.log("→ Guardando…");
  await enTandas("turnos de caja", turnos, (d) => prisma.cajaTurno.createMany({ data: d }));
  await enTandas("ventas", ventas, (d) => prisma.ventaBebida.createMany({ data: d }));
  await enTandas("líneas", lineas, (d) => prisma.lineaVentaBebida.createMany({ data: d }));
  await enTandas("movimientos", movimientos, (d) =>
    prisma.movimientoStock.createMany({ data: d }),
  );

  console.log("→ Cerrando el inventario con el resultado de la simulación…");
  for (const p of productos) {
    if (p.deBarril) continue;
    await prisma.productoBebida.update({
      where: { id: p.id },
      data: { stock: Math.max(0, p.stock) },
    });
  }
  for (const b of barriles) {
    await prisma.barril.update({ where: { id: b.id }, data: { restanteL: b.restanteL } });
  }

  // El contador de tickets arranca donde terminó la semilla.
  await prisma.config.upsert({
    where: { clave: `ticket_bar_${anio}` },
    create: { clave: `ticket_bar_${anio}`, valor: String(ticket) },
    update: { valor: String(ticket) },
  });

  const [nProd, nVentas, nAbiertas, nMov, nCajas, litros, faltantes] = await Promise.all([
    prisma.productoBebida.count(),
    prisma.ventaBebida.count({ where: { estado: "COMPLETADA" } }),
    prisma.ventaBebida.count({ where: { estado: "ABIERTA" } }),
    prisma.movimientoStock.count(),
    prisma.cajaTurno.count(),
    prisma.barril.aggregate({ _sum: { restanteL: true }, where: { conectado: true } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) n FROM productos_bebida
      WHERE activo AND NOT "deBarril" AND stock <= "stockMinimo"`,
  ]);

  console.log(`
✔ Cervecería lista.
  ${nProd} productos · ${nVentas} ventas cobradas · ${nAbiertas} comandas abiertas
  ${nMov} movimientos de stock · ${nCajas} turnos de caja
  ${Math.round(litros._sum.restanteL ?? 0)} L en barriles · ${Number(faltantes[0]?.n ?? 0)} producto(s) bajo el mínimo
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
