#!/usr/bin/env bash
# Fixture de Garak 0.17.0 (regla 19: el gate de contrato lleva la salida del serializador REAL).
#
# Corre garak SOLO contra el generador local `test.Repeat` (devuelve el prompt como salida: ningún tercero), en un
# entorno ignorado por git dentro del repo (`.fixture-garak/`, ≈ 1,6 GB), sin red (proxy muerto, Hugging Face fuera de
# línea). El crudo trae prompts de ataque, disparadores y rutas locales: NO se versiona. `redactar-garak.mjs` lo
# reemplaza por marcadores (estructura, orden, conteos y puntajes intactos) y escribe la fixture; después se borran el
# crudo y el entorno. Uso: `bash scripts/adaptadores/fixture-garak.sh [--conservar]` (sin la bandera, borra al terminar).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E="$RAIZ/.fixture-garak"
PY="${PYTHON312:-/opt/homebrew/bin/python3.12}"
SALIDA="$RAIZ/tests/fixtures/adaptadores/garak-0.17.0.report.redactado.jsonl"

borrar() { rm -rf "$E"; echo "borrado: $E"; }
if [[ "${1:-}" != "--conservar" ]]; then trap borrar EXIT; fi

mkdir -p "$E/home" "$E/salida"
if [[ ! -x "$E/venv/bin/python" ]]; then
  "$PY" -m venv "$E/venv"
  PIP_CACHE_DIR="$E/.pip-cache" "$E/venv/bin/pip" install --quiet "garak==0.17.0"
fi

# Todo dentro de .fixture-garak/ y la red bloqueada (el pip de arriba ya terminó).
export XDG_DATA_HOME="$E/home/data" XDG_CONFIG_HOME="$E/home/config" XDG_CACHE_HOME="$E/home/cache"
export NLTK_DATA="$E/home/nltk" HF_HOME="$E/home/hf" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1
export HTTP_PROXY=http://127.0.0.1:9 HTTPS_PROXY=http://127.0.0.1:9 http_proxy=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9
export ALL_PROXY=http://127.0.0.1:9 NO_PROXY= PYTHONHASHSEED=0

cat > "$E/garak.yaml" <<EOF
system:
  parallel_attempts: 1
  lite: true
  show_z: false
run:
  seed: 42
  generations: 5
  soft_probe_prompt_cap: 4
plugins:
  target_type: test.Repeat
  probe_spec: ${PROBES:-dan.Dan_11_0,encoding.InjectHex,encoding.InjectBase64,latentinjection.LatentInjectionReport,latentinjection.LatentInjectionResume}
reporting:
  report_dir: $E/salida
EOF

"$E/venv/bin/python" -m garak --config "$E/garak.yaml" --report_prefix fixture
CRUDO="$(ls "$E"/salida/fixture*.report.jsonl 2>/dev/null | head -1 || true)"
[[ -n "$CRUDO" ]] || CRUDO="$(find "$E" -name 'fixture*.report.jsonl' | head -1)"
echo "crudo: $CRUDO ($(wc -l < "$CRUDO") líneas)"

mkdir -p "$(dirname "$SALIDA")"
node "$RAIZ/scripts/adaptadores/redactar-garak.mjs" "$CRUDO" "$SALIDA" "$E=<fixture>" "$RAIZ=<repo>" "$HOME=<home>"
