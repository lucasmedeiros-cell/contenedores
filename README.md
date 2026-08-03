# Contenedores

Sistema web de gestión para **Contenedores**: patio de comidas con alquiler de puestos
y cervecería propia con punto de venta. Marca del sistema: *easy pay · Alquileres*.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma · PostgreSQL
- **Estética:** tema oscuro y la gama del contenedor —`#FFC200`, `#E2A812`,
  `#B8860B`— para toda la interfaz. Los colores semánticos (verde al día, ámbar con
  deuda, gris libre, celeste en obra) se reservan para los estados del plano y las
  etiquetas, que es donde el color significa algo.
- **Plano:** vista isométrica 2.5D en SVG, con editor de disposición y modo día/noche
- **Moneda:** bolivianos en todo el sistema. Los dos negocios cobran en la misma
  moneda, así que hay una sola `plata()` en `src/lib/format.ts`

## Puesta en marcha

```bash
npm install
cp .env.example .env        # completar DATABASE_URL y AUTH_SECRET
npm run db:push             # crea las tablas
npm run db:seed             # zonas, puestos, arrendatarios y pagos del patio
npm run db:seed-cerveceria  # catálogo, barriles, caja y ventas del bar
npm run dev
```

Abrir http://localhost:3000 — la raíz manda a `/alquileres`, y el bar está en
`/cerveza`. Los dos negocios cuelgan de su propia rama de rutas, así que todo se
publica como una sola aplicación.

### Un sistema por puerto

Alquileres y Cervecería son dos negocios distintos y conviene no cruzarlos. Con
la variable `SISTEMA` cada proceso sirve uno solo y manda el resto a su raíz
(`src/proxy.ts`, que en Next 16 es lo que antes era el middleware):

```bash
npm run dev:alquileres   # http://localhost:3000  → solo el patio
npm run dev:cerveceria   # http://localhost:3001  → solo el bar
npm run dev:ambos        # los dos a la vez, cada uno en su puerto
```

En el 3000, cualquier `/cerveza/…` rebota a `/alquileres`; en el 3001, todo lo
que no sea del bar rebota a `/cerveza`. Para la web no hace falta la variable:
un solo proceso sirve las dos ramas. El login (`/ingresar`) y las rutas de API
funcionan en los dos. Sin la variable —`npm run dev`— se sirven los dos sistemas
en un mismo puerto, como antes.

Cada sistema tiene su propia carpeta de build —`.next-alquileres` y
`.next-cerveceria`, vía `NEXT_DIST_DIR`— y los scripts ya se la pasan. Es
obligatorio: Next 16 corta con *"Another next dev server is already running"* si
dos procesos comparten la carpeta, y el segundo muere sin servir nada.

Para producción hay que compilar cada uno en la suya:

```bash
npm run build:alquileres && npm run start:alquileres
npm run build:cerveceria && npm run start:cerveceria
```

### Mostrarlo sin internet

Para llevarlo a la casa del cliente en una laptop suelta —servidor y base en la
misma máquina, sin red de por medio— está **[DEMO.md](DEMO.md)**, con el paso a
paso para Windows. Los scripts `demo:datos`, `demo:build`, `demo:alquileres` y
`demo:cerveceria` son los de ese modo: no tocan el túnel a bilbo y funcionan en
PowerShell (van con `cross-env`, porque `SISTEMA=… next start` es sintaxis de
shell de Unix y en Windows falla).

### Publicar en la red local

Para que la vean todos los equipos de la red (celulares, tablets, otras compus):

```bash
npm run build
npm run red                 # http://<ip-de-esta-maquina>:3000
```

`npm run red` (ver `scripts/servir-red.sh`) abre el túnel a la base de bilbo y
setea `COOKIE_INSECURE=1`, que le saca el flag `Secure` a la cookie de sesión
(`src/lib/auth.ts`). Hace falta porque en la LAN servimos por HTTP plano y el
navegador descarta las cookies `Secure`: sin eso el login parece andar pero la
sesión nunca se guarda. El `.env` lo carga Next solo.

No compilar mientras hay un `next start` corriendo: el build reemplaza los
chunks que ese proceso ya sirvió y la página queda cargada pero sin JavaScript
(los `.js` pasan a dar 404). Para eso está `NEXT_DIST_DIR` en `next.config.ts`.

