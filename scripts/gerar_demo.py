#!/usr/bin/env python3
"""Cria um exemplo 100% sintético, reproduzível, com avaliação cronológica.
Não lê datasets externos nem envia dados para servidores. Python 3.10+, numpy, scikit-learn.
"""
from pathlib import Path
import json
from collections import defaultdict, deque
from datetime import date, timedelta
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

SEED=20261029
rng=np.random.default_rng(SEED)
TEAMS=["Horizonte FC","Vale Verde","Atlântico Azul","Serra Alta","Estrela do Norte","Aurora United","Ribeira FC","Pinhal Atlético"]
N=len(TEAMS)
strength=np.array([.48,.20,.12,.02,-.04,-.13,-.22,-.43])
ELOS={t:1500. for t in TEAMS}
hist={t:deque(maxlen=5) for t in TEAMS}
all_games=[]
labels=['1','X','2']

def p_elo(diff):
    ph=1/(1+10**(-(diff+75)/400))
    pd=max(.12, min(.30, .27*np.exp(-abs(diff)/390)))
    return [float(ph*(1-pd)),float(pd),float((1-ph)*(1-pd))]

def form(team):
    h=list(hist[team]);
    return (sum(v[0] for v in h)/len(h)/3 if h else 0.5, sum(v[1] for v in h)/len(h) if h else 1.2, sum(v[2] for v in h)/len(h) if h else 1.2, len(h))

idx=0
for season in range(2020,2026):
    pairs=[(a,b) for a in range(N) for b in range(N) if a!=b]
    rng.shuffle(pairs)
    start=date(season,8,15)
    for k,(a,b) in enumerate(pairs):
        home,away=TEAMS[a],TEAMS[b]
        fh,gh,ah,nh=form(home);fa,ga,aa,na=form(away)
        diff=ELOS[home]-ELOS[away]
        features=[diff,fh-fa,gh-ga,ah-aa,nh,na]
        elo_probs=p_elo(diff)
        # Resultados gerados com forças fictícias; nenhum resultado real.
        drift=rng.normal(0,.035,size=N)
        lambda_h=np.exp(.18+.22+(strength[a]+drift[a])-(strength[b]+drift[b])*.66)
        lambda_a=np.exp(.16+(strength[b]+drift[b])-(strength[a]+drift[a])*.66)
        hg=int(rng.poisson(lambda_h));ag=int(rng.poisson(lambda_a))
        target=0 if hg>ag else 1 if hg==ag else 2
        score_h=1 if target==0 else .5 if target==1 else 0
        score_a=1-score_h
        ELOS[home]+=24*(score_h-1/(1+10**(-(diff+75)/400)))
        ELOS[away]+=24*(score_a-(1-1/(1+10**(-(diff+75)/400))))
        pts_h=3 if target==0 else 1 if target==1 else 0
        pts_a=3 if target==2 else 1 if target==1 else 0
        hist[home].append((pts_h,hg,ag)); hist[away].append((pts_a,ag,hg))
        game_date=(start+timedelta(days=int(k*4.8))).isoformat()
        all_games.append({'id':idx,'date':game_date,'season':season,'home':home,'away':away,'score':[hg,ag],'actual':target,'features':[round(x,4) for x in features],'elo':elo_probs})
        idx+=1

# Treino 2020–2023 (224 jogos); teste 2024–2025 (112 jogos): sem mistura temporal.
train=[g for g in all_games if g['season']<=2023]
test=[g for g in all_games if g['season']>=2024]
X_train=np.array([g['features'] for g in train]);y_train=np.array([g['actual'] for g in train])
X_test=np.array([g['features'] for g in test]);y_test=np.array([g['actual'] for g in test])
models={
 'logistic':make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000,random_state=SEED)),
 'forest':RandomForestClassifier(n_estimators=240,min_samples_leaf=6,max_depth=7,random_state=SEED,n_jobs=1)
}
for m in models.values():m.fit(X_train,y_train)
train_freq=np.bincount(y_train,minlength=3).astype(float);train_freq/=train_freq.sum()

def metrics(rows,key):
    actual=np.array([r['actual'] for r in rows],dtype=int)
    probs=np.array([r['pred'][key] for r in rows],dtype=float)
    predicted=np.argmax(probs,axis=1)
    n=len(rows)
    accuracy=float(np.mean(predicted==actual))
    loss=float(np.mean(-np.log(np.clip(probs[np.arange(n),actual],1e-15,1))))
    onehot=np.eye(3)[actual]
    brier=float(np.mean(np.sum((probs-onehot)**2,axis=1)))
    cm=[[int(np.sum((actual==i)&(predicted==j))) for j in range(3)] for i in range(3)]
    calibration=[]
    confidence=probs.max(axis=1)
    correct=(actual==predicted)
    for low in np.arange(0,1,.2):
        mask=(confidence>=low)&(confidence<(low+.2) if low<.8 else confidence<=1.)
        calibration.append({'bin':f'{int(low*100)}–{int((low+.2)*100)}%', 'n':int(mask.sum()), 'confidence':float(confidence[mask].mean()) if mask.any() else None,'observed':float(correct[mask].mean()) if mask.any() else None})
    return {'accuracy':round(accuracy,4),'logloss':round(loss,4),'brier':round(brier,4),'confusion':cm,'calibration':calibration,'n':n}

for i,g in enumerate(test):
    raw=np.array(g['features']).reshape(1,-1)
    g['pred']={'frequency':[float(v) for v in train_freq],'elo':g['elo']}
    for key,model in models.items():
        predicted=model.predict_proba(raw)[0]
        aligned=np.zeros(3)
        for p,c in zip(predicted,model.classes_): aligned[int(c)]=p
        g['pred'][key]=aligned.tolist()
    del g['features']; del g['elo']
    for model,probs in g['pred'].items():
        g['pred'][model]=[round(float(p),6) for p in probs]

obj={
  'metadata':{'title':'MRS Predictive Lab','nature':'Dados 100% sintéticos — equipas e resultados fictícios','date_generated':'2026-10-29','seed':SEED,'n_train':len(train),'n_test':len(test),'train_seasons':'2020–2023 (fictícias)','test_seasons':'2024–2025 (fictícias)','method':'Features calculadas apenas a partir dos jogos anteriores; treino em temporadas anteriores, teste em temporadas posteriores.','limitations':'Resultados sintéticos. As métricas não demonstram desempenho em jogos reais. Sem dados atuais, odds reais ou previsões de partidas futuras.'},
  'models':{'logistic':'Regressão logística','forest':'Random Forest','elo':'Elo (referência)','frequency':'Frequência histórica (referência)'},
  'metrics':{m:metrics(test,m) for m in ['logistic','forest','elo','frequency']},
  'matches':test
}
p=Path(__file__).resolve().parents[1]/'preditivo'/'data'/'demo.json'
p.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Gerado',p,'jogos treino',len(train),'teste',len(test),'Bytes',p.stat().st_size)
for m in obj['models']:print(m,obj['metrics'][m]['accuracy'],obj['metrics'][m]['logloss'],obj['metrics'][m]['brier'])
