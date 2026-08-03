# Llevar Contenedores a una demo, sin internet

El sistema corre entero en una sola laptop: el servidor web y la base de datos
quedan ahí adentro y no se sale a ninguna red. Lo único que hoy necesita
conexión es PostgreSQL, que vive en bilbo; acá se reemplaza por uno local.

Esta guía es para una **laptop con Windows**, preparada con internet **antes**
del día de la demo. El día de la demo no hace falta red de ningún tipo.

## Antes: preparar la laptop (una sola vez, con internet)

### 1. Node.js

Bajar el instalador **LTS** de <https://nodejs.org> (versión 20 o superior) y
darle siguiente hasta el final. Para comprobar, abrir **PowerShell** y correr:

```powershell
node -v
npm -v
```

### 2. PostgreSQL

Bajar el instalador de <https://www.postgresql.org/download/windows/> (versión
16). Durante la instalación:

- **Anotar la contraseña** que se le pone al usuario `postgres`. Es la que va
  después en el `.env`; si se pierde, hay que reinstalar.
- Dejar el puerto en **5432**.
- No hace falta Stack Builder al terminar.

### 3. Copiar el proyecto

Copiar la carpeta `contenedores` a la laptop, por ejemplo a `C:\contenedores`.
**Sin** las carpetas `node_modules`, `.next`, `.next-alquileres` y
`.next-cerveceria`: se regeneran en el paso siguiente y solo hacen bulto.

### 4. Configuración

Copiar `demo\env-demo.txt` a la raíz del proyecto con el nombre `.env` y
cambiar `CAMBIAR` por la contraseña de PostgreSQL:

```
DATABASE_URL="postgresql://postgres:LA-CONTRASEÑA@localhost:5432/contenedores?connection_limit=5"
```

### 5. Instalar y cargar los datos

En PowerShell, parados en `C:\contenedores`:

```powershell
npm install
npm run demo:datos
```

`demo:datos` crea las tablas y carga los datos de ejemplo: 16 puestos con sus
arrendatarios y su historial de pagos, y para la cervecería el catálogo, los
barriles, las mesas, la caja y unos catorce días de ventas.

> Si `npm run demo:datos` se queja de que la base `contenedores` no existe,
> abrir **pgAdmin** (se instaló con PostgreSQL), botón derecho en *Databases* →
> *Create* → *Database*, nombre `contenedores`, y repetir el comando.

### 6. Compilar

```powershell
npm run demo:build
```

Tarda un minuto o dos. Es lo que hace que después arranque rápido y sin
recompilar nada.

### 7. Probar que anda

Abrir **dos** ventanas de PowerShell, una para cada sistema:

```powershell
npm run demo:alquileres    # patio    → http://localhost:3000
```

```powershell
npm run demo:cerveceria    # cervecería → http://localhost:3001
```

En el navegador, entrar a <http://localhost:3000/alquileres> con:

| Usuario    | Contraseña | Rol           |
| ---------- | ---------- | ------------- |
| `admin`    | `1234`     | Administrador |
| `operador` | `1234`     | Operador      |

**Hacer esta prueba con el WiFi apagado**, para confirmar que no queda nada
colgado de la red.

## El día de la demo

1. Encender la laptop. **No hace falta internet.**
2. Abrir dos PowerShell en `C:\contenedores` y correr en cada una:
   - `npm run demo:alquileres`
   - `npm run demo:cerveceria`
3. Abrir el navegador en <http://localhost:3000/alquileres> (patio) y
   <http://localhost:3001/cerveza> (cervecería).
4. Dejar las dos ventanas de PowerShell abiertas y minimizadas: si se cierran,
   se cae el servidor.

Conviene abrir las dos direcciones en pestañas separadas antes de que llegue el
cliente, así el cambio de un negocio al otro es instantáneo.

### Volver a dejar los datos como al principio

Si durante la demo se cobra, se anula o se borra algo y hay que empezar de
nuevo:

- En el patio, el menú tiene **Restablecer Demo**, que devuelve los 12 puestos
  originales.
- Para volver todo a cero —patio y cervecería—, en PowerShell:
  `npm run demo:datos`.

## Qué funciona sin internet

Todo: el plano isométrico, los cobros, los comprobantes, la importación y
exportación de CSV, el punto de venta, el control de stock, la caja y los
reportes. No hay fuentes, mapas ni librerías que se bajen de afuera.

Dos detalles:

- **El botón "Debug"** (el insecto) reporta a `tickets.petroboxinc.com`, que sin
  internet no responde. Con el `.env` de la demo, que no lleva
  `TICKETS_API_KEY`, el botón directamente no aparece: el cliente no ve un botón
  que no anda.
- **Imprimir un comprobante** abre el diálogo del navegador. Si la laptop no
  tiene impresora, sale igual con "Guardar como PDF", que es lo que conviene
  mostrar.

## Si querés llevar los datos de hoy en vez de los de ejemplo

En `demo\contenedores.sql` está el volcado de la base de bilbo tal como estaba
al armar este kit (725 KB). Para cargarlo en la laptop, en lugar del paso 5:

```powershell
npm install
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE contenedores"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d contenedores -f demo\contenedores.sql
```

Pide la contraseña de PostgreSQL en cada comando. Para regenerar ese volcado
desde esta máquina, con el túnel a bilbo abierto:

```bash
scripts/exportar-demo.sh
```

## Por qué no se sirve en la red ni en internet

Se podría publicar en la red local (`npm run start:red`, ver el README), pero
para una demo en la casa del cliente eso agrega dos cosas que se pueden romper:
el WiFi del lugar y el firewall de Windows. Con todo en `localhost` no hay
ninguna de las dos.