Para desarrollar con recarga en caliente pero accesible desde la red:
`npm run dev:red`. Los orígenes permitidos están en `allowedDevOrigins`
(`next.config.ts`); si la red usa otro rango de IP, agregarlo ahí.

### Conexión a la base

La base vive en **bilbo** (`contenedores`, dueño `petrobox`). El `pg_hba` de bilbo
todavía no habilita conexiones directas de `petrobox` desde la tailnet, así que el
acceso va por un túnel SSH (`npm run dev` lo abre solo):

```bash
./scripts/tunel-bilbo.sh -d      # localhost:5555 -> bilbo:5432
```

Con eso, `DATABASE_URL` apunta a `127.0.0.1:5555`. Si en algún momento se agrega
la línea `host all petrobox 100.64.0.0/10 md5` al `pg_hba.conf` de bilbo, se puede
apuntar directo a `bilbo:5432` y dejar de usar el túnel.

**Dos cosas a tener en cuenta con bilbo:**

- Está a unos **200 ms de ida y vuelta**, y cada consulta paga ese precio. Por eso
  la capa de datos está armada como está (ver abajo).
- Tiene `max_connections = 100` y lo comparte con otras bases que ya lo dejan al
  límite, así que esta app se restringe a 5 conexiones vía
  `connection_limit=5` en la `DATABASE_URL`. Conviene no subirlo.

### Cómo se resolvió la velocidad

Con la base tan lejos, una página que hiciera diez consultas tardaba segundos. La
capa de datos de cada dominio (`_lib/datos.ts`) aplica tres cosas, en orden de
impacto:

1. **SQL agregado.** Cada pantalla resuelve todo lo suyo en una o dos consultas con
   `LATERAL` y `json_agg`, en vez de dejar que Prisma parta los `include` en varias.
2. **Caché con etiquetas.** Las lecturas van envueltas en `unstable_cache` con las
   etiquetas `patio` y `bar`. Al escribir, las acciones llaman a `invalidar()`, que
   expira la etiqueta al instante: quien acaba de cobrar ve su cobro enseguida.
3. **`cache()` de React**, para que un mismo render no repita una consulta.

Resultado: las páginas pasaron de 3–6 s a **10–30 ms**.

> Ojo: `unstable_cache` serializa lo que guarda, así que las fechas vuelven como
> texto. Por eso `puestosConEstado` y `resumenBar` las reviven al salir del caché.

### Servirlo en la red local

```bash
npm run start:red        # abre el túnel y sirve en 0.0.0.0:3000
```

Los demás equipos entran por la IP de esta máquina, por ejemplo
`http://192.168.125.147:3000`.

Dos cosas hacen falta para que funcione desde otro equipo:

- **`COOKIE_INSECURE=1`** en el `.env`. En la red se sirve por HTTP plano, y una
  cookie marcada como `Secure` no la guarda el navegador: la pantalla de login
  aceptaría la clave y volvería al login, sin ningún error visible. Cuando haya
  HTTPS, sacar la variable.
- **El túnel a bilbo abierto en esta máquina.** La base no está acá; si el túnel
  se cae, la app deja de responder para todos. `npm run start:red` lo levanta
  solo, y `scripts/tunel-bilbo.sh -d` lo vuelve a abrir si hiciera falta.

### Variables de entorno

| Variable       | Para qué sirve                                              |
| -------------- | ----------------------------------------------------------- |
| `DATABASE_URL` | Conexión a PostgreSQL                                        |
| `AUTH_SECRET`  | Firma de las sesiones. Generar con `openssl rand -base64 32` |

### Usuarios de ejemplo

Los que carga `npm run db:seed`, los dos con la contraseña `1234`:

| Usuario    | Rol           |
| ---------- | ------------- |
| `admin`    | Administrador |
| `operador` | Operador      |

Hoy las dos pantallas —patio y cervecería— piden sesión pero no distinguen rol:
alcanza con estar adentro.

## Módulos

El sistema replica el prototipo **PatioAdmin v13**, con las mismas seis vistas:

- **Inicio** — las cuatro tarjetas (Recaudación del Mes, Por Cobrar,
  Puestos Totales, Pagos Pendientes), el gráfico de evolución de pagos y el panel
  "Estado del patio" con su leyenda Al día / Por cobrar-Mora / Libre.
