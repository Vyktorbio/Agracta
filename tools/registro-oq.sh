#!/bin/bash
# Registro de execução da OQ automática — Agracta
#
# A validação (docs/VALIDACAO-SISTEMA.md, §7) usa os testes automáticos como
# evidência da OQ. Evidência é um REGISTRO: qual versão, quando, quem rodou,
# em que ambiente e o que deu. A tela do conferir.sh some quando o Terminal
# fecha, e o log do CI no GitHub expira — nenhum dos dois serve para a GQ
# arquivar.
#
# Este script roda o mesmo portão do CI e grava o resultado num arquivo de
# texto com cabeçalho, e o SHA-256 dele num arquivo ao lado. O arquivo vai para o
# arquivo controlado do laboratório, NÃO para o repositório: o repositório é
# público e o site sai dele.
#
#   bash tools/registro-oq.sh                  só o portão (conferir.sh)
#   bash tools/registro-oq.sh --com-regras     portão + regras do Firestore
#                                              no emulador (precisa de Java)
#
# Saída: registros-validacao/OQ-AAAAMMDD-HHMM-<commit>.txt e, ao lado, o
#        .sha256 dele (para conferir depois que ninguém mexeu no registro).
# Código de saída: 0 se tudo que rodou passou; 1 se algo reprovou.

cd "$(dirname "$0")/.." || exit 1

COM_REGRAS=0
for arg in "$@"; do
  case "$arg" in
    --com-regras) COM_REGRAS=1 ;;
    *) printf "uso: tools/registro-oq.sh [--com-regras]\n" >&2; exit 2 ;;
  esac
done

sem_cor(){ sed 's/\x1b\[[0-9;]*m//g'; }

COMMIT="(sem git)"; SUJO=""
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  COMMIT=$(git rev-parse HEAD)
  [ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ] && SUJO=" + ALTERAÇÕES NÃO GRAVADAS"
fi
CURTO=$(printf "%s" "$COMMIT" | cut -c1-7)
[ "$COMMIT" = "(sem git)" ] && CURTO="semgit"
CACHE=$(grep -o "agracta-app-v[0-9]*" sw.js | head -1)
QUANDO=$(date '+%Y%m%d-%H%M')
QUEM=$( (git config user.name 2>/dev/null) || true ); [ -z "$QUEM" ] && QUEM="${USER:-desconhecido}"

mkdir -p registros-validacao
ARQ="registros-validacao/OQ-$QUANDO-$CURTO.txt"
CORPO=$(mktemp)

{
  printf "AGRACTA — REGISTRO DE EXECUÇÃO DA OQ AUTOMÁTICA\n"
  printf "Documento de referência: docs/VALIDACAO-SISTEMA.md (§7)\n"
  printf "==========================================================\n"
  printf "Versão (commit) ....: %s%s\n" "$COMMIT" "$SUJO"
  printf "Versão do pacote ...: %s\n" "${CACHE:-?}"
  printf "Executado em .......: %s\n" "$(date '+%d/%m/%Y %H:%M:%S %z')"
  printf "Executado por ......: %s\n" "$QUEM"
  printf "Máquina ............: %s\n" "$(uname -sm)"
  printf "Node ...............: %s\n" "$(node --version 2>/dev/null || echo ausente)"
  printf "Python .............: %s\n" "$(python3 --version 2>/dev/null || echo ausente)"
  printf "Java (emulador) ....: %s\n" "$( (java -version 2>&1 | grep -i version | head -1) || echo ausente)"
  printf "\n"
} > "$CORPO"

printf "Rodando o portão (conferir.sh --pull-request)...\n"
SAIDA=$(bash conferir.sh --pull-request 2>&1 | sem_cor)
if printf "%s" "$SAIDA" | grep -q "PODE SUBIR"; then COD_PORTAO=0; else COD_PORTAO=1; fi
N_OK=$(printf "%s\n" "$SAIDA" | grep -c "^   ok ")
N_PULADO=$(printf "%s\n" "$SAIDA" | grep -c "^   pulado ")

COD_REGRAS=0; RES_REGRAS="NÃO EXECUTADO (rode com --com-regras)"
if [ "$COM_REGRAS" -eq 1 ]; then
  printf "Rodando as regras do Firestore no emulador (npm run test:regras)...\n"
  SAIDA_REGRAS=$(npm run --silent test:regras 2>&1 | sem_cor)
  COD_REGRAS=$?
  if printf "%s" "$SAIDA_REGRAS" | grep -qi "download failed\|java.*not found\|could not spawn"; then
    RES_REGRAS="NÃO EXECUTADO (emulador não subiu — ver saída)"; COD_REGRAS=1
  elif [ "$COD_REGRAS" -eq 0 ]; then RES_REGRAS="APROVADO"; else RES_REGRAS="REPROVADO"; fi
fi

{
  printf "RESUMO\n------\n"
  printf "Portão (conferir.sh) : %s\n" "$([ $COD_PORTAO -eq 0 ] && echo APROVADO || echo REPROVADO)"
  printf "  conferências ok    : %s\n" "$N_OK"
  printf "  testes que NÃO rodaram (pulados): %s\n" "$N_PULADO"
  printf "Regras do Firestore  : %s\n" "$RES_REGRAS"
  [ "$N_PULADO" -gt 0 ] && printf "\nATENÇÃO: teste pulado não é teste aprovado. A OQ só vale completa com 0 pulados.\n"
  printf "\n\nSAÍDA COMPLETA DO PORTÃO\n------------------------\n%s\n" "$SAIDA"
  if [ "$COM_REGRAS" -eq 1 ]; then
    printf "\n\nSAÍDA COMPLETA DAS REGRAS\n-------------------------\n%s\n" "$SAIDA_REGRAS"
  fi
} >> "$CORPO"

printf "\nRevisado por (GQ): ______________________  Data: ___/___/______\n" >> "$CORPO"
mv "$CORPO" "$ARQ"

# O SHA-256 vai num arquivo ao lado, no formato que as duas ferramentas
# conferem sozinhas: `shasum -a 256 -c ARQ.sha256` (Mac) ou
# `sha256sum -c ARQ.sha256` (Linux), rodado dentro de registros-validacao/.
NOME=$(basename "$ARQ")
if command -v sha256sum >/dev/null 2>&1; then (cd registros-validacao && sha256sum "$NOME" > "$NOME.sha256")
else (cd registros-validacao && shasum -a 256 "$NOME" > "$NOME.sha256"); fi

printf "\nRegistro gravado em %s (e %s.sha256)\n" "$ARQ" "$ARQ"
[ $COD_PORTAO -eq 0 ] && [ $COD_REGRAS -eq 0 ]
