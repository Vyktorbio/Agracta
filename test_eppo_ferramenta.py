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


TAXONS = {
    'GLXMA': {'eppocode': 'GLXMA', 'prefname': 'Glycine max', 'is_active': True},
    'ZEAMX': {'eppocode': 'ZEAMX', 'prefname': 'Zea mays', 'is_active': True},
    'FRAAN': {'eppocode': 'FRAAN', 'prefname': 'Fragaria × ananassa', 'is_active': True},
    'PHAKPA': {'eppocode': 'PHAKPA', 'prefname': 'Phakopsora pachyrhizi', 'is_active': True},
    'OLDCOD': {'eppocode': 'OLDCOD', 'prefname': 'Nome antigo', 'is_active': False},
    'NOVOCD': {'eppocode': 'NOVOCD', 'prefname': 'Nome aceito', 'is_active': True},
}
NOMES = {'NOVOCD': [{'fullname': 'Nome aceito'}, {'fullname': 'Sinonimo antigus'}]}
SUGESTOES = {
    'Glycine max': {'Glycine max': 'GLXMA'},
    'Zea mays': {'Zea mays': 'GLXMA;ZEAMX'},          # 1º candidato errado, 2º certo
    'Fragaria x ananassa': {'Fragaria x ananassa': ['FRAAN']},
    'Phakopsora pachyrhizi': {'Phakopsora pachyrhizi': 'GLXMA'},  # sugere código de outra coisa
    'Sinonimo antigus': {'Sinonimo antigus': 'OLDCOD NOVOCD'},
    'Nada aqui': {'Nada aqui': '****NOT FOUND*****'},
}


def fake(url, token):
    ok(token == 'T', 'token repassado')
    if '/tools/names2codes' in url:
        nome = eppo.urllib.parse.parse_qs(eppo.urllib.parse.urlparse(url).query)['intext'][0]
        if nome == 'Rede cai':
            raise OSError('sem rede')
        return SUGESTOES.get(nome, {})
    cod = url.split('/taxon/')[1].split('?')[0].split('/')[0]
    if url.split('?')[0].endswith('/names'):
        return NOMES.get(cod, [])
    return TAXONS.get(cod, {})


def r(nome):
    return eppo.resolver(nome, 'T', get=fake, pausa=0)


ok(r('Glycine max')[0]['eppo'] == 'GLXMA', 'código conferido')
ok(r('Zea mays')[0]['eppo'] == 'ZEAMX', 'pula candidato que não confere')
ok(r('Fragaria x ananassa')[0]['eppo'] == 'FRAAN', 'sinal de híbrido × equivale a x')
res, motivo = r('Phakopsora pachyrhizi')
ok(res is None and 'nenhum código conferiu' in motivo, 'código de outro táxon é recusado')
res, _ = r('Sinonimo antigus')
ok(res['eppo'] == 'NOVOCD' and res['nomePreferido'] == 'Nome aceito', 'sinônimo aceito pelo nome registrado; inativo pulado')
ok(r('Nada aqui')[0] is None, 'não encontrado fica sem código')
ok(r('Rede cai')[1].startswith('consulta falhou'), 'falha de rede não inventa nada')
ok(r('Desconhecido')[1] == 'EPPO não devolveu código', 'resposta vazia')

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

print(f'Ferramenta EPPO: {N} verificações OK.')