- **Plano del Patio** — con sus subpestañas **Plano · Isométrico · Tarjetas ·
  Lista** y los filtros por estado y zona. "Plano" es el mapa de tarjetas
  arrastrables; "Isométrico" dibuja el patio en 3/4 y deja mover y rotar los
  contenedores sobre la grilla. Las cuatro subpestañas obedecen a los filtros de
  la barra de arriba —el isométrico atenúa lo que queda afuera—: el plano no
  tiene filtros propios, tenerlos duplicados se desincronizaba.
- **Gestión de Puestos** — Nº, zona, superficie, comercio, inquilino, precio base
  y estado. Abre en tarjetas y con un clic pasa a tabla.
- **Evolución de Pagos** — tarjetas con el monto adeudado y cobro rápido.
- **Historial de Pagos** — historial de transacciones con exportación e
  importación por CSV y el ticket imprimible. Está fuera del menú a pedido del
  cliente: se llega por `/historial`.
- **Directorio Clientes** — los arrendatarios con su contacto y lo pagado.

Diálogos: ficha del puesto, Cobrar Alquiler, Comprobante de Pago con N° de
transacción, Asignar Nuevo Arrendatario, Añadir/Editar Puesto e Importar Registro
de Pagos.

### Cómo se cobra

En **dos pasos**: se confirma el monto —viene con el alquiler pactado— y se
elige **Efectivo** o **QR**; el segundo paso solo muestra cuánto y cómo, y
cobra. La fecha es la del día y el comprobante lo numera el servidor
(`EFE-20260803-4F2A`), que eran los dos campos que antes se completaban a mano
en cada cobro, junto con las notas.

Las formas de cobro son esas dos en los dos negocios (`METODOS` en
`_componentes/patio/dialogos.tsx` y `METODOS_PAGO` en `cerveceria/_lib/datos.ts`).
Los pagos viejos conservan el método con el que se registraron —transferencia,
tarjeta, MercadoPago—: el filtro del historial se arma con lo que hay en la
base, no con la lista, así que se siguen pudiendo buscar.

El comprobante impreso es un recibo formal: emisor, número, a quién y por qué
concepto, el importe en números y en letras, y las dos firmas. Al imprimir sale
solo el recibo, en la hoja entera (`@media print` en `globals.css`).

El menú incluye el selector **Día / Noche** y el botón **Restablecer Demo**, que
vuelve el patio a los 12 puestos originales del prototipo.

### Cervecería

El otro negocio, con su propio menú en `/cerveza`:

- **Resumen** — recaudado y tickets del día, litros disponibles y servidos, lo
  más vendido, cómo se cobró y a qué hora se vende.
- **Punto de Venta** — el catálogo en cuatro modos (lista, tarjetas, ruleta y
  carrusel), con el pedido a un costado y el cobro con método, descuento y
  vuelto. Todas las ventas son de mostrador: se cobran en el momento y sale la
  **comanda** para la barra, además del ticket.
- **Ventas** — el historial de tickets, con búsqueda, filtros, exportación a CSV,
  reimpresión del comprobante o de la comanda, y anulación.
- **Inventario** — productos y barriles, con los mismos cuatro modos de vista,
  alta y edición, stock mínimo, faltantes y el valor del depósito a costo.
- **Caja** — apertura con fondo, lo cobrado por método y el arqueo al cerrar,
  contra el efectivo que de verdad pasó por el cajón.
- **Reportes** — 7, 30 o 90 días: recaudación por día y por hora, categorías,
  ranking de productos, formas de cobro, cajeras y margen bruto.
- **Configuración** — las categorías del anillo del POS y las formas de cobro.

#### Los cuatro modos de vista

El punto de venta y el inventario muestran el mismo catálogo de cuatro maneras,
y cada pantalla recuerda la elegida (`localStorage`):

| Modo | Para qué |
| --- | --- |
| **Lista** | Filas densas: muchos productos a la vez, ideal con teclado |
| **Tarjetas** | Grilla de fichas, para ver precios de un vistazo |
| **Ruleta** | El anillo de gajos del diseño: tres productos y las categorías al centro |
| **Carrusel** | Una fila que se desliza, con el producto activo al medio |

La ruleta y el carrusel se manejan con las flechas del teclado, los botones
laterales o arrastrando con el dedo.

#### Cómo se mueve el stock

