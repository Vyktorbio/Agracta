"""tools/eppo-atualiza.py: só entra código que a EPPO confirma para o nome exato.

Roda sem rede: a EPPO é substituída por respostas montadas aqui.
"""
import importlib.util
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('eppo', RAIZ / 'tools/eppo-atualiza.py')
eppo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eppo)

N = 0


def ok(c, m):
    global N
    assert c, m
    N += 1


# Respostas no formato da API v2 (https://api.eppo.int/gd/v2/eppo_api_gd_v2.yml):
# name2codes -> [{eppocode, preferred}]; overview -> {prefname, is_active};
# names -> [{fullname, lang_iso, preferred}].
TAXONS = {
    'GLXMA': {'eppocode': 'GLXMA', 'prefname': 'Glycine max', 'is_active': True},
    'ZEAMX': {'eppocode': 'ZEAMX', 'prefname': 'Zea mays', 'is_active': True},
    'FRAAN': {'eppocode': 'FRAAN', 'prefname': 'Fragaria \u00d7 ananassa', 'is_active': True},
    'PHAKPA': {'eppocode': 'PHAKPA', 'prefname': 'Phakopsora pachyrhizi', 'is_active': True},
    'OLDCOD': {'eppocode': 'OLDCOD', 'prefname': 'Nome antigo', 'is_active': False},
    'NOVOCD': {'eppocode': 'NOVOCD', 'prefname': 'Nome aceito', 'is_active': True},
    'HOMOAG': {'eppocode': 'HOMOAG', 'prefname': 'Homonimus', 'is_active': True},
    'HOMOBG': {'eppocode': 'HOMOBG', 'prefname': 'Homonimus', 'is_active': True},
}
NOMES = {'NOVOCD': [{'fullname': 'Nome aceito', 'lang_iso': 'la', 'preferred': True},
                    {'fullname': 'Sinonimo antigus', 'lang_iso': 'la', 'preferred': False}],
         'GLXMA': [{'fullname': 'soja', 'lang_iso': 'pt', 'preferred': False}]}
SUGESTOES = {
    'Glycine max': [{'eppocode': 'GLXMA', 'preferred': True}],
    'Zea mays': [{'eppocode': 'GLXMA', 'preferred': False}, {'eppocode': 'ZEAMX', 'preferred': True}],
    'Fragaria x ananassa': [{'eppocode': 'FRAAN', 'preferred': True}],
    'Phakopsora pachyrhizi': [{'eppocode': 'GLXMA', 'preferred': True}],   # código de outra coisa
    'Sinonimo antigus': [{'eppocode': 'OLDCOD', 'preferred': False}, {'eppocode': 'NOVOCD', 'preferred': False}],
    'Homonimus': [{'eppocode': 'HOMOAG', 'preferred': True}, {'eppocode': 'HOMOBG', 'preferred': True}],
    'soja': [{'eppocode': 'GLXMA', 'preferred': False}],                   # nome em português
    'Nada aqui': [],
    'Formato estranho': {'erro': 'inesperado'},
}


def fake(url, token):
    ok(token in ('T', 'CHAVE-SECRETA'), 'chave repassada')
    ok('CHAVE-SECRETA' not in url, 'chave nunca na URL')
    ok(url.startswith('https://api.eppo.int/gd/v2/'), 'API v2')
    if '/tools/name2codes' in url:
        qs = eppo.urllib.parse.parse_qs(eppo.urllib.parse.urlparse(url).query)
        ok(qs['onlyPreferred'] == ['false'], 'procura também sinônimos')
        nome = qs['name'][0]
        if nome == 'Rede cai':
            raise OSError('sem rede')
        return SUGESTOES.get(nome, [])
    cod = url.split('/taxons/taxon/')[1].split('/')[0]
    if url.endswith('/names'):
        return NOMES.get(cod, [])
    return TAXONS.get(cod, {})


def r(nome):
    return eppo.resolver(nome, 'CHAVE-SECRETA', get=fake, pausa=0)


