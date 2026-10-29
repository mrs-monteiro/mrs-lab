(()=>{'use strict';
const $=id=>document.getElementById(id);
const labels=['1','X','2'];
let original=null, data=null, selected=null, page=0;
const perPage=10;
const pct=p=>(100*p).toFixed(1).replace('.',',')+'%';
const decimal=v=>Number(v).toFixed(3).replace('.',',');
const node=(tag,cls,content)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e};
function clear(el){el.replaceChildren()}
function msg(t){$('status').textContent=t}
function evaluate(rows,key){
 if(!rows.length)return null;
 const cm=[[0,0,0],[0,0,0],[0,0,0]];let ok=0,ll=0,brier=0;
 const cal=Array.from({length:5},()=>({n:0,sum:0,correct:0}));
 for(const r of rows){const p=r.pred[key];if(!p)continue;const pred=p.indexOf(Math.max(...p));const actual=r.actual;
  cm[actual][pred]++;if(actual===pred)ok++;ll-=Math.log(Math.max(1e-15,p[actual]));
  for(let j=0;j<3;j++)brier+=(p[j]-(j===actual?1:0))**2;
  const confidence=p[pred],i=Math.min(4,Math.floor(confidence*5));cal[i].n++;cal[i].sum+=confidence;cal[i].correct+=+(pred===actual);
 }
 return {n:rows.length,accuracy:ok/rows.length,logloss:ll/rows.length,brier:brier/rows.length,cm,cal};
}
function renderModelSelect(){const s=$('model'),chosen=s.value;clear(s);Object.entries(data.models).forEach(([id,label])=>{const o=new Option(label,id);s.add(o)});s.value=data.models[chosen]?chosen:Object.keys(data.models)[0]}
function renderSeasons(){const s=$('season'),chosen=s.value;clear(s);s.add(new Option('Todas as temporadas','all'));
 [...new Set(data.matches.map(x=>String(x.season)))].sort().forEach(y=>s.add(new Option(y,y)));
 s.value=[...s.options].some(o=>o.value===chosen)?chosen:'all'}
function filtered(){const season=$('season').value,txt=$('team').value.trim().toLocaleLowerCase('pt');return data.matches.filter(x=>(season==='all'||String(x.season)===season)&&(!txt||[x.home,x.away].some(t=>t.toLocaleLowerCase('pt').includes(txt))))}
function render(){const rows=filtered(),key=$('model').value,m=evaluate(rows,key);$('dataset-label').textContent=data.metadata.nature;$('fixture-count').textContent=rows.length+' jogo(s)';
 $('m-count').textContent=m?String(m.n):'0';$('m-accuracy').textContent=m?pct(m.accuracy):'—';$('m-logloss').textContent=m?decimal(m.logloss):'—';$('m-brier').textContent=m?decimal(m.brier):'—';
 renderComparison(rows,key);renderConfusion(m);renderCalibration(m);renderFixtures(rows,key);
}
function renderComparison(rows,chosen){const root=$('comparison');clear(root);
 Object.entries(data.models).forEach(([key,label])=>{const m=evaluate(rows,key),line=node('div','modelbar'+(key===chosen?' current':'')),name=node('span','',label),val=node('strong','',m?pct(m.accuracy):'—'),track=node('div','track'),fill=node('div','fill');fill.style.width=m?pct(m.accuracy):'0%';track.append(fill);line.append(name,val,track);root.append(line)});
}
function renderConfusion(m){const root=$('confusion');clear(root);if(!m){root.textContent='Sem jogos para este filtro.';$('confusion-note').textContent='';return}
 const table=node('table','cmatrix');table.setAttribute('aria-label','Matriz de confusão');const thead=node('thead'),head=node('tr');head.append(node('th','','Real / Prev.'));for(const x of labels)head.append(node('th','',x));thead.append(head);const body=node('tbody');
 for(let i=0;i<3;i++){const tr=node('tr');tr.append(node('th','',labels[i]));for(let j=0;j<3;j++)tr.append(node('td',i===j?'diag':'off',String(m.cm[i][j])));body.append(tr)}table.append(thead,body);root.append(table);$('confusion-note').textContent='Diagonal: previsões certas. Fora da diagonal: classes confundidas.'}
function renderCalibration(m){const root=$('calibration');clear(root);if(!m){root.textContent='Sem dados.';return}
 m.cal.forEach((b,i)=>{const row=node('div','calrow'),bin=node('span','',`${i*20}–${(i+1)*20}%`),tracks=node('div','caltracks'),confidence=node('div','caltrack'),observed=node('div','caltrack observed'),cb=node('div','calfill'),ob=node('div','calfill');
 cb.style.width=b.n?pct(b.sum/b.n):'0%';ob.style.width=b.n?pct(b.correct/b.n):'0%';confidence.title='Confiança média';observed.title='Percentagem de acertos';confidence.append(cb);observed.append(ob);tracks.append(confidence,observed);row.append(bin,tracks,node('span','',b.n?b.n+' jogos':'sem jogos'));root.append(row)});
 const legend=node('p','caption','Verde: confiança média · Dourado: percentagem de acertos');root.append(legend);
}
function renderFixtures(rows,key){const root=$('fixtures');clear(root);if(!rows.length){const tr=node('tr'),td=node('td','','Sem jogos encontrados.');td.colSpan=5;tr.append(td);root.append(tr);renderSelected(null,key);$('page-label').textContent='';$('page-prev').disabled=true;$('page-next').disabled=true;return}
 const pages=Math.ceil(rows.length/perPage);page=Math.max(0,Math.min(page,pages-1));const chunk=rows.slice(page*perPage,(page+1)*perPage);
 if(!chunk.some(x=>x.id===selected))selected=chunk[0].id;
 for(const item of chunk){const tr=node('tr',item.id===selected?'selected':''),prediction=item.pred[key].indexOf(Math.max(...item.pred[key]));tr.append(node('td','',item.date));tr.append(node('td','',item.home+' — '+item.away));tr.append(node('td','',item.score.join(' : ')+' ('+labels[item.actual]+')'));tr.append(node('td','',labels[prediction]));const c=node('td'),b=node('button','choose','Ver');b.type='button';b.setAttribute('aria-label','Ver probabilidades de '+item.home+' contra '+item.away);b.addEventListener('click',()=>{selected=item.id;renderFixtures(rows,key)});c.append(b);tr.append(c);root.append(tr)}
 $('page-label').textContent=`Página ${page+1} de ${pages}`;$('page-prev').disabled=page===0;$('page-next').disabled=page>=pages-1;renderSelected(rows.find(x=>x.id===selected)||chunk[0],key);
}
function renderSelected(item,key){const root=$('probabilities');clear(root);if(!item){$('jogo-escolhido').textContent='Sem resultados';$('selected-date').textContent='';$('observed').textContent='—';return}
 $('jogo-escolhido').textContent=item.home+' × '+item.away;$('selected-date').textContent=item.date+' · Temporada '+item.season;
 const probs=item.pred[key];for(let i=0;i<3;i++){const row=node('div','probitem'),head=node('div','probhead');head.append(node('span','',labels[i]+(i===0?' · Casa':i===1?' · Empate':' · Fora')),node('b','',pct(probs[i])));const track=node('div','probtrack'),bar=node('div','probfill');bar.style.width=pct(probs[i]);track.append(bar);row.append(head,track);root.append(row)}
 $('observed').textContent=labels[item.actual]+' · '+item.score.join('–');const conf=Math.max(...probs),top=probs.indexOf(conf);$('match-note').textContent=`Classe mais provável: ${labels[top]} (${pct(conf)}). ${top===item.actual?'Coincidiu com o resultado observado.':'Não coincidiu com o resultado observado.'} Mesmo previsões com confiança elevada podem falhar.`;
}
function odds(){const values=['odd1','oddx','odd2'].map(id=>Number($(id).value)),root=$('odds-bars');clear(root);
 if(values.some(v=>!Number.isFinite(v)||v<=1)){$('margin').textContent='Introduz três odds superiores a 1,00.';return}
 const raw=values.map(x=>1/x),sum=raw.reduce((a,b)=>a+b,0),norm=raw.map(x=>x/sum);
 for(let i=0;i<3;i++){const d=node('div','probitem'),h=node('div','probhead');h.append(node('span','',labels[i]),node('b','',pct(norm[i])));const t=node('div','probtrack'),b=node('div','probfill');b.style.width=pct(norm[i]);t.append(b);d.append(h,t);root.append(d)}$('margin').textContent='Soma das probabilidades brutas: '+pct(sum)+' · diferença para 100%: '+pct(sum-1)+' (margem matemática; pode variar).';
}
function parseCSV(text){const cleaned=text.replace(/^\uFEFF/,'');const header=(cleaned.split(/\r?\n/,1)[0]||'');const delimiter=(header.match(/;/g)||[]).length>(header.match(/,/g)||[]).length?';':',';
 const rows=[];let cell='',row=[],quoted=false;
 for(let i=0;i<cleaned.length;i++){const c=cleaned[i];if(c==='"'){if(quoted&&cleaned[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(!quoted&&c===delimiter){row.push(cell);cell=''}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&cleaned[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);cell='';row=[]}else cell+=c}
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);if(quoted)throw Error('CSV com aspas não fechadas.');return rows}
function dateISO(x){const s=x.trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const a=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(a){const y=a[3].length===2?'20'+a[3]:a[3];return y+'-'+a[2].padStart(2,'0')+'-'+a[1].padStart(2,'0')}return null}
function eloProbs(diff){const win=1/(1+10**(-(diff+75)/400)),draw=Math.max(.12,Math.min(.30,.27*Math.exp(-Math.abs(diff)/390)));return [win*(1-draw),draw,(1-win)*(1-draw)]}
function localDataset(text){const rows=parseCSV(text);if(rows.length<35)throw Error('Precisamos de pelo menos 34 jogos com cabeçalho para avaliar a sequência.');const heads=rows.shift().map(x=>x.toLowerCase().trim());const keys=['date','hometeam','awayteam','fthg','ftag'],ids=keys.map(x=>heads.indexOf(x));if(ids.some(i=>i<0))throw Error('Faltam colunas: Date, HomeTeam, AwayTeam, FTHG, FTAG.');
 const entries=[];for(const r of rows){const [date,home,away,hg,ag]=ids.map(i=>(r[i]||'').trim()),dt=dateISO(date),goalsH=Number(hg),goalsA=Number(ag);if(!dt||!home||!away||home===away||!/^\d+$/.test(hg)||!/^\d+$/.test(ag)||!Number.isSafeInteger(goalsH)||!Number.isSafeInteger(goalsA))continue;entries.push({date:dt,home,away,score:[goalsH,goalsA]})}
 entries.sort((a,b)=>a.date.localeCompare(b.date));if(entries.length<35)throw Error('O CSV precisa de pelo menos 35 jogos completos com data, equipas e golos.');
 const ratings=new Map(),selected=[];let index=0;
 for(const e of entries){const rh=ratings.get(e.home)||1500,ra=ratings.get(e.away)||1500,diff=rh-ra,p=eloProbs(diff),result=e.score[0]>e.score[1]?0:e.score[0]===e.score[1]?1:2,score=result===0?1:result===1?.5:0,expect=1/(1+10**(-(diff+75)/400));
 // Sequencial: a previsão é feita com o Elo anterior ao resultado do próprio jogo.
 if(index>=30)selected.push({...e,id:index,season:e.date.slice(0,4),actual:result,pred:{elo:p}});
 ratings.set(e.home,rh+24*(score-expect));ratings.set(e.away,ra+24*((1-score)-(1-expect)));index++}
 return {metadata:{nature:'CSV local — sem envio para servidores',n_train:'30 jogos iniciais',n_test:selected.length},models:{elo:'Elo (referência sequencial)'},matches:selected};
}
async function importCSV(file){if(!file)return;if(file.size>8*1024*1024){msg('CSV demasiado grande (máximo: 8 MB).');return}try{const text=await file.text();data=localDataset(text);$('team').value='';selected=null;page=0;renderModelSelect();renderSeasons();setSource();render();msg('CSV processado neste navegador. Apenas o modelo Elo sequencial é usado; não há treino de machine learning.')}catch(e){msg('Não foi possível importar: '+e.message)}}
function setSource(){if(data===original){$('source-title').textContent='Demonstração com dados 100% sintéticos';$('source-note').textContent='As equipas, datas e resultados são fictícios. Modelos treinados nos jogos sintéticos de 2020–2023; avaliação nos de 2024–2025. Nenhuma previsão real ou recomendação de apostas.'}else{$('source-title').textContent='Ficheiro CSV carregado apenas neste navegador';$('source-note').textContent='O modelo Elo é calculado sequencialmente. Os primeiros 30 jogos iniciam as classificações e os posteriores são avaliados; não se trata de treino ou validação de modelos de machine learning. Garante que tens direitos para usar os dados.'}}
function init(){
 $('model').addEventListener('change',()=>{page=0;selected=null;render()});$('season').addEventListener('change',()=>{page=0;selected=null;render()});$('team').addEventListener('input',()=>{page=0;selected=null;render()});$('page-prev').addEventListener('click',()=>{page--;selected=null;render()});$('page-next').addEventListener('click',()=>{page++;selected=null;render()});$('csv').addEventListener('change',async e=>{await importCSV(e.target.files?.[0]);e.target.value='' });$('resetdata').addEventListener('click',()=>{data=original;selected=null;page=0;$('team').value='';renderModelSelect();renderSeasons();setSource();render();msg('Demonstração sintética reposta.')});['odd1','oddx','odd2'].forEach(id=>$(id).addEventListener('input',odds));odds();
 fetch('data/demo.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{original=d;data=d;renderModelSelect();renderSeasons();setSource();render();msg('')}).catch(err=>{msg('Não foi possível carregar data/demo.json ('+err.message+'). Publica toda a pasta preditivo/ e abre pelo GitHub Pages, não com duplo clique no ficheiro HTML.');$('dataset-label').textContent='Dados indisponíveis';});
}
init();
})();