Es lo que distingue a este POS de un simple registro de ventas:

- Un producto **de barril** descuenta litros de los barriles conectados, del más
  lleno al más vacío; el resto descuenta unidades de su propio stock.
- Todo pasa dentro de una transacción: si un producto no alcanza, no se registra
  nada y la venta avisa qué faltó.
- Cada movimiento queda asentado con su motivo y el saldo resultante, así un
  faltante se puede explicar sin adivinar.
- **Anular** una venta devuelve todo: las unidades a su producto y los litros a
  los barriles con lugar, sin pasarse de su capacidad. La venta no se borra,
  queda marcada.
- El **número de ticket** sale de un contador atómico en `config`: dos cajas
  cobrando a la vez no pueden sacar el mismo.

> El límite de transacción de Prisma es de 5 s y una venta hace una docena de
> idas y vueltas a bilbo, que está a 200 ms: por eso las transacciones del bar
> van con el margen de `TX` (`_lib/servidor.ts`). Sin eso, un pedido grande se
> caía sin motivo visible.

### Modelo de datos

Sigue al prototipo: un **puesto** tiene a lo sumo un **arrendatario** (con su
alquiler acordado, inicio de contrato y próximo vencimiento) y su propio
historial de **pagos** (fecha, monto, método, comprobante, concepto). El estado
`LIBRE | OCUPADO | PENDIENTE` se guarda en el puesto, no se calcula. Al registrar
un cobro el puesto pasa a OCUPADO y el próximo vencimiento avanza un período.

### Reporte de bugs

Abajo a la derecha hay un botón **Debug** que abre un formulario corto (tipo,
título, descripción, correo y captura opcional) y crea un ticket en
`tickets.petroboxinc.com`, en estado desarrollo.

El navegador nunca le habla a Tickets: pasa por `/api/tickets/report`, que corre
en el servidor. Así la API key no viaja en el bundle y no hay CORS de por medio.
El proxy además le suma al ticket un bloque de contexto —proyecto, origen y URL—
que es lo que permite entenderlo sin repreguntar.

```ini
TICKETS_API=https://tickets.petroboxinc.com/api
TICKETS_API_KEY=pbx_...      # sin NEXT_PUBLIC_: se filtraría al cliente
TICKETS_PROJECT=Contenedores # con este nombre se etiquetan los tickets
```

Sin `TICKETS_API_KEY` el endpoint responde 503 y el resto de la app sigue igual.

Dos detalles que se rompen en silencio si se tocan:

- El campo del adjunto va a Tickets **en plural** (`imagenes`). Con `imagen` el
  ticket se crea igual pero sin la captura.
- El FAB va abajo a la **derecha**: a la izquierda se sentaría encima del
  "Cerrar Sesión" del menú lateral.

La key actual es la del app_client de *easy pos*; los tickets salen etiquetados
`[Contenedores]` igual. Cuando haya una key propia del proyecto, se cambia solo
esa variable.

### Paleta

Todo va en los colores del contenedor de easy pay, separando los estados por
intensidad en vez de por matiz: **#FFC200** (amarillo de marca) para lo que hay
que cobrar, **#E2A812** (oro apagado) para lo que está al día y el plomo
**#71717a** para los puestos libres.

## Estructura

Son **dos negocios distintos y cada uno vive en su propia carpeta**: el alquiler
de puestos del patio y la venta de cerveza. Cada carpeta se lleva sus rutas, sus
componentes y sus consultas; lo que queda en `src/components` y `src/lib` es lo
que de verdad comparten los dos. Las carpetas con guion bajo (`_componentes`,
`_lib`) son privadas: Next las deja fuera del ruteo, así que se pueden colocar
al lado de las páginas sin generar URLs.

