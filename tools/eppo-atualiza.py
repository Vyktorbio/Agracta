#!/usr/bin/env python3
"""Gera data/eppo.json: nome científico -> código EPPO, só com código CONFERIDO na EPPO.

Os nomes vêm do que o Agracta já usa: os binômios do alvos-catalogo.js e as
culturas de tools/eppo-culturas.json. Nenhum código é digitado à mão.

Para cada nome:
  1. pergunta à EPPO quais códigos têm aquele nome (API v2, tools/name2codes);
  2. abre cada código candidato e só aceita se ele estiver ativo e tiver o nome
     consultado, EXATAMENTE, como nome latino (ignorando só caixa, espaços e o
     sinal de híbrido). Mais de um código conferido: vale o que tem o nome como
     preferido; se não houver exatamente um, fica "ambíguo".
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
from collections import Counter
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
# API v2 (especificação: https://api.eppo.int/gd/v2/eppo_api_gd_v2.yml). A chave
# vai só no cabeçalho X-Api-Key — nunca na URL.
BASE = 'https://api.eppo.int/gd/v2'
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


def candidatos(resposta):
    """name2codes devolve [{eppocode, preferred}]. Devolve [(código, preferido)],
    sem repetição; o que não tiver forma de código é ignorado."""
    out, vistos = [], set()
    for item in resposta if isinstance(resposta, list) else []:
        if not isinstance(item, dict):
            continue
        c = str(item.get('eppocode') or '').strip().upper()
        if CODIGO.fullmatch(c) and c not in vistos:
            vistos.add(c)
            out.append((c, item.get('preferred') is True))
    return out[:6]


def nomes_latinos(overview, nomes):
    """Nomes latinos do táxon: o preferido do overview e os de lang_iso 'la'."""
    out = set()
    if isinstance(overview, dict) and overview.get('prefname'):
        out.add(normal(overview['prefname']))
    for n in nomes if isinstance(nomes, list) else []:
        if isinstance(n, dict) and n.get('fullname') and n.get('lang_iso') == 'la':
            out.add(normal(n['fullname']))
    return out


# Amostras do que a API respondeu, para o log dizer POR QUE falhou. O token é
# apagado de tudo que entra aqui; nada disto vai para a tabela.
DIAG = {'names2codes': [], 'taxon': [], 'erros': []}


def _amostra(tipo, valor, token, limite=3):
    if len(DIAG[tipo]) >= limite:
        return
    txt = valor if isinstance(valor, str) else json.dumps(valor, ensure_ascii=False)
    if token:
        txt = txt.replace(token, '***')
    DIAG[tipo].append(txt[:400])


def _erro(e, token):
    msg = type(e).__name__
    codigo = getattr(e, 'code', None)
    if codigo is not None:
        msg += f' {codigo}'
    corpo = ''
    try:
        corpo = e.read().decode('utf-8', 'replace')[:300] if hasattr(e, 'read') else str(e)[:300]
    except Exception:
        pass
    _amostra('erros', msg + (': ' + corpo if corpo else ''), token)
    return msg


def resolver(nome, token, get=http_json, pausa=0.2):
    q = urllib.parse.urlencode({'name': nome, 'onlyPreferred': 'false'})
    try:
        resp = get(f'{BASE}/tools/name2codes?{q}', token)
        _amostra('names2codes', {'nome': nome, 'resposta': resp}, token)
        cands = candidatos(resp)
    except Exception as e:  # rede, chave, formato
        return None, f'consulta falhou: {_erro(e, token)}'
    if not cands:
        return None, 'EPPO não devolveu código'
    conferidos = []
    for c, preferido in cands:
        try:
            ov = get(f'{BASE}/taxons/taxon/{c}/overview', token)
            _amostra('taxon', {'codigo': c, 'resposta': ov}, token)
            if not isinstance(ov, dict) or ov.get('is_active') is False:
                continue
            nomes = nomes_latinos(ov, [])
            if normal(nome) not in nomes:
                nomes |= nomes_latinos(ov, get(f'{BASE}/taxons/taxon/{c}/names', token))
        except Exception as e:
            _erro(e, token)
            continue
        finally:
            time.sleep(pausa)
        if normal(nome) in nomes:
            conferidos.append((c, preferido, ov.get('prefname') or nome))
    if not conferidos:
        return None, 'nenhum código conferiu com o nome (' + ', '.join(c for c, _ in cands) + ')'
    if len(conferidos) > 1:
        pref = [x for x in conferidos if x[1]]
        if len(pref) != 1:
            return None, 'ambíguo na EPPO (' + ', '.join(sorted(x[0] for x in conferidos)) + ')'
        conferidos = pref
    c, _, prefname = conferidos[0]
    return {'eppo': c, 'nomePreferido': prefname}, None


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


def diagnostico(novo, antigo, saida=None):
    """Resumo para o log: quantos resolveram, por que os outros não, e o formato
    das primeiras respostas da API. É o que permite ajustar a ferramenta sem
    ter o token em mãos."""
    saida = saida or sys.stdout
    motivos = Counter(re.split(r'[:(]', x['motivo'])[0].strip() for x in novo['naoResolvidos'])
    print(f"Resolvidos: {len(novo['codigos'])} (tabela atual: {len(antigo.get('codigos', {}))}). "
          f"Não resolvidos: {len(novo['naoResolvidos'])}.", file=saida)
    for m, n in motivos.most_common():
        print(f'  {n:4d}  {m}', file=saida)
    for tipo in ('erros', 'names2codes', 'taxon'):
        for a in DIAG[tipo]:
            print(f'  [{tipo}] {a}', file=saida)
    atuais = antigo.get('codigos', {})
    divergentes = [k for k, v in novo['codigos'].items() if k in atuais and atuais[k].get('eppo') != v.get('eppo')]
    if divergentes:
        print('  Códigos diferentes da tabela atual: ' + ', '.join(divergentes[:10]), file=saida)


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
    diagnostico(novo, antigo)
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
