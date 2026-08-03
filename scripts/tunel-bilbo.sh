#!/usr/bin/env bash
# Abre un túnel SSH al PostgreSQL de bilbo.
#
# El pg_hba de bilbo todavía no habilita conexiones directas del usuario
# petrobox desde la tailnet, así que la app se conecta por acá:
#   localhost:5555  ->  bilbo:5432
#
# Uso:
#   ./scripts/tunel-bilbo.sh          # deja el túnel abierto en primer plano
#   ./scripts/tunel-bilbo.sh -d       # lo deja corriendo en segundo plano
set -euo pipefail

PUERTO_LOCAL=${PUERTO_LOCAL:-5555}
HOST=${HOST:-bilbo}
PUERTO_SSH=${PUERTO_SSH:-2202}
USUARIO=${USUARIO:-petrobox}

if ss -tln 2>/dev/null | grep -q ":${PUERTO_LOCAL}\b"; then
  echo "El túnel ya está levantado en localhost:${PUERTO_LOCAL}"
  exit 0
fi

OPCIONES=(-N -L "${PUERTO_LOCAL}:localhost:5432"
          -o ServerAliveInterval=30 -o ServerAliveCountMax=3
          -o ExitOnForwardFailure=yes
          -p "${PUERTO_SSH}")

if [[ "${1:-}" == "-d" ]]; then
  ssh -f "${OPCIONES[@]}" "${USUARIO}@${HOST}"
  sleep 1
  echo "Túnel abierto en segundo plano: localhost:${PUERTO_LOCAL} -> ${HOST}:5432"
else
  echo "Túnel abierto: localhost:${PUERTO_LOCAL} -> ${HOST}:5432 (Ctrl+C para cerrarlo)"
  exec ssh "${OPCIONES[@]}" "${USUARIO}@${HOST}"
fi
