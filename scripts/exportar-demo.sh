#!/usr/bin/env bash
# Vuelca la base de bilbo a demo/contenedores.sql, para llevarla a la laptop de
# demostración. Ver DEMO.md.
#
# Necesita el túnel abierto (scripts/tunel-bilbo.sh -d) y pg_dump instalado.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SALIDA="${1:-$RAIZ/demo/contenedores.sql}"

# El usuario, la clave, el host y la base salen de la DATABASE_URL del .env, así
# que no hay credenciales repetidas en dos lados.
URL=$(grep -E '^DATABASE_URL=' "$RAIZ/.env" | head -1 | cut -d= -f2- | tr -d '"')
if [[ -z "${URL:-}" ]]; then
  echo "No encontré DATABASE_URL en $RAIZ/.env" >&2
  exit 1
fi

bash "$RAIZ/scripts/tunel-bilbo.sh" -d

# `schema`, `connection_limit` y `pool_timeout` los entiende Prisma, no libpq:
# pg_dump corta con "invalid URI query parameter". Se van y queda la conexión.
LIMPIA=$(printf '%s' "$URL" | sed -E 's/[?&](schema|connection_limit|pool_timeout|connect_timeout|pgbouncer)=[^&]*//g; s/\?&/?/; s/[?&]$//')

mkdir -p "$(dirname "$SALIDA")"
pg_dump "$LIMPIA" --no-owner --no-privileges --clean --if-exists -f "$SALIDA"

echo "Listo: $SALIDA ($(du -h "$SALIDA" | cut -f1))"
echo "Cargarlo en la laptop de la demo con los comandos del final de DEMO.md."
