#!/usr/bin/env bash
# Publica la app en la red local (build de producción).
#
# Lo único que `next start` no resuelve solo:
#   1. El túnel a la base de bilbo (ver tunel-bilbo.sh).
#   2. COOKIE_INSECURE=1, que le saca el flag Secure a la cookie de sesión
#      (src/lib/auth.ts). En la LAN servimos por HTTP plano y el navegador
#      descarta una cookie Secure, así que sin esto nadie puede loguearse.
#   3. -H 0.0.0.0, que en Next 16 ya es el default pero lo dejamos explícito.
#
# El .env lo carga Next por su cuenta, tanto en `next dev` como en `next start`.
#
# Uso:
#   npm run red          # equivale a ./scripts/servir-red.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PUERTO=${PUERTO:-3000}

bash scripts/tunel-bilbo.sh -d

export COOKIE_INSECURE=1

IP=$(hostname -I | tr ' ' '\n' | grep -E '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.' | head -1)
echo "Disponible en la red local:  http://${IP:-<tu-ip>}:${PUERTO}"

exec npx next start -H 0.0.0.0 -p "${PUERTO}"
