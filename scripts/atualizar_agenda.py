#!/usr/bin/env python3
"""MRS Predictive Lab V3: agenda multidesportiva API-Sports.

Chaves apenas em variáveis de ambiente. Não calcula probabilidades preditivas.
Odds opcionais, apenas quando o titular confirmar direito de publicação.
Preserva outras modalidades (ex. hóquei em patins) e dados antigos em falhas.
"""
from __future__ import annotations
import datetime as dt
import json
import os
import pathlib
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / 'preditivo' / 'data' / 'agenda.json'
KEY = os.getenv('APISPORTS_KEY', '').strip()
ODDS_KEY = os.getenv('ODDS_API_KEY', '').strip()
PUBLISH_ODDS = os.getenv('ODDS_PUBLISH_ENABLED', '').strip().lower() == 'true'
BASES = {
    'football': 'https://v3.football.api-sports.io/fixtures',
    'basketball': 'https://v1.basketball.api-sports.io/games',
    'nba': 'https://v2.nba.api-sports.io/games',
    'nhl': 'https://v1.hockey.api-sports.io/games',
}
# Calendários gratuitos observados: hoje e amanhã (2 pedidos por API).
DAYS = 2
LIMIT_PER_SOURCE = 1800
ODDS_SPORTS = (
    'soccer_portugal_primeira_liga', 'soccer_epl',
    'soccer_spain_la_liga', 'soccer_italy_serie_a',
    'soccer_germany_bundesliga', 'soccer_uefa_champs_league',
    'basketball_nba', 'icehockey_nhl',
)


def clip(value, size=160):
    return str(value if value is not None else '').strip()[:size]


def api_get(base, params, header):
    url = base + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=header)
    with urllib.request.urlopen(req, timeout=24) as response:
        body = json.loads(response.read(4_000_000).decode('utf-8'))
    return body


def sports_get(source, date):
    data = api_get(BASES[source], {'date': date}, {'x-apisports-key': KEY, 'Accept': 'application/json', 'User-Agent': 'MRS-Predictive-Lab/3.0'})
    if not isinstance(data, dict) or data.get('errors'):
        raise RuntimeError('API-Sports: ' + clip(data.get('errors') if isinstance(data,dict) else 'resposta inválida'))
    if not isinstance(data.get('response'), list):
        raise RuntimeError('API-Sports: response não é uma lista')
    return data['response']


def phase(status, raw_short=''):
    short = clip(raw_short or (status.get('short') if isinstance(status, dict) else ''), 30).upper()
    long = clip(status.get('long') if isinstance(status, dict) else status, 90).lower()
    if short in {'FT','AET','PEN','AOT','AWD','3'} or any(x in long for x in ('finished','full time','after extra time','final')):
        return 'finished'
    if short in {'1H','2H','HT','ET','BT','Q1','Q2','Q3','Q4','OT','LIVE','2','P1','P2','P3'} or any(x in long for x in ('in play','in progress','halftime','quarter','live')):
        return 'live'
    if short in {'CANC','PST','POST','SUSP','ABD','4'} or any(x in long for x in ('postpon','cancel','suspend','abandon')):
        return 'postponed'
    return 'scheduled'


def football(item):
    f,teams,league = (item.get('fixture') or {}), (item.get('teams') or {}), (item.get('league') or {})
    home,away = (teams.get('home') or {}), (teams.get('away') or {})
    if not f.get('id') or not home.get('name') or not away.get('name'):
        return None
    stat=f.get('status') or {}
    return {'id': 'api-football-'+str(f['id']), 'sport':'football', 'league':clip(league.get('name')),
            'country':clip(league.get('country'),75), 'date':clip(f.get('date'),40),
            'home':clip(home.get('name')), 'away':clip(away.get('name')),
            'status':clip(stat.get('long') or stat.get('short') or 'Agendado'), 'phase':phase(stat),
            'source':'API-Sports / API-Football', 'source_url':'https://www.api-football.com/',
            'odds':None, 'model':None}


