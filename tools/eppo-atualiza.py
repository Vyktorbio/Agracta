#!/usr/bin/env python3
"""Gera data/eppo.json: nome científico -> código EPPO, só com código CONFERIDO na EPPO.

Os nomes vêm do que o Agracta já usa: os binômios do alvos-catalogo.js e as
culturas de tools/eppo-culturas.json. Nenhum código é digitado à mão.

Para cada nome:
  1. pergunta à EPPO qual código corresponde (tools/names2codes);
  2. abre o táxon de cada código candidato e só aceita se o nome preferido, ou
     um nome registrado para aquele táxon, for EXATAMENTE o nome consultado
     (ignorando só caixa, espaços e o sinal de híbrido).
Qualquer resposta fora do esperado vira "não resolvido" — nunca um código
aproximado. Um código errado faz o Agracta juntar ensaios que não têm nada a ver;
um código ausente só deixa a busca dizer que não é completa.

Duas fontes, a mesma regra:
  EPPO_TOKEN=... python3 tools/eppo-atualiza.py            (API da EPPO)
  python3 tools/eppo-atualiza.py --xml caminho/fullcodes.xml  (arquivo oficial)

O arquivo oficial é o "fullcodes.xml" do pacote xmlfull.zip, baixado com login
gratuito em https://data.eppo.int. Nele a conferência é direta: o nome tem que
aparecer, exatamente, como nome latino ativo de um código ativo. Nome que aparece
em mais de um código (homônimo entre grupos) fica "ambíguo" e sem código.

Dados sob a EPPO Open Licence. O workflow "Atualizar tabela EPPO" usa a API e
abre uma PR.
"""
import json
import os
import pathlib
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = 'https://data.eppo.int/api/rest/1.0'
CODIGO = re.compile(r'\b[0-9A-Z]{5,6}\b')


def normal(nome):
    s = unicodedata.normalize('NFKC', str(nome or '')).replace('×', 'x')
    return re.sub(r'\s+', ' ', s).strip().lower()


def nomes_do_catalogo(texto):
    """Binômios do alvos-catalogo.js: ['nome de campo','Binômio científico']."""
    return sorted({m.strip() for m in re.findall(r"\['[^']*','([^']+)'\]", texto)})


def http_json(url, token):
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'X-Api-Key': token,
                                               'User-Agent': 'Agracta/eppo-atualiza'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def candidatos(resposta, nome):
    """Códigos que a resposta de names2codes sugere para o nome. Aceita o valor
    como texto ou lista; o que não parecer código é ignorado."""
    vals = []
    if isinstance(resposta, dict):
        for k, v in resposta.items():
            if normal(k) == normal(nome) or len(resposta) == 1:
                vals.append(v)
    elif isinstance(resposta, list):
        vals = resposta
    out = []
    for v in vals:
        for c in CODIGO.findall(json.dumps(v) if not isinstance(v, str) else v):
            if c not in out:
                out.append(c)
    return out[:3]


def nomes_do_taxon(taxon, lista_nomes):
    nomes = set()
    if isinstance(taxon, dict) and taxon.get('prefname'):
        nomes.add(normal(taxon['prefname']))
    for n in lista_nomes if isinstance(lista_nomes, list) else []:
        if isinstance(n, dict) and n.get('fullname'):
            nomes.add(normal(n['fullname']))
    return nomes


def resolver(nome, token, get=http_json, pausa=0.2):
    q = urllib.parse.urlencode({'authtoken': token, 'intext': nome})
    try:
        cands = candidatos(get(f'{BASE}/tools/names2codes?{q}', token), nome)
    except Exception as e:  # rede, token, formato
        return None, f'consulta falhou: {type(e).__name__}'
    if not cands:
        return None, 'EPPO não devolveu código'
    for c in cands:
        t = urllib.parse.urlencode({'authtoken': token})
        try:
            taxon = get(f'{BASE}/taxon/{c}?{t}', token)
            if isinstance(taxon, dict) and taxon.get('is_active') is False:
                continue
            nomes = nomes_do_taxon(taxon, [])
            if normal(nome) not in nomes:
                nomes |= nomes_do_taxon(taxon, get(f'{BASE}/taxon/{c}/names?{t}', token))
        except Exception:
            continue
        finally:
            time.sleep(pausa)
        if normal(nome) in nomes:
            return {'eppo': c, 'nomePreferido': (taxon or {}).get('prefname') or nome}, None
    return None, 'nenhum código conferiu com o nome (' + ', '.join(cands) + ')'


