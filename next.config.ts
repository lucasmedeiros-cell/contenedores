import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Equipos de la red local (y la tailnet) que pueden pegarle al server de dev.
  allowedDevOrigins: ["192.168.125.*", "100.64.0.*", "*.local"],

  // El globo de desarrollo de Next (la "N" abajo a la izquierda, que se pone
  // roja con cada aviso) se sentaba encima de "Cerrar Sesión" del menú y se veía
  // en las demos. Apagado sigue habiendo errores en la consola y en la terminal.
  devIndicators: false,

  // Compilar mientras hay un `next start` corriendo reemplaza los chunks que
  // ese proceso ya sirvió: la página sigue apareciendo pero su JavaScript da
  // 404 y deja de responder a los clics. Con NEXT_DIST_DIR se puede compilar
  // en otra carpeta y no tocar la que está en uso:
  //   NEXT_DIST_DIR=.next-verify npx next build
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