ok(r('Glycine max')[0] == {'eppo': 'GLXMA', 'nomePreferido': 'Glycine max'}, 'código conferido')
ok(r('Zea mays')[0]['eppo'] == 'ZEAMX', 'pula candidato que não confere')
ok(r('Fragaria x ananassa')[0]['eppo'] == 'FRAAN', 'sinal de híbrido × equivale a x')
res, motivo = r('Phakopsora pachyrhizi')
ok(res is None and 'nenhum código conferiu' in motivo, 'código de outro táxon é recusado')
res, _ = r('Sinonimo antigus')
ok(res == {'eppo': 'NOVOCD', 'nomePreferido': 'Nome aceito'}, 'sinônimo latino aceito; código inativo pulado')
res, motivo = r('Homonimus')
ok(res is None and motivo.startswith('ambíguo') and 'HOMOAG' in motivo, 'homônimo fica ambíguo')
ok(r('soja')[0] is None, 'nome em português não conta: só latim')
ok(r('Nada aqui')[1] == 'EPPO não devolveu código', 'lista vazia')
ok(r('Formato estranho')[1] == 'EPPO não devolveu código', 'formato inesperado não inventa nada')
ok(r('Rede cai')[1].startswith('consulta falhou'), 'falha de rede não inventa nada')

ok(eppo.nomes_do_catalogo("['Ferrugem','Phakopsora pachyrhizi'],\n['Buva','Conyza bonariensis']") ==
   ['Conyza bonariensis', 'Phakopsora pachyrhizi'], 'lê os binômios do catálogo')
catalogo = eppo.nomes_do_catalogo((RAIZ / 'alvos-catalogo.js').read_text())
ok(len(catalogo) > 100 and 'Euschistus heros' in catalogo, 'catálogo real tem os alvos')

g = eppo.gerar('T', get=fake, pausa=0, hoje='2026-09-24')
ok(g['codigos']['Glycine max']['eppo'] == 'GLXMA' and g['culturas']['Soja'] == 'Glycine max', 'tabela gerada')
ok(all(set(x) == {'nome', 'motivo'} for x in g['naoResolvidos']), 'não resolvidos com motivo')
ok(len(g['codigos']) + len(g['naoResolvidos']) == len(set(catalogo) | set(g['culturas'].values())), 'todo nome aparece uma vez')

atual = __import__("json").loads((RAIZ / 'data/eppo.json').read_text())
ok(atual['schema'] == 1 and isinstance(atual['codigos'], dict) and atual['culturas']['Soja'] == 'Glycine max', 'data/eppo.json no formato')
ok(all(eppo.CODIGO.fullmatch(v['eppo']) for v in atual['codigos'].values()), 'todo código na tabela tem forma de código')

# --- modo --xml: o arquivo oficial fullcodes.xml -------------------------------
import tempfile
XML = """<?xml version="1.0" encoding="utf-8"?>
<codes version="1.0" dateexport="2026-09-24T03:31:47+02:00">
 <code id="1" creation="1996-10-28" type="PFL" isactive="true"><eppocode>GLXMA</eppocode><names>
  <name id="1" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Glycine max</fullname><lang>la</lang></name>
  <name id="2" creation="2016-07-24" ispreferred="false" isactive="true"><fullname>soja</fullname><lang>pt</lang></name></names></code>
 <code id="2" creation="1996-10-28" type="PFL" isactive="true"><eppocode>ERIBO</eppocode><names>
  <name id="3" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Erigeron bonariensis</fullname><lang>la</lang></name>
  <name id="4" creation="1996-10-28" ispreferred="false" isactive="true"><fullname>Conyza bonariensis</fullname><lang>la</lang></name></names></code>
 <code id="3" creation="1996-10-28" type="GAF" isactive="true"><eppocode>COLLGL</eppocode><names>
  <name id="5" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Colletotrichum sensu lato</fullname><lang>la</lang></name>
  <name id="6" creation="1996-10-28" ispreferred="false" isactive="false"><fullname>Nome desativado</fullname><lang>la</lang></name></names></code>
 <code id="4" creation="1996-10-28" type="GAI" isactive="false"><eppocode>VELHOX</eppocode><names>
  <name id="7" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Codigo desativado</fullname><lang>la</lang></name></names></code>
 <code id="5" creation="1996-10-28" type="GAI" isactive="true"><eppocode>1HOMOG</eppocode><names>
  <name id="8" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Homonimus</fullname><lang>la</lang></name></names></code>
 <code id="6" creation="1996-10-28" type="PFL" isactive="true"><eppocode>1HOMPG</eppocode><names>
  <name id="9" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Homonimus</fullname><lang>la</lang></name></names></code>
 <code id="7" creation="1996-10-28" type="PFL" isactive="true"><eppocode>SINPRF</eppocode><names>
  <name id="10" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Duplo nomen</fullname><lang>la</lang></name></names></code>
 <code id="8" creation="1996-10-28" type="PFL" isactive="true"><eppocode>SINSIN</eppocode><names>
  <name id="11" creation="1996-10-28" ispreferred="true" isactive="true"><fullname>Outro nomen</fullname><lang>la</lang></name>
  <name id="12" creation="1996-10-28" ispreferred="false" isactive="true"><fullname>Duplo nomen</fullname><lang>la</lang></name></names></code>
</codes>"""
with tempfile.NamedTemporaryFile('w', suffix='.xml', delete=False, encoding='utf-8') as f:
    f.write(XML)
