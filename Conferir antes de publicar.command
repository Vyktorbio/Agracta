#!/bin/bash
# Duplo clique neste arquivo antes de subir qualquer coisa para o GitHub.
# Ele abre o Terminal, roda a conferência e espera você ler antes de fechar.
cd "$(dirname "$0")" || exit 1
bash conferir.sh
CODIGO=$?
printf "\nPressione ENTER para fechar."
read -r _
exit $CODIGO