def other(item,source):
    teams = item.get('teams') or {}
    if source=='nba':
        home=teams.get('home') or {}
        away=teams.get('visitors') or teams.get('away') or {}
        lg='NBA'
        date=(item.get('date') or {})
        date=date.get('start') if isinstance(date,dict) else date
        status=item.get('status') or {}
    else:
        home=teams.get('home') or {}
        away=teams.get('away') or {}
        league=item.get('league') or {}
        lg=clip(league.get('name') if isinstance(league,dict) else league)
        date=item.get('date')
        if isinstance(date,dict):
            date=date.get('start') or date.get('date')
        status=item.get('status') or {}
    if not item.get('id') or not home.get('name') or not away.get('name'):
        return None
    # É o mesmo desporto: a NBA aparece como competição de Basquetebol, nunca como modalidade.
    if source=='basketball' and lg.casefold()=='nba':
        return None
    if source=='nhl' and 'nhl' not in lg.casefold():
        return None
    original_code=clip(status.get('short') if isinstance(status,dict) else '',15)
    if source=='nba' and original_code in ('1','2','3','4'):
        text={'1':'Agendado','2':'Em direto','3':'Terminado','4':'Adiado'}[original_code]
    else:
        text=clip(status.get('long') or status.get('short') if isinstance(status,dict) else status,90) or 'Agendado'
    return {'id':'api-'+source+'-'+str(item['id']), 'sport':'basketball' if source=='nba' else source,
            'league':lg or 'Competição não identificada', 'date':clip(date,40),
            'home':clip(home.get('name')), 'away':clip(away.get('name')),
            'status':text, 'phase':phase(status),
            'source':'API-Sports / '+ ('API-NBA' if source=='nba' else 'API-'+source.upper()),
            'source_url':'https://api-sports.io/', 'odds':None, 'model':None}


def normalize_name(s):
    s=unicodedata.normalize('NFKD', str(s or ''))
    s=''.join(c for c in s if not unicodedata.combining(c)).casefold()
    return re.sub(r'[^a-z0-9]+',' ',s).strip()


def update_odds(events):
    if not (ODDS_KEY and PUBLISH_ODDS):
        print('Odds: desativadas (exigem ODDS_API_KEY e ODDS_PUBLISH_ENABLED=true, após confirmar licença).')
        return 0
    count=0
    # Consulta limitada a oito competições, região europeia e mercado h2h; não excede ~240 créditos/mês.
    for sport_key in ODDS_SPORTS:
        try:
            payload=api_get('https://api.the-odds-api.com/v4/sports/'+sport_key+'/odds/',
                            {'apiKey':ODDS_KEY,'regions':'eu','markets':'h2h','oddsFormat':'decimal'},
                            {'User-Agent':'MRS-Predictive-Lab/3.0','Accept':'application/json'})
            if not isinstance(payload,list):
                raise ValueError('resposta inesperada')
            for raw in payload:
                when=clip(raw.get('commence_time'),40)
                names=(normalize_name(raw.get('home_team')),normalize_name(raw.get('away_team')))
                if not all(names):
                    continue
                valid=[]
                for ev in events:
                    if ev['sport'] not in ('football','basketball','nhl') or ev['phase'] != 'scheduled':
                        continue
                    if (normalize_name(ev['home']),normalize_name(ev['away'])) != names:
                        continue
                    # Jogo deve ter início próximo; evita associar confrontos repetidos em outros dias.
                    try:
                        a=dt.datetime.fromisoformat(str(ev['date']).replace('Z','+00:00'))
                        b=dt.datetime.fromisoformat(when.replace('Z','+00:00'))
                        if a.tzinfo is None: a=a.replace(tzinfo=dt.timezone.utc)
                        if abs((a-b).total_seconds()) > 6*3600: continue
                    except (ValueError,TypeError):
                        continue
                    valid.append(ev)
                if len(valid)!=1: continue
                book=next((b for b in raw.get('bookmakers',[]) if any(m.get('key')=='h2h' for m in b.get('markets',[]))),None)
                if not book: continue
                market=next(m for m in book['markets'] if m.get('key')=='h2h')
                outcomes=market.get('outcomes') or []
                expected=3 if valid[0]['sport']=='football' else 2
                if len(outcomes)!=expected: continue
                odds={}
                for item in outcomes:
                    n=normalize_name(item.get('name'))
                    key=('1' if n==names[0] else '2' if n==names[1] else 'X' if n=='draw' else None)
                    try: price=float(item.get('price'))
                    except (TypeError,ValueError):continue
                    if key and 1 < price < 1001:odds[key]=price
                if len(odds)!=expected:continue
                valid[0]['odds']={ 'prices':odds, 'bookmaker':clip(book.get('title') or book.get('key')),
                                  'market':'h2h — '+('1X2' if expected==3 else 'duas vias'),
                                  'updated_at':clip(market.get('last_update') or book.get('last_update'),40),
                                  'source':'The Odds API', 'source_url':'https://the-odds-api.com/'}
                count+=1
        except (urllib.error.URLError,TimeoutError,ValueError,TypeError) as err:
            print('AVISO Odds',sport_key,clip(err,100))
    return count


