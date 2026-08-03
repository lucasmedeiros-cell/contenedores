import { NextResponse, type NextRequest } from "next/server";

/**
 * Candado por sistema. Alquileres y Cervecería viven en el mismo proyecto pero
 * se sirven en puertos distintos, cada uno con su `SISTEMA` en el entorno:
 *
 *   SISTEMA=alquileres  next dev -p 3000   → solo el patio
 *   SISTEMA=cerveceria  next dev -p 3001   → solo el bar
 *
 * Así nadie se cruza de sistema por error desde la barra de direcciones. Sin
 * la variable —`npm run dev:solo`— se sirven los dos, como antes.
 *
 * En Next 16 esto es `proxy.ts`, no `middleware.ts`: mismo comportamiento,
 * corriendo en el runtime de Node, así que `process.env` se lee en cada
 * arranque y no queda horneado en el build.
 */
const SISTEMA = process.env.SISTEMA?.trim().toLowerCase();

export function proxy(request: NextRequest) {
  if (SISTEMA !== "cerveceria" && SISTEMA !== "alquileres") return NextResponse.next();

  const ruta = request.nextUrl.pathname;
  const esDelBar = ruta === "/cerveza" || ruta.startsWith("/cerveza/");

  if (SISTEMA === "cerveceria" && !esDelBar) {
    return NextResponse.redirect(new URL("/cerveza", request.url));
  }
  if (SISTEMA === "alquileres" && esDelBar) {
    return NextResponse.redirect(new URL("/alquileres", request.url));
  }
  return NextResponse.next();
}

export const config = {
  /**
   * El login y las rutas de API son de los dos sistemas, así que no pasan por
   * acá. Tampoco nada con extensión: `_next/...`, las fotos de los productos
   * (`/productos/chopp.png`) y el resto de `public/` se servían redirigidos y
   * salían en blanco.
   */
  matcher: ["/((?!api|ingresar|_next|.*\\.[a-zA-Z0-9]+$).*)"],
};
