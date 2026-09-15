#!/bin/sh
set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

node scripts/ensure-runtime-db.js
exec node src/index.js
