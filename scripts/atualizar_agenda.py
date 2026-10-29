#!/usr/bin/env python3
"""Atualiza o feed público do Predictive Lab com API-Sports, sem publicar credenciais.

Evita inventar previsões, odds ou jogos. Se uma chamada falhar, conserva os dados
anteriores dessa modalidade. Mantém o hóquei em patins (fonte separada).
"""
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "preditivo" / "data" / "agenda.json"
API_KEY = os.environ.get("APISPORTS_KEY", "").strip()
BASES = {
    "football": "https://v3.football.api-sports.io/fixtures",
    "basketball": "https://v1.basketball.api-sports.io/games",
    "nba": "https://v2.nba.api-sports.io/games",
    "nhl": "https://v1.hockey.api-sports.io/games",
}
SPORTS = tuple(BASES)
MAX_DAYS = 3  # 3 dias * 4 APIs = 12 pedidos no máximo por execução
LIMIT_SPORT = 250


def name(value):
    return str(value or "").strip()[:150]


def iso(value):
    return str(value or "")[:32]


def get_json(url, params):
    uri = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(uri, headers={"x-apisports-key": API_KEY, "Accept": "application/json", "User-Agent": "MRS-Predictive-Lab/1.0"})
    with urllib.request.urlopen(req, timeout=22) as r:
        if r.status != 200:
            raise RuntimeError("HTTP " + str(r.status))
        body = json.loads(r.read(3_000_000).decode("utf-8"))
    if body.get("errors"):
        raise RuntimeError("A API devolveu erros: " + str(body["errors"])[:200])
    response = body.get("response")
    if not isinstance(response, list):
        raise RuntimeError("Resposta da API com formato inesperado")
    return response


def football(row):
    fixture = row.get("fixture") or {}
    teams = row.get("teams") or {}
    league = row.get("league") or {}
    home, away = teams.get("home") or {}, teams.get("away") or {}
    if not fixture.get("id") or not home.get("name") or not away.get("name"):
        return None
    return dict(id="api-football-" + str(fixture["id"]), sport="football",
                league=name(league.get("name")), date=iso(fixture.get("date")),
                home=name(home.get("name")), away=name(away.get("name")),
                source="API-Sports / API-Football", source_url="https://www.api-football.com/",
                status=name((fixture.get("status") or {}).get("long") or "Por confirmar"),
                odds=None, model=None)


def other(row, sport):
    league = row.get("league") or {}
    teams = row.get("teams") or {}
    home, away = teams.get("home") or {}, teams.get("away") or {}
    date = row.get("date")
    if isinstance(date, dict):
        date = date.get("start") or date.get("date")
    if sport == "nba" and not isinstance(date, str):
        date = (row.get("date") or {}).get("start") if isinstance(row.get("date"), dict) else date
    league_name = name(league.get("name") if isinstance(league, dict) else league)
    # Evitar exibir basquetebol geral como NBA e hóquei no gelo genérico como NHL.
    if sport == "basketball" and "nba" in league_name.lower():
        return None
    if sport == "nhl" and "nhl" not in league_name.lower():
        return None
    if sport == "nba":
        league_name = league_name or "NBA"
    if not row.get("id") or not home.get("name") or not away.get("name"):
        return None
    stat = row.get("status") or {}
    status = name(stat.get("long") or stat.get("short") if isinstance(stat, dict) else stat)
    return dict(id="api-"+sport+"-"+str(row["id"]),sport=sport,
                league=league_name or "Competição não identificada",date=iso(date),
                home=name(home.get("name")),away=name(away.get("name")),
                source="API-Sports / API-"+sport.upper(),source_url="https://api-sports.io/",
                status=status or "Por confirmar",odds=None,model=None)


def main():
    if not API_KEY:
        print("ERRO: APISPORTS_KEY não está definido (verifica o GitHub Secret).", file=sys.stderr)
        return 1
    if not TARGET.exists():
        print("ERRO: não existe preditivo/data/agenda.json", file=sys.stderr)
        return 1
    existing = json.loads(TARGET.read_text(encoding="utf-8"))
    old = existing.get("events", [])
    today = dt.datetime.now(dt.timezone.utc).date()
    new = []
    ok_sports = set()
    for sport, base in BASES.items():
        fetched = []
        complete = True
        for n in range(MAX_DAYS):
            date = (today + dt.timedelta(days=n)).isoformat()
            try:
                response = get_json(base, {"date": date})
                for item in response:
                    ev = football(item) if sport == "football" else other(item, sport)
                    if ev:
                        fetched.append(ev)
                print(sport, date, "encontros da API:", len(response))
            except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError, KeyError, TypeError) as exc:
                print("AVISO:", sport, date, "não foi possível atualizar:", str(exc)[:180])
                complete = False
                break
        if complete:
            ok_sports.add(sport)
            unique = {e["id"]: e for e in fetched}
            new.extend(list(unique.values())[:LIMIT_SPORT])
            print(sport, "atualizado, total:", len(unique))
        else:
            new.extend(e for e in old if e.get("sport") == sport)
    # Preservar modalidades que não vêm da API-Sports, incluindo hóquei em patins.
    new.extend(e for e in old if e.get("sport") not in SPORTS)
    # Se absolutamente todas as chamadas falharem, não alterar o ficheiro.
    if not ok_sports:
        print("ERRO: nenhuma API respondeu corretamente; o ficheiro existente foi preservado.", file=sys.stderr)
        return 2
    events = list({str(e["id"]):e for e in new if e.get("id")}.values())[:3000]
    events.sort(key=lambda e: (str(e.get("date", "")), str(e.get("sport", "")), str(e.get("id", ""))))
    payload = {"schema": "mrs-predictive-events-v1",
               "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
               "updated_kind": "API-Sports (jogos em janela de 3 dias) + fontes anteriores de outras modalidades; sem odds nem previsões",
               "events": events}
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Agenda gravada:", len(events), "jogos. Modalidades atualizadas:", ", ".join(sorted(ok_sports)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
