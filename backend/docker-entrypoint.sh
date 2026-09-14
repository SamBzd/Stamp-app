#!/bin/sh
set -eu

node scripts/ensure-runtime-db.js
exec node src/index.js
