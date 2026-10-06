#!/usr/bin/env python3
"""Smoke test opcional, somente leitura; usa provedores reais, sem credenciais."""
import argparse
import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import satelites_backend as s


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bbox', default='-47.65,-22.7,-47.4,-22.45')
    args = parser.parse_args()
    bbox = s.bbox_param({'bbox':args.bbox})
    q = {'bbox':args.bbox, 'width':256}
    failures = []
    def check(name, fn):
        try:
            print(name + ': ' + json.dumps(fn(), ensure_ascii=False), flush=True)
        except Exception as e:
            failures.append(name)
            print(name + ': FALHA · ' + str(e), flush=True)
    def landsat():
        catalog = s.landsat_dates(q)
        scene = next((r for r in catalog['scenes'] if r['cloud'] <= 25), None)
        scene = scene or (catalog['scenes'][0] if catalog['scenes'] else None)
        if not scene:
            return {'scenes':0, 'source':catalog['source']}
        query = dict(q,item=scene['id'])
        image = s.landsat_image(query)
        point = s.landsat_point({'item':scene['id'],'lat':(bbox[1]+bbox[3])/2,'lng':(bbox[0]+bbox[2])/2})
        return {'scenes':len(catalog['scenes']),'scene':scene['id'],'date':scene['date'],
                'pngBytes':len(image),'centerTemperatureC':point['temperatureC'],'reason':point['reason']}
    def smap():
        catalog = s.smap_catalog()
        images = {}
        for kind,name in s.SMAP_LAYERS.items():
            day = catalog['layers'][name]['latest']
            image = s.smap_image(dict(q,date=day,camada=kind))
            images[kind] = {'date':day,'pngBytes':len(image)}
        return images
    check('Landsat',landsat)
    check('SMAP',smap)
    for hours in ('24','48','168'):
        check('FIRMS ' + hours + 'h',lambda h=hours:s.firms(dict(q,horas=h))['meta'])
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
