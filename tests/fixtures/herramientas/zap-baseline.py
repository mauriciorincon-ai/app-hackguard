#!/bin/sh
# Envoltorio: el comando real de ZAP se llama zap-baseline.py; el simulado es un script de Node (Node no arranca archivos .py).
# Sin `dirname`: el PATH de la prueba solo trae la carpeta de simuladas y la de node.
exec node "${0%/*}/zap-baseline.mjs" "$@"
