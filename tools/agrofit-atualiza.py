#!/usr/bin/env python3
"""Atualiza a cópia aberta do Agrofit, preservando-a se a fonte vier incompleta.

Não toca nos itens nem nos protocolos do usuário. O workflow abre uma PR;
a atualização do catálogo só chega ao aplicativo após revisão e publicação.
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent


def atualizar():
    names = ('agrofit.json', 'agrofit-culturas.json')
    with tempfile.TemporaryDirectory(prefix='agracta-agrofit-') as tmp:
        subprocess.run([sys.executable, str(ROOT / 'tools/agrofit-destila.py'), '--saida', tmp], check=True)
        antigos = [json.loads((ROOT / 'data' / name).read_text()) for name in names]
        novos = [json.loads((pathlib.Path(tmp) / name).read_text()) for name in names]
        if len(novos[0]['p']) < .8 * len(antigos[0]['p']):
            raise ValueError('O catálogo perdeu mais de 20% dos produtos. Revisar a fonte antes de substituir.')
        registros = {str(r[0]) for r in novos[0]['p']}
        if not registros or registros != set(novos[1]['p']):
            raise ValueError('Produtos e culturas não correspondem. Nada foi substituído.')
        def conteudo(x):
            return {k: v for k, v in x.items() if k != 'gerado'}
        if all(conteudo(a) == conteudo(n) for a, n in zip(antigos, novos)):
            print('O conteúdo do catálogo permanece igual.'); return
        sw = ROOT / 'sw.js'
        texto = sw.read_text()
        novo_sw, count = re.subn(r"(var CACHE = 'agracta-app-v)(\d+)(';)", lambda m: m[1] + str(int(m[2]) + 1) + m[3], texto, count=1)
        if count != 1:
            raise ValueError('Não foi possível atualizar a versão do cache.')
        for name in names:
            (ROOT / 'data' / name).write_bytes((pathlib.Path(tmp) / name).read_bytes())
        sw.write_text(novo_sw)
        print('Catálogo e cache preparados para revisão.')


if __name__ == '__main__':
    atualizar()
