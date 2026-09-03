#!/usr/bin/env python3
"""Destila o catálogo do Agrofit para o formato que o app embarca.

POR QUE UM ARQUIVO EMBARCADO E NÃO UMA CHAMADA DE API

O Agrofit tem API (AgroAPI/Embrapa), mas ela pede um token de assinatura por
conta, e token é credencial de servidor: num PWA ele ficaria legível para
qualquer pessoa que abrisse o código da página. E, mais decisivo que isso, o
Agracta é usado em campo — o momento em que o técnico procura um produto é
justamente o momento em que ele não tem sinal. Uma consulta que depende da rede
falha exatamente quando precisa funcionar.

Os mesmos dados do MAPA saem como dados abertos, sem chave, sob CC-BY. Este
script os destila; o app embarca o resultado e consulta offline.

O QUE ELE FAZ

O CSV de produtos formulados tem uma linha por (produto x cultura x praga) —
280 mil linhas para 4.397 registros. Quase tudo é repetição. Aqui isso vira:

  data/agrofit.json           catálogo de produtos (busca por marca, i.a., registro)
  data/agrofit-culturas.json  culturas registradas por produto (carregado sob demanda)

Titular, classe, formulação e as classificações se repetem milhares de vezes,
então saem para vocabulários e o produto guarda o índice. Isso corta o catálogo
de 1,4 MB para ~520 KB sem perder um campo.

Rodar:  python3 tools/agrofit-destila.py
        python3 tools/agrofit-destila.py --csv arquivo-local.csv

Fonte: Ministério da Agricultura e Pecuária — Agrofit, dados abertos (CC-BY).
https://dados.agricultura.gov.br/dataset/sistema-de-agrotoxicos-fitossanitarios-agrofit
"""
import argparse, collections, csv, io, json, os, sys, urllib.request, datetime

URL = ("https://dados.agricultura.gov.br/dataset/6c913699-e82e-4da3-a0a1-fb6c431e367f/"
       "resource/d30b30d7-e256-484e-9ab8-cd40974e1238/download/agrofitprodutosformulados.csv")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def limpa(s):
    """O arquivo é UTF-8 com bytes CP1252 soltos — o travessão da classe
    toxicológica é o caso comum. Não é 'codificação errada': trocar o arquivo
    inteiro de codificação estragaria 'Algodão' para consertar um travessão."""
    if not s: return ''
    for ruim, bom in (('\x96','–'), ('\x97','—'), ('\x92',"'"),
                      ('\x93','"'), ('\x94','"'), ('\x85','…')):
        s = s.replace(ruim, bom)
    return s.strip()

def marcas(s):
    """Um registro pode carregar várias marcas comerciais separadas por ';'.
    O técnico procura pela marca que está no rótulo, não pelo número — então
    todas viram entrada de busca, e a que ele escolher vira o nome do item."""
    return [m for m in (x.strip() for x in limpa(s).split(';')) if m]

def abre(caminho):
    if caminho:
        return open(caminho, 'rb')
    req = urllib.request.Request(URL, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Accept': 'text/csv,*/*'})
    return urllib.request.urlopen(req, timeout=900)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', help='CSV local em vez de baixar do MAPA')
    ap.add_argument('--saida', default=os.path.join(RAIZ, 'data'))
    args = ap.parse_args()

    csv.field_size_limit(10**9)
    prod, culturas, linhas = {}, {}, 0

    with abre(args.csv) as fh:
        leitor = csv.DictReader(io.TextIOWrapper(fh, encoding='utf-8', errors='replace'),
                                delimiter=';')
        for row in leitor:
            linhas += 1
            nr = (row.get('NR_REGISTRO') or '').strip()
            if not nr:
                continue
            if nr not in prod:
                prod[nr] = {
                    'nr': nr,
                    'm': marcas(row.get('MARCA_COMERCIAL')),
                    'ia': limpa(row.get('INGREDIENTE_ATIVO')),
                    'f': limpa(row.get('FORMULACAO')),
                    't': limpa(row.get('TITULAR_DE_REGISTRO')),
                    'c': limpa(row.get('CLASSE')),
                    'a': limpa(row.get('MODO_DE_ACAO')),
                    'x': limpa(row.get('CLASSE_TOXICOLOGICA')),
                    'e': limpa(row.get('CLASSE_AMBIENTAL')),
                    'o': 1 if (row.get('ORGANICOS') or '').strip().upper() == 'SIM' else 0,
                }
                culturas[nr] = set()
            cult = limpa(row.get('CULTURA'))
            if cult:
                culturas[nr].add(cult)

    if not prod:
        sys.exit('nenhum produto lido — o CSV veio vazio ou mudou de formato')

    itens = sorted(prod.values(), key=lambda p: int(p['nr']) if p['nr'].isdigit() else 0)

    def vocabulario(chave):
        vals = sorted({p[chave] for p in itens})
        return vals, {v: i for i, v in enumerate(vals)}

    vt, it = vocabulario('t'); vc, ic = vocabulario('c'); vf, if_ = vocabulario('f')
    vx, ix = vocabulario('x'); ve, ie = vocabulario('e'); va, ia_ = vocabulario('a')

    catalogo = {
        'fonte': 'Agrofit — Ministério da Agricultura e Pecuária, dados abertos (CC-BY)',
        'url': URL,
        'gerado': datetime.date.today().isoformat(),
        'produtos': len(itens),
        'voc': {'t': vt, 'c': vc, 'f': vf, 'x': vx, 'e': ve, 'a': va},
        # A ordem dos campos é contrato com vendor/agrofit-core.js.
        'campos': ['nr', 'm', 'ia', 'f', 't', 'c', 'a', 'x', 'e', 'o'],
        'p': [[p['nr'], p['m'], p['ia'], if_[p['f']], it[p['t']], ic[p['c']],
               ia_[p['a']], ix[p['x']], ie[p['e']], p['o']] for p in itens],
    }

    todas = sorted({c for s in culturas.values() for c in s})
    idx = {c: i for i, c in enumerate(todas)}
    porCultura = {
        'fonte': catalogo['fonte'],
        'gerado': catalogo['gerado'],
        'culturas': todas,
        'p': {p['nr']: sorted(idx[c] for c in culturas[p['nr']]) for p in itens},
    }

    os.makedirs(args.saida, exist_ok=True)
    for nome, dado in (('agrofit.json', catalogo), ('agrofit-culturas.json', porCultura)):
        caminho = os.path.join(args.saida, nome)
        with open(caminho, 'w', encoding='utf-8') as f:
            json.dump(dado, f, ensure_ascii=False, separators=(',', ':'))
        print('%-24s %7.0f KB' % (nome, os.path.getsize(caminho) / 1024))

    print('linhas lidas        %d' % linhas)
    print('produtos            %d' % len(itens))
    print('marcas comerciais   %d' % sum(len(p['m']) for p in itens))
    print('culturas distintas  %d' % len(todas))

if __name__ == '__main__':
    main()