```
prisma/
  schema.prisma        modelo de datos
  seed.ts              datos de ejemplo del patio
  seed-cerveceria.ts   catálogo y barriles del bar
scripts/
  tunel-bilbo.sh       túnel SSH al PostgreSQL de bilbo
public/
  logo-easypay.png     logotipo
  contenedor.jpg       foto usada en el login y en el splash
src/
  app/
    (auth)/ingresar/         login

    alquileres/              ── ALQUILERES ── URLs: /alquileres /alquileres/plano …
      layout.tsx             menú lateral, barra superior y splash
      page.tsx               Dashboard Analytics
      plano|puestos|pagos|historial|arrendatarios/  las otras cinco vistas
      acciones.ts            server actions del patio (cobros, altas, importación)
      _componentes/
        patio/               tabla, tarjetas, mapa, historial y diálogos
        plano/               motor del plano isométrico
        dashboard/           KPIs, evolución de pagos, estado del patio
        Navegacion.tsx       menú lateral y móvil
        BarraSuperior.tsx    encabezado
        SplashContenedor.tsx intro de puertas de contenedor abriéndose
      _lib/
        datos.ts             consultas y métricas del patio
        estados.ts           el estado de un puesto con su color y su nombre
        iso.ts               geometría isométrica
        demo.ts              datos del "Restablecer Demo"

    cerveza/                 ── VENTA DE CERVEZA ── URLs: /cerveza /cerveza/venta …
      layout.tsx             shell propio, con su menú
      page.tsx               resumen del día
      venta|ventas|inventario|caja|reportes|configuracion/
      acciones.ts            ventas y caja
      acciones-inventario.ts productos, stock, barriles y categorías
      _componentes/
        PuntoDeVenta.tsx     POS: los cuatro modos, el cobro y el ticket
        modos.tsx            lista/tarjeta/ruleta/carrusel y la geometría del anillo
        HistorialVentas.tsx  tickets, anulación y reimpresión
        Inventario.tsx       productos, barriles y ajustes de stock
        Caja.tsx             apertura, arqueo y cierre de turno
        Reportes.tsx         ventas por día, hora, producto y cajera
        TicketVenta.tsx      comprobante imprimible
        Comanda.tsx          el vale de preparación para la barra
        ShellCerveceria.tsx  barra lateral, menú móvil y encabezado
        piezas.tsx           tarjetas, botones y el hook de acciones
      _lib/
        datos.ts             catálogo, inventario, ventas, caja y reportes
        servidor.ts          descuento y reposición de stock, y nº de ticket

    api/tickets/report/      endpoint del reporte de bugs

  components/            ── COMPARTIDO POR LOS DOS ──
    ui.tsx               Modal, Campo, Aviso, Vacio y las clases PANEL/CAMPO
    tema.tsx             el estado del Día/Noche y su selector
    animaciones.ts       el contador que hace subir los montos
    DebugReporter.tsx    botón flotante de reporte de bugs
  lib/
    prisma.ts            el cliente
    auth.ts              sesiones JWT
    format.ts            plata, litros, fechas y horas
    servidor.ts          fallo(), dec() y redondear() de las server actions
    tipos.ts             el tipo Resultado que devuelven todas las acciones
```

Lo que está en `src/components` y `src/lib` es lo que **de verdad** usan los dos
sistemas. Cuando algo existía dos veces —el modal era `Marco` en el patio y
`Ventana` en la barra, el manejo de errores de las acciones estaba escrito en
cada dominio— se dejó una sola versión acá.

Para importar dentro de cada dominio hay un alias propio, así las rutas no
arrastran el paréntesis del route group:

| Alias           | Apunta a                          |
| --------------- | --------------------------------- |
| `@alquileres/*` | `src/app/alquileres/*`            |
| `@cerveza/*`    | `src/app/cerveza/*`               |
| `@/*`           | `src/*` (lo compartido)           |

## Comandos

| Comando             | Qué hace                               |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Abre el túnel a bilbo y levanta el server (los dos sistemas en un puerto) |
| `npm run dev:alquileres` | Solo el patio, en el 3000          |
| `npm run dev:cerveceria` | Solo el bar, en el 3001            |
| `npm run dev:ambos` | Los dos a la vez, cada uno en su puerto |
| `npm run dev:solo`  | Igual que `dev`, pero sin tocar el túnel |
| `npm run build`     | Compilación de producción              |
| `npm run start`     | Servidor de producción                 |
| `npm run db:push`   | Sincroniza el schema con la base       |
| `npm run db:seed`   | Carga los datos de ejemplo del patio    |
| `npm run db:seed-cerveceria` | Catálogo, barriles, caja y 14 días de ventas del bar |
| `npm run db:reset`  | Borra todo y vuelve a cargar los datos |
| `npm run db:studio` | Explorador visual de la base           |
| `npm run db:verificar` | Chequea la base: conteos e incoherencias |
