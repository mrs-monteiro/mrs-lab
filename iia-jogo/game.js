(()=>{'use strict';
const N=8,start=56,goal=7,boxes=[4,29,49],walls=new Set([10,18,26,28,36,37,41,43,44,50,52]);
const board=document.getElementById('board');
const $=id=>document.getElementById(id);
let history=[{p:start,mask:0}],hint=-1,path=[];
const id=(r,c)=>r*8+c,rc=i=>[Math.floor(i/8),i%8];
function adjacent(p){const [r,c]=rc(p);return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>a>=0&&a<N&&b>=0&&b<N).map(([a,b])=>id(a,b)).filter(x=>!walls.has(x));}
const all=(1<<boxes.length)-1, done=s=>s.p===goal&&s.mask===all;
const next=(s,p)=>({p,mask:s.mask|(boxes.includes(p)?1<<boxes.indexOf(p):0)});
const k=s=>s.p+'|'+s.mask;
function heuristic(s){const targets=boxes.filter((_,i)=>!(s.mask&(1<<i)));targets.push(goal);const [r,c]=rc(s.p);return Math.max(...targets.map(p=>{const [a,b]=rc(p);return Math.abs(a-r)+Math.abs(b-c)}));}
// This max-Manhattan heuristic is admissible: every remaining target must be reached on a complete route.
function search(origin,algo){const open=[{s:origin,g:0,f:algo==='astar'?heuristic(origin):0}];const dist=new Map([[k(origin),0]]),parents=new Map();let explored=0;
 while(open.length){if(algo==='astar')open.sort((a,b)=>a.f-b.f||a.g-b.g);const curr=open.shift();if(curr.g!==dist.get(k(curr.s)))continue;explored++;
 if(done(curr.s)){const route=[];let t=k(curr.s);while(parents.has(t)){const pr=parents.get(t);route.push(pr.p);t=pr.prev;}route.reverse();return {route,explored};}
 for(const p of adjacent(curr.s.p)){const ns=next(curr.s,p);if(p===goal&&ns.mask!==all)continue;const nk=k(ns),ng=curr.g+1;if(ng>=(dist.get(nk)??Infinity))continue;dist.set(nk,ng);parents.set(nk,{prev:k(curr.s),p});open.push({s:ns,g:ng,f:ng+(algo==='astar'?heuristic(ns):0)});}}
 return {route:null,explored};}
const current=()=>history[history.length-1];
function render(message){const s=current(),ended=done(s),seen=new Set(history.map(x=>x.p));board.replaceChildren();for(let p=0;p<64;p++){const b=document.createElement('button');b.type='button';b.className='cell';b.setAttribute('aria-label','Linha '+(rc(p)[0]+1)+', coluna '+(rc(p)[1]+1));if(walls.has(p))b.classList.add('wall');if(seen.has(p))b.classList.add('visited');if(path.includes(p))b.classList.add('path');if(p===hint)b.classList.add('hint');if(adjacent(s.p).includes(p)&&!ended)b.classList.add('target');if(p===s.p)b.classList.add('pos');b.textContent=p===s.p?'🤖':walls.has(p)?'■':boxes.includes(p)&&!(s.mask&(1<<boxes.indexOf(p)))?'📦':p===goal?'🏁':seen.has(p)?'·':'';b.disabled=ended||!adjacent(s.p).includes(p);b.addEventListener('click',()=>move(p));board.append(b);}
 $('movements').textContent=history.length-1;$('supplies').textContent=s.mask.toString(2).split('1').length-1+' / 3';$('status').textContent=ended?'Missão concluída':'Em curso';$('undo').disabled=history.length===1;
 const optimum=search(s,'bfs');$('optimal').textContent=optimum.route?optimum.route.length:'—';if(message)$('explanation').textContent=message;
 if(ended)$('explanation').textContent='Missão concluída em '+(history.length-1)+' movimentos. Recolheste todos os recursos antes de chegar ao destino.';
}
function move(p){const s=current();if(!adjacent(s.p).includes(p)||done(s))return;if(p===goal&&s.mask!==all){render('Ainda faltam recursos. Recolhe as três caixas antes de entrares no destino.');return;}history.push(next(s,p));hint=-1;path=[];$('remaining').textContent='—';$('expanded').textContent='—';render('Movimento válido. Podes continuar ou consultar uma sugestão de pesquisa.');}
function analyze(mode){const s=current(),algo=$('algorithm').value,res=search(s,algo);$('expanded').textContent=res.explored;$('remaining').textContent=res.route?.length??'—';if(!res.route){render('Não foi encontrada uma solução para esta configuração.');return;}
 if(mode==='hint'){hint=res.route[0]??-1;path=[];render(res.route.length?'Sugestão: move-te para a casa destacada a amarelo. '+algo.toUpperCase()+' explorou '+res.explored+' estados.':'Já cumpriste a missão.');}
 else if(mode==='path'){path=res.route;hint=-1;render('Percurso proposto com '+res.route.length+' movimentos. As casas destacadas representam as posições da rota.');}
 else {for(const p of res.route){if(p===goal&&current().mask!==all)break;history.push(next(current(),p));}hint=-1;path=[];render('O agente seguiu uma solução demonstrativa com '+res.route.length+' movimentos, calculada a partir do estado selecionado.');}}
 $('suggest').addEventListener('click',()=>analyze('hint'));$('solve').addEventListener('click',()=>analyze('path'));$('autoplay').addEventListener('click',()=>analyze('auto'));
 $('reset').addEventListener('click',()=>{history=[{p:start,mask:0}];hint=-1;path=[];$('expanded').textContent='—';$('remaining').textContent='—';render('Missão reiniciada. Escolhe uma casa adjacente para começar.');});
 $('undo').addEventListener('click',()=>{if(history.length>1)history.pop();hint=-1;path=[];$('expanded').textContent='—';$('remaining').textContent='—';render('Última jogada anulada.');});
 render();
})();
