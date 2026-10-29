#!/usr/bin/env python3
"""Obtém eventos da API de odds e cria uma agenda normalizada local.

Requer a variável de ambiente THE_ODDS_API_KEY e autorização do fornecedor para
qualquer publicação/redistribuição do resultado. Não guarda a chave.
Uso:
    python scripts/atualizar_agenda_api.py --output preditivo/data/agenda.json
Com odds, só se os termos da licença permitirem republicação:
    python scripts/atualizar_agenda_api.py --with-odds --authorized-republication
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone, date
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = 'https://api.the-odds-api.com/v4/sports'
LEAGUES = {
    'soccer_epl': ('football', 'Premier League (Inglaterra)'),
    'basketball_euroleague': ('basketball', 'EuroLeague'),
    'basketball_nba': ('nba', 'NBA'),
    'icehockey_nhl': ('nhl', 'NHL — hóquei no gelo'),
}
ALLOWED = {'football', 'basketball', 'nba', 'nhl', 'roller_hockey'}


def fetch_list(key, league, with_odds=False):
    endpoint = 'odds/' if with_odds else 'events/'
    query = {'apiKey': key}
    if with_odds:
        query.update(regions='eu,us', markets='h2h', oddsFormat='decimal')
    url = f'{ROOT}/{league}/{endpoint}?{urlencode(query)}'
    # A chave fica apenas no pedido de saída; nunca imprimir URL ou mensagens que a contenham.
    with urlopen(Request(url, headers={'User-Agent': 'MRS-PredictiveLab-Research/2.0'}), timeout=25) as resp:
        value = json.load(resp)
    if not isinstance(value, list):
        raise ValueError('Resposta inesperada: lista de eventos em falta')
    return value


def market_data(item):
    for book in item.get('bookmakers') or []:
        for market in book.get('markets') or []:
            if market.get('key') != 'h2h':
                continue
            prices = {}
            for out in market.get('outcomes') or []:
                try:
                    number = float(out.get('price'))
                except (ValueError, TypeError):
                    continue
                if number > 1 and number < 1001 and isinstance(out.get('name'), str):
                    prices[out['name']] = number
            if len(prices) in (2, 3):
                return {'market': 'h2h', 'bookmaker': book.get('title') or book.get('key') or 'Desconhecida',
                        'updated_at': book.get('last_update'), 'prices': prices}
    return None


def normalize(raw, key, include_odds):
    sport, league = LEAGUES[key]
    home, away, eid, instant = raw.get('home_team'), raw.get('away_team'), raw.get('id'), raw.get('commence_time')
    if not (isinstance(home, str) and isinstance(away, str) and eid and isinstance(instant, str)):
        return None
    return {'id': str(key) + ':' + str(eid), 'sport': sport, 'league': league,
            'date': instant, 'home': home, 'away': away,
            'status': 'Agendado · confirmar eventuais alterações',
            'source': 'The Odds API (feed licenciado)', 'source_url': 'https://the-odds-api.com/',
            'odds': market_data(raw) if include_odds else None, 'model': None}


def main():
    parser = argparse.ArgumentParser(description='Cria agenda com dados licenciados; nunca inclui previsões inventadas.')
    parser.add_argument('--output', default='preditivo/data/agenda.json')
    parser.add_argument('--with-odds', action='store_true', help='Lê odds do fornecedor (quota e termos aplicáveis)')
    parser.add_argument('--authorized-republication', action='store_true', help='Confirmo direitos de republicação de dados no site público')
    parser.add_argument('--keep-verified-roller', action='store_true', help='Preserva amostras verificadas manualmente ainda futuras do JSON existente')
    args = parser.parse_args()
    if not args.authorized_republication:
        parser.error('Confirma primeiro a licença de republicação e acrescenta --authorized-republication. Para uso privado, indica outro destino fora do GitHub.')
    key = os.environ.get('THE_ODDS_API_KEY')
    if not key:
        parser.error('Falta THE_ODDS_API_KEY na variável de ambiente. Não coloques a chave no código ou em HTML.')
    out = Path(args.output)
    events, errors = [], []
    if args.keep_verified_roller and out.exists():
        try:
            old = json.loads(out.read_text(encoding='utf-8'))
            events = [e for e in old.get('events', []) if e.get('sport') == 'roller_hockey' and e.get('date', '')[:10] >= date.today().isoformat()]
        except (OSError, ValueError, TypeError):
            pass
    for league in LEAGUES:
        try:
            response = fetch_list(key, league, args.with_odds)
            n = 0
            for raw in response:
                event = normalize(raw, league, args.with_odds)
                if event:
                    events.append(event)
                    n += 1
            print(league + ': ' + str(n) + ' eventos')
        except (HTTPError, URLError, OSError, ValueError) as e:
            # Não expor o URL, porque a chave está na query string.
            code = 'HTTP ' + str(e.code) if isinstance(e, HTTPError) else type(e).__name__
            print(league + ': indisponível (' + code + ')', file=sys.stderr)
            errors.append(league)
    payload = {'schema': 'mrs-predictive-events-v1',
               'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
               'updated_kind': 'API · confirme licença e limites de reutilização',
               'events': events}
    if not events:
        print('Sem eventos. Ficheiro existente não alterado.', file=sys.stderr)
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Gravados {len(events)} eventos em {out}. Modalidades sem eventos aparecerão vazias.')
    if errors:
        print('Alguns feeds não responderam ou não estão incluídos no plano: ' + ', '.join(errors), file=sys.stderr)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
