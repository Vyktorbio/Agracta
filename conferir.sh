#!/bin/bash
# Portão antes de publicar — Agracta
#
# O Agracta é publicado arrastando arquivos no GitHub, e não existe nada entre
# "arrastar" e "no ar". Um erro de sintaxe no app.js derruba o app inteiro para
# todo mundo, e a descoberta vem de alguém no campo que não consegue abrir.
#
# Este script é esse portão. Roda tudo que dá para checar sem navegador e
# responde uma coisa só: PODE SUBIR, ou NÃO SUBA e por quê.
#
# Chamado pelo "Conferir antes de publicar.command" (duplo clique).

cd "$(dirname "$0")" || exit 1

VERDE=$'\033[0;32m'; VERM=$'\033[0;31m'; AMAR=$'\033[0;33m'; NEG=$'\033[1m'; ZERO=$'\033[0m'
PROBLEMAS=0
avisar(){ printf "   %s%s%s\n" "$VERM" "$1" "$ZERO"; PROBLEMAS=$((PROBLEMAS+1)); }
ok(){     printf "   %sok%s   %s\n" "$VERDE" "$ZERO" "$1"; }
titulo(){ printf "\n%s%s%s\n" "$NEG" "$1" "$ZERO"; }

printf "%s\n" "======================================================"
printf "%s\n" "  AGRACTA — conferindo antes de publicar"
printf "%s\n" "  $(date '+%d/%m/%Y %H:%M')"
printf "%s\n" "======================================================"

# ---------------------------------------------------------------- 1. sintaxe
titulo "1. Os arquivos abrem sem erro de sintaxe?"
if ! command -v node >/dev/null 2>&1; then
  avisar "node não encontrado — não dá para conferir sintaxe nem rodar teste."
else
  for f in app.js estatistica.js firebase-sync.js ui-campo.js acesso-horario.js alvos-catalogo.js estatistica/app.js; do
    [ -f "$f" ] || continue
    if node -e "new Function(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
      ok "$f"
    else
      avisar "$f TEM ERRO DE SINTAXE — publicar isto quebra o app:"
      node -e "new Function(require('fs').readFileSync('$f','utf8'))" 2>&1 | head -3 | sed 's/^/        /'
    fi
  done
  # As folhas têm o script embutido no HTML
  for f in prancha.html croqui.html; do
    [ -f "$f" ] || continue
    if node -e "
      var s=require('fs').readFileSync('$f','utf8');
      var re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g, m, n=0;
      while((m=re.exec(s))!==null){ new Function(m[1]); n++; }
      if(!n) throw new Error('nenhum script embutido encontrado');
    " 2>/dev/null; then
      ok "$f"
    else
      avisar "$f TEM ERRO DE SINTAXE no script embutido:"
      node -e "
        var s=require('fs').readFileSync('$f','utf8');
        var re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g, m;
        while((m=re.exec(s))!==null){ new Function(m[1]); }
      " 2>&1 | head -3 | sed 's/^/        /'
    fi
  done
fi

if command -v python3 >/dev/null 2>&1 && [ -f ndvi-proxy.py ]; then
  if python3 -c "import ast,io; ast.parse(io.open('ndvi-proxy.py',encoding='utf-8').read())" 2>/dev/null; then
    ok "ndvi-proxy.py"
  else
    avisar "ndvi-proxy.py TEM ERRO DE SINTAXE — o proxy do clima não sobe:"
    python3 -c "import ast,io; ast.parse(io.open('ndvi-proxy.py',encoding='utf-8').read())" 2>&1 | tail -3 | sed 's/^/        /'
  fi
fi

# ------------------------------------------------------------------ 2. testes
titulo "2. Os testes passam?"
if command -v node >/dev/null 2>&1; then
  for t in test_*.js; do
    [ -f "$t" ] || continue
    if node "$t" >/tmp/agracta_teste.log 2>&1; then
      ok "$t"
    else
      avisar "$t FALHOU:"
      grep -E "FALHA|Error" /tmp/agracta_teste.log | head -4 | sed 's/^/        /'
    fi
  done
fi
if command -v python3 >/dev/null 2>&1; then
  for t in test_*.py; do
    [ -f "$t" ] || continue
    if python3 "$t" >/tmp/agracta_teste.log 2>&1; then
      ok "$t"
    else
      avisar "$t FALHOU:"
      grep -E "FALHA|Error" /tmp/agracta_teste.log | head -4 | sed 's/^/        /'
    fi
  done
fi

# ------------------------------------------------- 3. cache: o erro silencioso
titulo "3. O aparelho vai pegar a versão nova?"
# Este é o erro que não dá tela vermelha: publica tudo certo e o Chrome App
# continua servindo o cache velho. Ninguém desconfia, porque "não mudou nada".
CSS_HTML=$(grep -o 'styles\.css?v=[0-9]*' index.html 2>/dev/null | head -1)
JS_HTML=$(grep -o 'app\.js?v=[0-9]*'    index.html 2>/dev/null | head -1)
CSS_SW=$(grep -o 'styles\.css?v=[0-9]*'  sw.js      2>/dev/null | head -1)
JS_SW=$(grep -o 'app\.js?v=[0-9]*'       sw.js      2>/dev/null | head -1)
CACHE=$(grep -o "agracta-app-v[0-9]*"    sw.js      2>/dev/null | head -1)
SW_REG=$(grep -o "sw\.js?v=[0-9]*"       index.html 2>/dev/null | head -1)

if [ -z "$CSS_HTML" ] || [ -z "$JS_HTML" ]; then
  avisar "não achei as versões (?v=) no index.html"