def indice_xml(caminho):
    """nome latino normalizado -> [(código, nome preferido do código, o nome é o preferido?)]

    Lê o fullcodes.xml em fluxo (o arquivo tem ~130 MB). Só códigos ativos e só
    nomes latinos ativos entram."""
    idx, data_export = {}, None
    for ev, el in ET.iterparse(caminho, events=('start', 'end')):
        if ev == 'start' and el.tag == 'codes':
            data_export = el.get('dateexport')
        if ev != 'end' or el.tag != 'code':
            continue
        if el.get('isactive') == 'true':
            cod = (el.findtext('eppocode') or '').strip()
            nomes = el.find('names')
            latinos = []
            for nm in (nomes if nomes is not None else []):
                if nm.get('isactive') == 'false' or (nm.findtext('lang') or '') != 'la':
                    continue
                latinos.append(((nm.findtext('fullname') or '').strip(), nm.get('ispreferred') == 'true'))
            pref = next((n for n, p in latinos if p), None)
            if CODIGO.fullmatch(cod):
                for n, p in latinos:
                    if n:
                        idx.setdefault(normal(n), []).append((cod, pref or n, p))
        el.clear()
    return idx, data_export


def resolver_xml(nome, idx):
    achados = idx.get(normal(nome), [])
    cods = sorted({c for c, _, _ in achados})
    if not cods:
        return None, 'nome não consta como nome latino ativo na EPPO'
    if len(cods) > 1:
        preferidos = sorted({c for c, _, p in achados if p})
        if len(preferidos) != 1:
            return None, 'ambíguo na EPPO (' + ', '.join(cods) + ')'
        cods = preferidos
    c = cods[0]
    pref = next(pn for cc, pn, _ in achados if cc == c)
    return {'eppo': c, 'nomePreferido': pref}, None


def gerar(token, get=http_json, pausa=0.2, hoje=None, xml=None):
    culturas = json.loads((ROOT / 'tools/eppo-culturas.json').read_text())['culturas']
    nomes = sorted(set(nomes_do_catalogo((ROOT / 'alvos-catalogo.js').read_text())) | set(culturas.values()))
    codigos, falta, idx, exportado = {}, [], None, None
    if xml:
        idx, exportado = indice_xml(xml)
    for nome in nomes:
        r, motivo = resolver_xml(nome, idx) if xml else resolver(nome, token, get, pausa)
        if r:
            codigos[nome] = r
        else:
            falta.append({'nome': nome, 'motivo': motivo})
    return {
        'schema': 1,
        'fonte': 'EPPO Global Database — https://data.eppo.int' + (' (fullcodes.xml exportado em ' + exportado + ')' if exportado else ' (API)'),
        'licenca': 'EPPO Open Licence',
        'gerado': hoje or time.strftime('%Y-%m-%d'),
        'culturas': culturas,
        'codigos': codigos,
        'naoResolvidos': falta,
    }


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    xml = argv[argv.index('--xml') + 1] if '--xml' in argv and argv.index('--xml') + 1 < len(argv) else None
    token = os.environ.get('EPPO_TOKEN', '').strip()
    if not token and not xml:
        print('Falta EPPO_TOKEN (cadastro gratuito em https://data.eppo.int) ou --xml fullcodes.xml. Nada foi alterado.', file=sys.stderr)
        return 2
    destino = ROOT / 'data/eppo.json'
    antigo = json.loads(destino.read_text()) if destino.exists() else {'codigos': {}}
    novo = gerar(token, xml=xml)
    if len(novo['codigos']) < 0.8 * len(antigo.get('codigos', {})):
        print('A tabela perdeu mais de 20% dos códigos. Revisar a fonte antes de substituir.', file=sys.stderr)
        return 1
    if {k: v for k, v in novo.items() if k != 'gerado'} == {k: v for k, v in antigo.items() if k != 'gerado'}:
        print('Tabela EPPO sem mudança.')
        return 0
    destino.write_text(json.dumps(novo, ensure_ascii=False, indent=1) + '\n')
    sw = ROOT / 'sw.js'
    texto = sw.read_text()
    novo_sw, n = re.subn(r"(var CACHE = 'agracta-app-v)(\d+)(';)", lambda m: m[1] + str(int(m[2]) + 1) + m[3], texto, count=1)
    if n:
        sw.write_text(novo_sw)
    print(f"Tabela EPPO: {len(novo['codigos'])} códigos conferidos, {len(novo['naoResolvidos'])} não resolvidos.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
