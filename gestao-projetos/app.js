'use strict';
(() => {
const $=id=>document.getElementById(id);
const euro=n=>Math.round(n).toLocaleString('pt-PT')+' €';
const MAX_TASKS=12;
const seed=[
 {id:'T1',name:'Descoberta de requisitos',duration:2,rate:580,deps:[]},
 {id:'T2',name:'Desenho da solução',duration:3,rate:540,deps:['T1']},
 {id:'T3',name:'Construir interface',duration:5,rate:460,deps:['T2']},
 {id:'T4',name:'Preparar serviços',duration:4,rate:520,deps:['T2']},
 {id:'T5',name:'Testes de integração',duration:3,rate:390,deps:['T3','T4']},
 {id:'T6',name:'Preparar entrega',duration:2,rate:420,deps:['T5']}
];
let tasks=structuredClone(seed),currentId=null,plan=null,round=0,decisions=[],base=null,totals=null;
function make(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;}
function status(t,error=false){$('planner-message').textContent=t;$('planner-message').classList.toggle('error',error);}
function calculateCPM(rows){
 if(!rows.length)throw Error('O projeto precisa de pelo menos uma tarefa.');
 const by=new Map();for(const x of rows){
  if(by.has(x.id))throw Error('Identificadores de tarefa repetidos.');
  if(!Number.isInteger(x.duration)||x.duration<1||x.duration>45)throw Error('Cada duração deve ter entre 1 e 45 dias.');
  if(!Number.isFinite(x.rate)||x.rate<0||x.rate>5000)throw Error('Cada custo diário deve estar entre 0 e 5 000 €.');
  if(!x.name.trim())throw Error('Todas as tarefas precisam de um nome.');
  by.set(x.id,{...x,deps:[...x.deps],successors:[],es:0,ef:0,ls:0,lf:0,slack:0});
 }
 for(const x of by.values()){
  if(new Set(x.deps).size!==x.deps.length)throw Error('Dependências repetidas em '+x.id+'.');
  for(const d of x.deps){if(d===x.id||!by.has(d))throw Error('Dependência inválida em '+x.id+'.');by.get(d).successors.push(x.id);}
 }
 const ready=[...by.values()].filter(x=>!x.deps.length).map(x=>x.id),order=[];
 const degree=new Map([...by.values()].map(x=>[x.id,x.deps.length]));
 while(ready.length){const id=ready.shift(),item=by.get(id);order.push(id);
  item.es=Math.max(0,...item.deps.map(d=>by.get(d).ef));item.ef=item.es+item.duration;
  for(const child of item.successors){degree.set(child,degree.get(child)-1);if(degree.get(child)===0)ready.push(child);}
 }
 if(order.length!==by.size)throw Error('As dependências formam um ciclo. Remove uma das ligações para prosseguir.');
 const days=Math.max(...[...by.values()].map(x=>x.ef));
 for(const id of order.slice().reverse()){
  const x=by.get(id);x.lf=x.successors.length?Math.min(...x.successors.map(s=>by.get(s).ls)):days;x.ls=x.lf-x.duration;x.slack=x.ls-x.es;
 }
 return {days,cost:[...by.values()].reduce((a,x)=>a+x.duration*x.rate,0),order,by,critical:[...by.values()].filter(x=>x.slack===0).length};
}
function renderTasks(){const host=$('task-list');host.replaceChildren();for(const x of tasks){const v=plan?.by.get(x.id),row=make('div','task-row'+(v?.slack===0?' critical-task':''));const info=make('div');info.append(make('strong',null,x.id+' · '+x.name),make('span',null,`${x.duration} dia(s) · ${euro(x.duration*x.rate)} · Após: ${x.deps.length?x.deps.join(', '):'nenhuma'}`));const b=make('button','small ghost','Editar');b.type='button';b.addEventListener('click',()=>editTask(x.id));row.append(info,b);host.append(row);}}
function renderChart(){const host=$('gantt');host.replaceChildren();if(!plan)return;const ticks=make('div','gantt-ticks');for(let n=0;n<=5;n++)ticks.append(make('span',null,Math.round(plan.days*n/5)+' d'));host.append(ticks);
 for(const x of tasks){const v=plan.by.get(x.id),row=make('div','gantt-row'),lab=make('span','gantt-label',x.id+' · '+x.name),track=make('div','gantt-track'),bar=make('div','gantt-bar'+(v.slack===0?' critical':''),x.duration+' d');bar.style.left=(v.es/plan.days*100)+'%';bar.style.width=(x.duration/plan.days*100)+'%';bar.title=`${x.name}: dia ${v.es}–${v.ef}; folga ${v.slack} dia(s)`;track.append(bar);row.append(lab,track);host.append(row);}}
function renderTable(){const host=$('cpm-table');host.replaceChildren();if(!plan)return;for(const x of tasks){const v=plan.by.get(x.id),row=make('tr',v.slack===0?'critical-row':'');for(const t of [x.id+' · '+x.name,v.es,v.ef,v.ls,v.lf,v.slack])row.append(make('td',null,t));host.append(row);}}
function refresh(msg){try{plan=calculateCPM(tasks);$('plan-days').textContent=plan.days+' dias';$('plan-cost').textContent=euro(plan.cost);$('plan-critical').textContent=plan.critical+' / '+tasks.length;status(msg||'Cálculos atualizados. O calendário reflete as alterações.');}catch(e){plan=null;$('plan-days').textContent=$('plan-cost').textContent=$('plan-critical').textContent='—';status(e.message,true);}renderTasks();renderChart();renderTable();$('challenge-start').disabled=!plan;}
function editTask(id){const x=tasks.find(t=>t.id===id);if(!x)return;currentId=id;$('task-editor-title').textContent='Editar '+id;$('task-name').value=x.name;$('task-duration').value=x.duration;$('task-rate').value=x.rate;const host=$('task-dependencies');host.replaceChildren();for(const other of tasks.filter(t=>t.id!==id)){const label=make('label'),box=document.createElement('input');box.type='checkbox';box.value=other.id;box.checked=x.deps.includes(other.id);label.append(box,document.createTextNode(other.id+' · '+other.name));host.append(label);}if(!host.children.length)host.append(make('p','hint','Sem outras tarefas disponíveis.'));$('task-form').hidden=false;$('task-delete').disabled=tasks.some(t=>t.deps.includes(id))||tasks.length===1;$('editor-help').textContent='Escolhe as tarefas que devem estar concluídas antes desta começar. Não são permitidos ciclos.';$('task-name').focus();}
function cancelEdit(){$('task-form').hidden=true;currentId=null;$('task-editor-title').textContent='Editar tarefa';$('editor-help').textContent='Seleciona «Editar» numa tarefa para começar.';}
$('task-form').addEventListener('submit',e=>{e.preventDefault();const i=tasks.findIndex(t=>t.id===currentId);if(i<0)return;
 const name=$('task-name').value.trim(),duration=Number($('task-duration').value),rate=Number($('task-rate').value);
 if(!name||name.length>65||!Number.isInteger(duration)||duration<1||duration>45||!Number.isFinite(rate)||rate<0||rate>5000){status('Revê o nome, a duração (1–45) e o custo diário (0–5 000 €).',true);return;}
 const deps=[...$('task-dependencies').querySelectorAll('input:checked')].map(n=>n.value),next=tasks.map((x,j)=>j===i?{id:x.id,name,duration,rate,deps}:x);
 try{calculateCPM(next);const savedId=currentId;tasks=next;cancelEdit();refresh('Tarefa '+savedId+' atualizada.');}catch(err){status(err.message,true);}
});
$('task-cancel').addEventListener('click',cancelEdit);
$('task-delete').addEventListener('click',()=>{if(!currentId||tasks.length<=1)return;const id=currentId;if(tasks.some(t=>t.deps.includes(id))){status('Não podes eliminar uma tarefa com sucessoras. Edita as dependências primeiro.',true);return;}tasks=tasks.filter(t=>t.id!==id);cancelEdit();refresh('Tarefa '+id+' eliminada.');});
$('task-add').addEventListener('click',()=>{if(tasks.length>=MAX_TASKS){status('Máximo de '+MAX_TASKS+' tarefas para manter o exercício legível.',true);return;}let j=1;while(tasks.some(t=>t.id==='T'+j))j++;const id='T'+j;tasks.push({id,name:'Nova tarefa',duration:2,rate:350,deps:[]});refresh('Nova tarefa adicionada: define as dependências.');editTask(id);});
$('planner-reset').addEventListener('click',()=>{tasks=structuredClone(seed);cancelEdit();refresh('Exemplo original reposto.');});
function download(filename,content){const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('planner-export').addEventListener('click',()=>{if(!plan)return;download('mrs-plano-demonstrativo.json',{type:'MRS educational CPM plan',tasks,summary:{durationDays:plan.days,directCostEUR:plan.cost,criticalTasks:tasks.filter(x=>plan.by.get(x.id).slack===0).map(x=>x.id)},assumptions:'finish-to-start, deterministic durations, no resource constraints'});});
const stages=[
 {title:'O cliente acrescentou uma funcionalidade',context:'A equipa terminou a análise, mas surge um requisito que não estava no âmbito inicial.',options:[
  {label:'Avaliar impacto e negociar prioridade',explain:'Alinhar âmbito e rever o plano.',days:2,cost:850,risk:-3,quality:3,lesson:'A gestão da mudança permite negociar âmbito, prazo e custo antes de assumir compromissos.'},
  {label:'Aceitar sem alterar o plano',explain:'Manter a data, com maior incerteza.',days:1,cost:450,risk:18,quality:-12,lesson:'Aceitar alterações sem analisar capacidade pode aumentar defeitos e risco.'},
  {label:'Adiar para uma versão seguinte',explain:'Preservar o âmbito desta entrega.',days:0,cost:150,risk:5,quality:0,lesson:'Separar uma melhoria futura pode proteger o compromisso atual, desde que exista acordo.'}
 ]},
 {title:'Uma dependência técnica ficou bloqueada',context:'Um serviço de teste fictício não está disponível quando a integração devia começar.',options:[
  {label:'Replanear e antecipar outras tarefas',explain:'Aproveitar trabalho independente.',days:2,cost:500,risk:-2,quality:0,lesson:'Replanear depende da rede de precedências; uma tarefa não crítica pode absorver um atraso.'},
  {label:'Pedir apoio adicional à equipa',explain:'Reduzir espera à custa de mais esforço.',days:1,cost:1650,risk:4,quality:1,lesson:'Mais recursos nem sempre reduzem proporcionalmente o prazo, e aumentam o custo.'},
  {label:'Ignorar o bloqueio até ao final',explain:'Não interromper as tarefas restantes.',days:5,cost:1000,risk:19,quality:-10,lesson:'Não tratar cedo um impedimento aumenta a exposição a riscos de integração.'}
 ]},
 {title:'Os testes detetaram um defeito relevante',context:'Na validação final surge um erro num fluxo essencial da aplicação fictícia.',options:[
  {label:'Corrigir e repetir os testes',explain:'Mais qualidade, com impacto no plano.',days:3,cost:1250,risk:-12,quality:12,lesson:'Repetir testes depois da correção reduz o risco de entregar uma falha conhecida.'},
  {label:'Reduzir o âmbito de forma acordada',explain:'Retirar temporariamente o fluxo afetado.',days:1,cost:500,risk:4,quality:2,lesson:'Uma entrega faseada é possível quando as alterações são comunicadas e aceites.'},
  {label:'Entregar sem validar a correção',explain:'Cumprir a data a qualquer custo.',days:0,cost:100,risk:28,quality:-23,lesson:'Ocultar ou aceitar defeitos relevantes pode comprometer a confiança na entrega.'}
 ]}
];
const clamp=n=>Math.max(0,Math.min(100,n));
function updateChallenge(){if(!totals){for(const id of ['ch-days','ch-cost','ch-risk','ch-quality'])$(id).textContent='—';$('challenge-progress').textContent='0 / 3 decisões';return;}
 $('ch-days').textContent=String(totals.days);$('ch-cost').textContent=euro(totals.cost);$('ch-risk').textContent=String(totals.risk);$('ch-quality').textContent=String(totals.quality);$('challenge-progress').textContent=round+' / 3 decisões';}
function renderLog(){const host=$('decision-log');host.replaceChildren();if(!decisions.length){host.append(make('li',null,'As decisões e as aprendizagens aparecem aqui.'));return;}decisions.forEach(d=>host.append(make('li',null,`${d.situation} — ${d.choice}. ${d.lesson}`)));}
function renderChallenge(){const host=$('challenge-stage');host.replaceChildren();if(!totals){host.append(make('p',null,'Clica em «Iniciar desafio com o meu plano» para receber a primeira situação.'));return;}
 if(round===stages.length){host.append(make('h3',null,'Missão concluída!'),make('p',null,`Plano inicial: ${base.days} dias e ${euro(base.cost)}. Após três decisões: ${totals.days} dias e ${euro(totals.cost)}.`),make('p',null,`Risco ilustrativo: ${totals.risk}/100. Qualidade ilustrativa: ${totals.quality}/100.`),make('p','hint','Nenhuma decisão isolada é universalmente correta: compara o compromisso assumido, a informação disponível e as consequências.'));return;}
 const step=stages[round];host.append(make('p','eyebrow','RONDA '+(round+1)+' / '+stages.length),make('h3',null,step.title),make('p',null,step.context));const grid=make('div','choices');step.options.forEach((opt,index)=>{const b=make('button','choice');b.type='button';b.append(make('strong',null,opt.label),make('small',null,opt.explain));b.addEventListener('click',()=>choose(index));grid.append(b);});host.append(grid);}
function choose(i){if(!totals||round>=stages.length)return;const step=stages[round],option=step.options[i];if(!option)return;totals.days+=option.days;totals.cost+=option.cost;totals.risk=clamp(totals.risk+option.risk);totals.quality=clamp(totals.quality+option.quality);
 decisions.push({situation:step.title,choice:option.label,lesson:option.lesson,change:{days:option.days,costEUR:option.cost,riskIndex:option.risk,qualityIndex:option.quality}});round++;updateChallenge();renderLog();renderChallenge();$('challenge-export').disabled=false;}
$('challenge-start').addEventListener('click',()=>{if(!plan)return;base={days:plan.days,cost:plan.cost};totals={days:plan.days,cost:plan.cost,risk:20,quality:75};round=0;decisions=[];updateChallenge();renderLog();renderChallenge();$('challenge-export').disabled=true;$('challenge-stage').scrollIntoView({behavior:'smooth',block:'nearest'});});
$('challenge-reset').addEventListener('click',()=>{round=0;decisions=[];base=totals=null;updateChallenge();renderLog();renderChallenge();$('challenge-export').disabled=true;});
$('challenge-export').addEventListener('click',()=>{if(!totals)return;download('mrs-decisoes-projeto-ficticio.json',{type:'MRS educational project scenario',initial:base,final:totals,decisions,disclaimer:'Simulação educativa. Valores fictícios e não preditivos.'});});
$('task-form').hidden=true;refresh('Exemplo carregado. Clica em «Editar» para experimentares mudar o prazo.');updateChallenge();renderLog();renderChallenge();
})();