else
  if [ "$CSS_HTML" = "$CSS_SW" ]; then ok "sw.js pré-carrega o mesmo $CSS_HTML"
  else avisar "index.html pede '$CSS_HTML' mas o sw.js pré-carrega '$CSS_SW' — corrija a lista ASSETS do sw.js"; fi
  if [ "$JS_HTML" = "$JS_SW" ]; then ok "sw.js pré-carrega o mesmo $JS_HTML"
  else avisar "index.html pede '$JS_HTML' mas o sw.js pré-carrega '$JS_SW' — corrija a lista ASSETS do sw.js"; fi
fi


# Todo arquivo pre-carregado precisa existir. O sw.js usa cache.addAll(), que e
# tudo-ou-nada: um unico 404 na lista faz a instalacao inteira falhar, o Service
# Worker novo nunca ativa e o aparelho fica servindo a versao velha para sempre.
# Nao aparece erro em lugar nenhum — o app so "nao atualiza".
if command -v node >/dev/null 2>&1; then
  SUMIDOS=$(node -e '
    var fs=require("fs"), falta=[];
    function confere(lista){ lista.forEach(function(u){
      var p=String(u).replace(/^\.\//,"").replace(/[?#].*$/,"");
      if(!p || /^(https?:)?\/\//.test(p)) return;
      if(!fs.existsSync(p) && falta.indexOf(p)<0) falta.push(p);
    }); }
    var sw=fs.readFileSync("sw.js","utf8");
    var m=sw.match(/var ASSETS\s*=\s*\[([\s\S]*?)\];/);
    if(m) confere((m[1].match(/'"'"'[^'"'"']+'"'"'/g)||[]).map(function(s){return s.slice(1,-1);}));
    var html=fs.readFileSync("index.html","utf8"), r=/(?:src|href)="([^"]+)"/g, x;
    while((x=r.exec(html))) confere([x[1]]);
    console.log(falta.join("\n"));
  ' 2>/dev/null)
  if [ -z "$SUMIDOS" ]; then
    ok "todo arquivo pré-carregado existe mesmo"
  else
    echo "$SUMIDOS" | while IFS= read -r arq; do
      [ -n "$arq" ] && avisar "'$arq' é pedido pelo sw.js/index.html mas NÃO existe — com um 404 na lista o Service Worker inteiro não instala e ninguém recebe a versão nova"
    done
    # o subshell do while nao propaga a contagem; reconta aqui
    PROBLEMAS=$(( PROBLEMAS + $(echo "$SUMIDOS" | grep -c .) ))
  fi
fi

# O CACHE precisa ser diferente do que já está no ar, senão o SW não troca nada.
if [ -z "$CACHE" ]; then
  avisar "não achei o nome do CACHE no sw.js"
else
  NOAR=""; SW_REG_NOAR=""
  if command -v curl >/dev/null 2>&1; then
    NOAR=$(curl -s -m 12 "https://www.agracta.com.br/sw.js" 2>/dev/null | grep -o "agracta-app-v[0-9]*" | head -1)
    SW_REG_NOAR=$(curl -s -m 12 "https://www.agracta.com.br/index.html" 2>/dev/null | grep -o "sw\.js?v=[0-9]*" | head -1)
  fi
  # O ?v= do REGISTRO do service worker faz parte da convencao de publicacao, e
  # derrapou tres versoes seguidas sem ninguem notar — porque nada conferia.
  # NAO reprova a publicacao: o navegador compara o script do SW byte a byte e
  # ignora o cache HTTP para ele, entao a atualizacao acontece do mesmo jeito. Mas
  # quando o numero para de andar, ele deixa de servir para o unico fim que tem:
  # dizer, olhando o index.html, qual publicacao esta la.
  if [ -n "$SW_REG" ] && [ -n "$SW_REG_NOAR" ] && [ -n "$NOAR" ] && [ "$NOAR" != "$CACHE" ]; then
    if [ "$SW_REG" = "$SW_REG_NOAR" ]; then
      printf "   %s??%s   o CACHE vai mudar (%s -> %s) mas o registro continua '%s'.\n" "$AMAR" "$ZERO" "$NOAR" "$CACHE" "$SW_REG"
      printf "        Nao quebra a atualizacao, mas o numero deixa de dizer qual\n"
      printf "        publicacao esta no ar. Suba-o no index.html.\n"
    else
      ok "registro do service worker: $SW_REG_NOAR (no ar) -> $SW_REG (vai subir)"
    fi
  fi
  if [ -z "$NOAR" ]; then
    printf "   %s??%s   não consegui ler o sw.js publicado (sem internet?). Confira à mão que o CACHE mudou: aqui está %s\n" "$AMAR" "$ZERO" "$CACHE"
  elif [ "$NOAR" = "$CACHE" ]; then
    avisar "o CACHE ($CACHE) é IGUAL ao que já está no ar — o app instalado NÃO vai atualizar. Suba o número em sw.js."
  else
    ok "CACHE novo: $NOAR (no ar) -> $CACHE (vai subir)"
  fi
fi

# ------------------------------------------------------------- 4. o veredito
printf "\n%s\n" "======================================================"
if [ "$PROBLEMAS" -eq 0 ]; then
  printf "  %s%sPODE SUBIR.%s  Nada quebrado encontrado.\n" "$VERDE" "$NEG" "$ZERO"
  printf "\n  Lembre: arraste os ARQUIVOS, nunca a pasta.\n"
  printf "  Pasta vira subpasta no GitHub e a publicação não faz nada.\n"
else
  printf "  %s%sNAO SUBA.%s  %s problema(s) acima.\n" "$VERM" "$NEG" "$ZERO" "$PROBLEMAS"
  printf "\n  Publicar assim pode derrubar o app para todo mundo.\n"
fi
printf "%s\n\n" "======================================================"
[ "$PROBLEMAS" -eq 0 ]
