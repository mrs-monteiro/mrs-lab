#!/usr/bin/env python3
"""MRS LAB — Inventário local, apenas de leitura, biblioteca padrão Python.
   Não consulta IPs externos, não executa comandos de shell nem altera serviços.
"""
import argparse
import datetime as dt
import json
import platform
import shutil
import socket
from pathlib import Path


def recolher():
    caminho = Path.home().anchor or '/'
    disco = shutil.disk_usage(caminho)
    return {
        'aviso': 'Rever antes de partilhar: contém nome da máquina.',
        'data_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'computador': socket.gethostname(),
        'sistema': platform.system(),
        'versao': platform.version(),
        'arquitetura': platform.machine(),
        'disco': {'raiz': caminho, 'total_gib': round(disco.total / 2**30, 2),
                  'livre_gib': round(disco.free / 2**30, 2)}
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destino', type=Path, help='Ficheiro JSON opcional (pasta existente)')
    args = parser.parse_args()
    resultado = json.dumps(recolher(), ensure_ascii=False, indent=2)
    if args.destino:
        if not args.destino.parent.is_dir():
            parser.error('A pasta de destino não existe.')
        args.destino.write_text(resultado + '\n', encoding='utf-8')
        print('Relatório criado:', args.destino)
    else:
        print(resultado)


if __name__ == '__main__':
    main()