idx, exp = eppo.indice_xml(f.name)
x = lambda nome: eppo.resolver_xml(nome, idx)
ok(exp == '2026-09-24T03:31:47+02:00', 'data de exportação lida')
ok(x('Glycine max')[0] == {'eppo': 'GLXMA', 'nomePreferido': 'Glycine max'}, 'nome preferido')
ok(x('glycine  MAX')[0]['eppo'] == 'GLXMA', 'caixa e espaço ignorados')
ok(x('soja')[0] is None, 'nome comum em português não conta: só latim')
ok(x('Conyza bonariensis')[0] == {'eppo': 'ERIBO', 'nomePreferido': 'Erigeron bonariensis'}, 'sinônimo ativo leva ao nome atual')
ok(x('Nome desativado')[0] is None, 'nome desativado pela EPPO não vale')
ok(x('Codigo desativado')[0] is None, 'código desativado não vale')
r, m = x('Homonimus')
ok(r is None and m.startswith('ambíguo') and '1HOMOG' in m and '1HOMPG' in m, 'homônimo fica ambíguo')
ok(x('Duplo nomen')[0]['eppo'] == 'SINPRF', 'preferido num código e sinônimo noutro: vale o preferido')
import os
os.environ.pop('EPPO_TOKEN', None)
ok(eppo.main(['--xml']) == 2, '--xml sem caminho e sem token: para sem mexer em nada')

# --- diagnóstico: diz por que falhou, sem vazar o token -----------------------
import io
eppo.DIAG = {'names2codes': [], 'taxon': [], 'erros': []}
class ErroHTTP(Exception):
    code = 401
    def read(self):
        return b'{"message":"token SEGREDO-XYZ invalido"}'
def cai(url, token):
    raise ErroHTTP()
res, motivo = eppo.resolver('Glycine max', 'SEGREDO-XYZ', get=cai, pausa=0)
ok(motivo == 'consulta falhou: ErroHTTP 401', 'código HTTP no motivo')
eppo.resolver('Glycine max', 'T', get=fake, pausa=0)
buf = io.StringIO()
eppo.diagnostico({'codigos': {}, 'naoResolvidos': [{'nome': 'a', 'motivo': 'consulta falhou: ErroHTTP 401'}]},
                 {'codigos': {'x': {'eppo': 'GLXMA'}}}, buf)
out = buf.getvalue()
ok('Resolvidos: 0 (tabela atual: 1)' in out and 'consulta falhou' in out, 'resumo por motivo')
ok('ErroHTTP 401' in out and '[names2codes]' in out and 'GLXMA' in out, 'amostras de erro e de resposta')
ok('SEGREDO-XYZ' not in out and 'token *** invalido' in out, 'o token nunca aparece no log')

# --- só mudança de conteúdo vira PR ---------------------------------------------
base = {'fonte': 'arquivo', 'gerado': '2026-09-24', 'culturas': {'Soja': 'Glycine max'},
        'codigos': {'Glycine max': {'eppo': 'GLXMA', 'nomePreferido': 'Glycine max'}},
        'naoResolvidos': [{'nome': 'X y', 'motivo': 'nome não consta'}]}
cosmetico = dict(base, fonte='API', gerado='2026-09-25', naoResolvidos=[{'nome': 'X y', 'motivo': 'EPPO não devolveu código'}])
ok(eppo.substancia(base) == eppo.substancia(cosmetico), 'fonte, data e redação do motivo não contam')
ok(eppo.substancia(base) != eppo.substancia(dict(base, codigos={'Glycine max': {'eppo': 'OUTRO'}})), 'código diferente conta')
ok(eppo.substancia(base) != eppo.substancia(dict(base, naoResolvidos=[])), 'nome que passou a resolver conta')
ok(eppo.substancia(base) != eppo.substancia(dict(base, culturas={})), 'cultura conta')

print(f'Ferramenta EPPO: {N} verificações OK.')