def main():
    if not KEY:
        print('ERRO: segredo APISPORTS_KEY em falta', file=sys.stderr)
        return 1
    if not TARGET.exists():
        print('ERRO: ficheiro de destino inexistente', file=sys.stderr)
        return 1
    previous=json.loads(TARGET.read_text(encoding='utf-8'))
    old=previous.get('events') if isinstance(previous.get('events'),list) else []
    today=dt.datetime.now(dt.timezone.utc).date()
    merged={}
    previous_by_id={e.get('id'):e for e in old if isinstance(e,dict)}
    successful=[]
    for source in BASES:
        found=[]
        worked=0
        for day in range(DAYS):
            daystr=(today+dt.timedelta(days=day)).isoformat()
            try:
                raw=sports_get(source,daystr)
                worked+=1
                for item in raw:
                    ev=football(item) if source=='football' else other(item,source)
                    if ev:found.append(ev)
                print(source,daystr,'recebidos:',len(raw),'válidos:',len(found))
            except (urllib.error.URLError,TimeoutError,ValueError,RuntimeError,TypeError,KeyError) as err:
                print('AVISO',source,daystr,clip(err,180))
                # Nunca deitar fora dias que foram recolhidos com sucesso.
        if worked:
            successful.append(source)
            for e in found[:LIMIT_PER_SOURCE]:
                before=previous_by_id.get(e['id'])
                if (before and before.get('model') and before.get('home')==e['home']
                    and before.get('away')==e['away'] and before.get('date')==e['date']):
                    e['model']=before['model']
                merged[e['id']]=e
        else:
            # Conserva a modalidade anterior quando ambas as datas falham.
            for e in old:
                if (source=='nba' and e.get('sport')=='nba') or (source!='nba' and e.get('sport')==source):
                    copied=dict(e)
                    if copied.get('sport')=='nba':copied['sport']='basketball';copied['league']='NBA'
                    merged[copied['id']]=copied
    # Preserve federated roller hockey and any non API-Sports sports.
    for e in old:
        if e.get('sport')=='roller_hockey':merged[e['id']]=e
    if not successful:
        print('ERRO: todas as fontes API-Sports indisponíveis, ficheiro inalterado',file=sys.stderr)
        return 2
    events=list(merged.values())[:3000]
    for e in events:
        if 'phase' not in e:
            e['phase']=phase(e.get('status'))
    n=update_odds(events)
    events.sort(key=lambda e:(e.get('date') or '',e.get('sport') or '',e.get('league') or ''))
    data={'schema':'mrs-predictive-events-v1','generated_at':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
          'updated_kind':'API-Sports; modalidades unificadas, dados com origem; odds apenas se ativadas e autorizadas',
          'events':events}
    TARGET.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    bysport={x:sum(e.get('sport')==x for e in events) for x in ('football','basketball','nhl','roller_hockey')}
    print('SUCESSO:',len(events),'jogos',bysport,'fontes:',successful,'odds:',n)
    return 0

if __name__=='__main__':
    raise SystemExit(main())
