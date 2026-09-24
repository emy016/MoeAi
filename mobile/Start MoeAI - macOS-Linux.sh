#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'Starting MoeAI at http://127.0.0.1:8080 ...'
  (sleep 1; if command -v open >/dev/null 2>&1; then open http://127.0.0.1:8080; elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://127.0.0.1:8080; fi) &
  cd web-build
  exec python3 -m http.server 8080 --bind 127.0.0.1
fi

if command -v node >/dev/null 2>&1; then
  exec node tools/serve-portable-web.cjs
fi

printf '%s\n' 'MoeAI needs Python 3 or Node.js on this computer. See START-HERE.md.' >&2
exit 1
