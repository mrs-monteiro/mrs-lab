/* MRS Predictive Lab V3 — seleção multidesportiva, calendário e proveniência.
   Sem credenciais no navegador. Não fabrica probabilidades de resultados reais. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const names={football:'Futebol',basketball:'Basquetebol',nhl:'NHL — hóquei no gelo',roller_hockey:'Hóquei em patins'};
const phases={scheduled:'Agendado',live:'Em direto',finished:'Terminado',postponed:'Adiado / outro'};
const rowsPerPage=36;
let all=[],activeId=null,limit=rowsPerPage,dayMode='today',loadedAt='';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n;};
const display=(x)=>String(x||'').trim();
const dateAt=(d)=>{if(!d)return null;const t=new Date(/^\d{4}-\d{2}-\d{2}$/.test(d)?d+'T12:00:00Z':d);return Number.isNaN(t.valueOf())?null:t;};
const calendarDate=(date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const today=()=>calendarDate(new Date());
const tomorrow=()=>calendarDate(new Date(Date.now()+86400000));
const eventDay=e=>{const t=dateAt(e.date);return t?calendarDate(t):String(e.date||'').slice(0,10);};
const when=date=>{const t=dateAt(date);return t?t.toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Data por confirmar';};
const norm=str=>String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function phase(e){if(phases[e.phase])return e.phase;
 const s=norm(e.status);if(/finished|full time|terminad|final|after extra|match finished/.test(s))return 'finished';
 if(/live|in play|directo|direto|quarter|half.time|em curso/.test(s))return 'live';
 if(/postpon|adiad|cancel|suspend/.test(s))return 'postponed';return 'scheduled';}
// Prioridades editoriais do MRS LAB: apenas competições identificadas com segurança.
// Para evitar falsos destaques, o nome da liga é sempre combinado com a região/país.
const cleanLeague=s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim();
const mainEuropeanLeagues={
 portugal:['primeira liga','liga portugal','liga portugal betclic','liga portugal 1'],
 england:['premier league','women s super league'],
 spain:['la liga','laliga','primera division','liga f'],
 italy:['serie a','serie a women','serie a femminile'],
 germany:['bundesliga','frauen bundesliga'],
 france:['ligue 1','division 1 feminine','premiere ligue'],
 netherlands:['eredivisie','vrouwen eredivisie'],
 belgium:['jupiler pro league','pro league','first division a'],
 scotland:['premiership','scottish premiership'],
 turkey:['super lig'],
 austria:['bundesliga'],
 switzerland:['super league'],
 greece:['super league 1','super league'],
 poland:['ekstraklasa'],
 denmark:['superliga'],
 norway:['eliteserien'],
 sweden:['allsvenskan'],
 czechia:['czech liga','first league','1 liga'],
 'czech republic':['czech liga','first league','1 liga'],
 ireland:['premier division'],
 wales:['premier league','cymru premier'],
 ukraine:['premier league'],
 croatia:['hnl','1 hnl'],
 serbia:['super liga'],
 romania:['liga i','liga 1','superliga']
};
function important(e){
 const league=cleanLeague(e.league),country=cleanLeague(e.country);
 if(e.sport==='nhl')return league==='nhl'?130:0;
 if(e.sport==='basketball'){
   // Todos os encontros NBA (sem confundir com NBA G League ou ligas de formação).
   if(league==='nba')return 150;
   if(league==='euroleague'||league==='euroliga')return 120;
   if(league==='liga betclic'&&country==='portugal')return 105;
   return 0;
 }
 if(e.sport==='roller_hockey')return /placard|champions|portugal|world skate/.test(league)?100:0;
 if(e.sport!=='football')return 0;
 // UEFA Champions e Liga Europa; exclui a AFC, CONCACAF e competições homónimas.
 if(/^(?:uefa )?champions league(?: women)?(?: qualification)?$/.test(league)&&
    (league.startsWith('uefa ')||country==='world'||country==='europe'))return 180;
 if(/^(?:uefa )?europa league(?: qualification)?$/.test(league)&&
    (league.startsWith('uefa ')||country==='world'||country==='europe'))return 170;
 if(/^uefa europa cup women$/.test(league))return 165;
 if(/^(?:uefa )?europa conference league(?: qualification)?$/.test(league)&&
    (league.startsWith('uefa ')||country==='world'||country==='europe'))return 145;
 // Europeus de seleções (mas não escalões U17/U19 nem torneios fora da UEFA).
 if(/^(?:uefa )?(?:euro|european championship)(?: 20\d\d)?(?: qualification| qualifiers| qualifying)?$/.test(league) ||
    /^uefa women s (?:euro|european championship)(?: qualification| qualifiers)?$/.test(league))return 175;
 // Campeonatos nacionais europeus de primeira divisão, incluindo os femininos indicados.
 if((mainEuropeanLeagues[country]||[]).includes(league))return 145;
 return 0;
}
function validate(raw){if(!raw||!Array.isArray(raw.events)||raw.events.length>8000)throw Error('O JSON deve conter um array events com até 8000 jogos.');
 return raw.events.filter(e=>e&&typeof e.id==='string'&&e.id.length<180&&typeof e.home==='string'&&e.home.length<160&&typeof e.away==='string'&&e.away.length<160&&names[e.sport]||e&&e.sport==='nba'&&typeof e.id==='string'&&typeof e.home==='string'&&typeof e.away==='string')
 .map(e=>({...e,sport:e.sport==='nba'?'basketball':e.sport,league:(e.sport==='nba'?'NBA':display(e.league||'Competição não identificada')).slice(0,180)}))
 .filter(e=>names[e.sport]).slice(0,8000);}
function currentSport(){return $('sport').value;}
function leagues(){const items=all.filter(e=>e.sport===currentSport());const leagues=[...new Set(items.map(e=>e.league))].sort((a,b)=>a.localeCompare(b,'pt'));
 const sel=$('sport-league');const prev=sel.value;sel.replaceChildren();const o=el('option','Todas as competições');o.value='all';sel.append(o);
 const featured=leagues.filter(l=>items.some(e=>e.league===l&&important(e)>0));
 const add=(arr,parent)=>arr.forEach(l=>{const opt=el('option',l);opt.value=l;parent.append(opt);});
 if(featured.length){const group=el('optgroup');group.label='⭐ Competições em destaque';add(featured,group);sel.append(group);}
 const others=leagues.filter(l=>!featured.includes(l));if(others.length){const group=el('optgroup');group.label='Outras competições';add(others,group);sel.append(group);}
 sel.value=leagues.includes(prev)?prev:'all';}
function matching(){const sport=currentSport(),league=$('sport-league').value,query=norm($('sport-query').value.trim());
 let rows=all.filter(e=>e.sport===sport&&(league==='all'||e.league===league)&&(!query||norm(e.home+' '+e.away+' '+e.league).includes(query)));
 if(dayMode==='today')rows=rows.filter(e=>eventDay(e)===today());
 if(dayMode==='tomorrow')rows=rows.filter(e=>eventDay(e)===tomorrow());
 if(dayMode==='date')rows=rows.filter(e=>eventDay(e)===$('sport-date').value);
 if($('sport-feature').value==='featured')rows=rows.filter(e=>important(e)>0);
 const counts={scheduled:0,live:0,finished:0,postponed:0};rows.forEach(e=>counts[phase(e)]++);
 const selectedPhase=$('sport-phase').value;
 if(selectedPhase!=='all')rows=rows.filter(e=>phase(e)===selectedPhase);
 rows.sort((a,b)=>{
   const pa=phase(a),pb=phase(b),rank={live:0,scheduled:1,finished:2,postponed:3};
   if(rank[pa]!==rank[pb])return rank[pa]-rank[pb];
   const feature=important(b)-important(a);if(feature)return feature;
   return String(a.date||'').localeCompare(String(b.date||''));
 });return {rows,counts};}
function tinyBadge(text,cls){return el('span',text,'v3-tag '+(cls||''));}
function renderSummary(counts){const host=$('v3-summary');host.replaceChildren();for(const [k,label] of [['scheduled','Agendados'],['live','Em direto'],['finished','Terminados'],['postponed','Outros']]){
 const n=el('div',undefined,'v3-counter v3-'+k);n.append(el('strong',counts[k]||0),el('span',label));host.append(n);}}
function validOdds(e){const o=e.odds;if(!o||typeof o!=='object'||!o.prices||typeof o.prices!=='object')return null;
 const needed=e.sport==='football'?['1','X','2']:['1','2'];if(Object.keys(o.prices).length!==needed.length)return null;
 const prices=needed.map(k=>Number(o.prices[k]));if(prices.some(v=>!Number.isFinite(v)||v<=1||v>1000))return null;
 const sum=prices.reduce((a,b)=>a+1/b,0);return {data:o,needed,prices,sum};}
function validModel(e){const m=e.model;if(!m||m.status!=='validated'||!m.validation||!m.probabilities||!m.training_end||!m.evaluated_at||!m.name)return null;
 const date=dateAt(e.date),train=dateAt(m.training_end),evalDate=dateAt(m.evaluated_at);
 if(!date||!train||!evalDate||train>=date||evalDate>=date||Number(m.validation.n)<30)return null;
 if(!Number.isFinite(Number(m.validation.log_loss))||!Number.isFinite(Number(m.validation.brier)))return null;
 const keys=e.sport==='football'?['1','X','2']:['1','2'];
 const ps=keys.map(k=>Number(m.probabilities[k]));if(ps.some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(ps.reduce((a,b)=>a+b,0)-1)>.015)return null;
 return {m,keys,ps};}
function writeDetail(e){const box=$('sport-detail');box.replaceChildren();
 box.append(el('div','DADOS DO ENCONTRO','eyebrow'),el('h3',e.home+' — '+e.away));
 const tags=el('div',undefined,'v3-badges');tags.append(tinyBadge(phases[phase(e)],'v3-'+phase(e)));if(important(e)>0)tags.append(tinyBadge('Em destaque','v3-featured'));box.append(tags);
 box.append(el('p',(e.league||'Competição')+' · '+names[e.sport],'v3-meta'),el('p',when(e.date)+' · '+display(e.status||phases[phase(e)]),'subtle'));
 if(e.country)box.append(el('p','País: '+e.country,'subtle'));
 const model=validModel(e);
 const section=el('section',undefined,'v3-subpanel');section.append(el('h4','Probabilidades do modelo'));
 if(model){section.append(el('p',model.m.name+' · validação fora da amostra ('+model.m.validation.n+' jogos)','subtle'));
 for(let i=0;i<model.keys.length;i++){const line=el('div',undefined,'v3-prob-row');line.append(el('span',model.keys[i]==='1'?'Casa':model.keys[i]==='X'?'Empate':'Fora'));const bar=el('div',undefined,'v3-prob-track');const fill=el('span');fill.style.width=(model.ps[i]*100).toFixed(1)+'%';bar.append(fill);line.append(bar,el('strong',(model.ps[i]*100).toFixed(1).replace('.',',')+'%'));section.append(line);}
 section.append(el('p','Log loss: '+model.m.validation.log_loss+' · Brier: '+model.m.validation.brier+' · treino até '+model.m.training_end,'subtle'));
 }else{section.append(el('p','Sem previsão validada para este jogo. Não são apresentadas percentagens estimadas sem treino, avaliação e calibração documentados.','subtle'));}
 box.append(section);
 const odds=validOdds(e),od=el('section',undefined,'v3-subpanel');od.append(el('h4','Odds do mercado'));
 if(odds){od.append(el('p','Fonte: '+display(odds.data.source||'The Odds API')+' · Casa: '+display(odds.data.bookmaker||'não identificada'),'subtle'));
 for(let i=0;i<odds.needed.length;i++){const line=el('div',undefined,'v3-odds-row');const label=odds.needed[i]==='1'?'Casa':odds.needed[i]==='X'?'Empate':'Fora';line.append(el('span',label),el('strong',odds.prices[i].toFixed(2).replace('.',',')));od.append(line);}
 od.append(el('p','Probabilidades implícitas normalizadas (margem retirada): '+odds.needed.map((k,i)=>k+' '+((1/odds.prices[i]/odds.sum)*100).toFixed(1).replace('.',',')+'%').join(' · '),'subtle'));
 od.append(el('p','Mercado: '+display(odds.data.market||'h2h')+' · recolha: '+(odds.data.updated_at?when(odds.data.updated_at):'hora não indicada')+' · Não são previsões do modelo.','subtle'));
 if(/^https:\/\//.test(String(odds.data.source_url||''))){const a=el('a','Fonte das odds');a.href=odds.data.source_url;a.target='_blank';a.rel='noopener noreferrer';od.append(a);}
 }else{od.append(el('p','Sem cotação autorizada e associada com segurança a este encontro.','subtle'));}
 box.append(od);
 const origin=el('div',undefined,'origin-line');origin.append(el('span','Origem dos jogos: '+display(e.source||'Não identificada')));
 if(/^https:\/\//.test(String(e.source_url||''))){const a=el('a','Consultar a fonte');a.href=e.source_url;a.target='_blank';a.rel='noopener noreferrer';origin.append(document.createTextNode(' · '),a);}box.append(origin);
}
function resetList(){limit=rowsPerPage;activeId=null;}
function render(){const {rows,counts}=matching();renderSummary(counts);$('sport-count').textContent=rows.length+' jogo(s)';const list=$('sport-games'),previousScroll=list.scrollTop;list.replaceChildren();
 if(!rows.length){list.append(el('div',undefined,'v3-empty'));const empty=list.firstChild;
 empty.append(el('strong','Sem encontros para estes filtros'),el('p','Experimenta «Todas as datas», outra competição ou desativa o filtro de destaques. Os planos gratuitos podem limitar a janela de datas.'));
 $('sport-detail').replaceChildren(el('h3','Sem jogo selecionado'),el('p','Não fabricamos confrontos, odds ou probabilidades.','subtle'));
 $('sport-more').hidden=true;$('sport-visible').textContent='';return;}
 if(!rows.some(e=>e.id===activeId))activeId=rows[0].id;
 const slice=rows.slice(0,Math.max(limit,rows.findIndex(e=>e.id===activeId)+1));
 for(const e of slice){const b=el('button',undefined,'sport-game v3-game');b.type='button';b.setAttribute('aria-pressed',String(e.id===activeId));b.dataset.id=e.id;
 const main=el('span');main.append(el('strong',e.home+' × '+e.away),el('small',e.league+' · '+when(e.date)));
 const side=el('span',undefined,'v3-game-tags');side.append(tinyBadge(phases[phase(e)],'v3-'+phase(e)));
 if(important(e)>0)side.append(tinyBadge('★ Destaque','v3-featured'));
 if(validOdds(e))side.append(tinyBadge('Odds','v3-odds'));
 main.append(el('span',display(e.status),'v3-statusline'));b.append(main,side);
 b.addEventListener('click',()=>{activeId=e.id;const prev=list.scrollTop;list.querySelectorAll('[aria-pressed="true"]').forEach(n=>n.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');writeDetail(e);list.scrollTop=prev;});list.append(b);
 }
 const selected=rows.find(e=>e.id===activeId);writeDetail(selected);
 list.scrollTop=Math.min(previousScroll,list.scrollHeight-list.clientHeight);
 $('sport-more').hidden=slice.length>=rows.length;$('sport-visible').textContent='A mostrar '+slice.length+' de '+rows.length;
}
function chooseMode(mode){dayMode=mode;$('sport-date').value=mode==='date'?$('sport-date').value:'';
 document.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===mode)));
 resetList();render();}
$('sport').addEventListener('change',()=>{leagues();resetList();render();});
$('sport-league').addEventListener('change',()=>{resetList();render();});
$('sport-query').addEventListener('input',()=>{resetList();render();});
$('sport-phase').addEventListener('change',()=>{resetList();render();});
$('sport-feature').addEventListener('change',()=>{resetList();render();});
$('sport-date').addEventListener('change',()=>{dayMode='date';document.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed','false'));resetList();render();});
document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.day)));
$('sport-more').addEventListener('click',()=>{limit+=rowsPerPage;render();});
$('sport-json').addEventListener('change',async ev=>{const f=ev.target.files&&ev.target.files[0];if(!f)return;
 try{if(f.size>3500000)throw Error('Ficheiro superior a 3,5 MB');const obj=JSON.parse(await f.text());all=validate(obj);loadedAt=display(obj.generated_at);resetList();leagues();chooseMode('all');$('feed-updated').textContent='JSON local · '+all.length+' jogos';$('sport-status').textContent='Dados carregados apenas no navegador; nenhuma credencial foi enviada.';}
 catch(err){$('sport-status').textContent='Falha na importação: '+err.message;}finally{ev.target.value='';}});
async function load(){try{const r=await fetch('data/agenda.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
 const obj=await r.json();all=validate(obj);loadedAt=display(obj.generated_at);$('feed-updated').textContent=(loadedAt?'Atualização: '+when(loadedAt):'Agenda')+' · '+all.length+' jogos';
 $('sport').value='football';leagues();chooseMode(all.some(e=>e.sport==='football'&&eventDay(e)===today())?'today':'all');
 $('sport-status').textContent='Agenda sincronizada a partir do GitHub Actions. Odds e previsões só surgem com fontes e validação adequadas.';
 }catch(err){all=[];leagues();chooseMode('all');$('feed-updated').textContent='Agenda indisponível';$('sport-status').textContent='Não foi possível carregar a agenda: '+err.message;}}
load();
})();
