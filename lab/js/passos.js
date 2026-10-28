/* MRS Interactive Lab — Pesquisa passo a passo v1.
   Módulo independente: não modifica lab.js nem mapas.js.
   Funciona na grelha de 19x12 com movimentos ortogonais de custo unitário.
*/
(() => {
  'use strict';
  const W=19,H=12,N=W*H;
  const grid=document.getElementById('grid');
  const algorithm=document.getElementById('algorithm');
  const run=document.getElementById('run');
  const reset=document.getElementById('reset');
  const sample=document.getElementById('sample');
  const controls=document.querySelector('#searchlab .controls');
  if(!grid||!algorithm||!run||!reset||!sample||!controls)return;
  const t=(pt,en)=>document.documentElement.lang==='en'?en:pt;
  const pos=i=>[i%W,Math.floor(i/W)];
  const h=(i,g)=>{const [x,y]=pos(i),[a,b]=pos(g);return Math.abs(x-a)+Math.abs(y-b)};
  const neighbors=(i,walls)=>{const[x,y]=pos(i);return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&a<W&&b>=0&&b<H).map(([a,b])=>b*W+a).filter(j=>!walls.has(j))};
  const box=document.createElement('section');
  box.className='mrs-steps';
  box.setAttribute('aria-label','Execução passo a passo');
  box.innerHTML=`
    <div class="mrs-steps__heading"><strong data-pt="Execução passo a passo" data-en="Step-by-step execution">Execução passo a passo</strong><span data-pt="Observa a fronteira, o nó atual e a decisão do algoritmo." data-en="Observe the frontier, current node and algorithm decision.">Observa a fronteira, o nó atual e a decisão do algoritmo.</span></div>
    <div class="mrs-steps__buttons">
      <button type="button" id="mrs-step-prepare" data-pt="Preparar pesquisa" data-en="Prepare search">Preparar pesquisa</button>
      <button type="button" id="mrs-step-prev" disabled data-pt="← Anterior" data-en="← Previous">← Anterior</button>
      <button type="button" id="mrs-step-next" disabled data-pt="Próximo →" data-en="Next →">Próximo →</button>
      <button type="button" id="mrs-step-end" disabled data-pt="Ver resultado" data-en="Show result">Ver resultado</button>
      <button type="button" id="mrs-step-exit" disabled data-pt="Sair do modo passo a passo" data-en="Exit step-by-step mode">Sair do modo passo a passo</button>
    </div>
    <div class="mrs-steps__metrics"><div><small data-pt="Passo" data-en="Step">Passo</small><strong id="mrs-step-count">—</strong></div><div><small data-pt="Nó atual" data-en="Current node">Nó atual</small><strong id="mrs-step-node">—</strong></div><div><small data-pt="Nós na fronteira" data-en="Frontier nodes">Nós na fronteira</small><strong id="mrs-step-frontier">—</strong></div><div><small data-pt="Explorados" data-en="Explored">Explorados</small><strong id="mrs-step-explored">—</strong></div></div>
    <p class="mrs-steps__message" id="mrs-step-message" role="status" aria-live="polite" data-pt="Escolhe um mapa e um algoritmo. Depois clica em Preparar pesquisa." data-en="Choose a map and algorithm, then click Prepare search.">Escolhe um mapa e um algoritmo. Depois clica em Preparar pesquisa.</p>
    <p class="mrs-steps__note" data-pt="Azul-claro: fronteira · Amarelo: nó atual · Verde: percurso final. Os resultados podem diferir na ordem de expansão face ao modo automático quando existem empates." data-en="Light blue: frontier · Yellow: current node · Green: final route. Expansion order may differ from automatic mode on ties.">Azul-claro: fronteira · Amarelo: nó atual · Verde: percurso final. Os resultados podem diferir na ordem de expansão face ao modo automático quando existem empates.</p>`;
  controls.parentNode.insertBefore(box,controls.nextSibling);
  const $=id=>document.getElementById(id);
  const bPrep=$('mrs-step-prepare'),bPrev=$('mrs-step-prev'),bNext=$('mrs-step-next'),bEnd=$('mrs-step-end'),bExit=$('mrs-step-exit');
  let states=null,step=0;

  function readBoard(){
    const cells=[...grid.querySelectorAll('[data-cell]')];
    if(cells.length!==N)throw new Error('Grelha inesperada');
    const walls=new Set(),starts=[],goals=[];
    for(const cell of cells){const id=Number(cell.dataset.cell);if(!Number.isInteger(id)||id<0||id>=N)continue;
      if(cell.classList.contains('wall'))walls.add(id);
      if(cell.classList.contains('start'))starts.push(id);
      if(cell.classList.contains('goal'))goals.push(id);
    }
    if(starts.length!==1||goals.length!==1)throw new Error('Início ou destino inválidos');
    walls.delete(starts[0]);walls.delete(goals[0]);
    return{walls,start:starts[0],goal:goals[0]};
  }
  function simulate(board,algo){
    const{start,goal,walls}=board;
    const open=[start],openSet=new Set([start]),closed=new Set(),dist=new Map([[start,0]]),parent=new Map([[start,null]]),frames=[];
    let found=false;
    while(open.length){
      if(algo==='astar')open.sort((a,b)=>(dist.get(a)+h(a,goal))-(dist.get(b)+h(b,goal))||h(a,goal)-h(b,goal)||a-b);
      const node=open.shift();openSet.delete(node);
      if(closed.has(node))continue;
      closed.add(node);
      if(node===goal){found=true;frames.push({node,closed:[...closed],frontier:[...openSet],found:true});break}
      for(const next of neighbors(node,walls)){
        if(closed.has(next))continue;
        const candidate=dist.get(node)+1;
        if(!dist.has(next)||candidate<dist.get(next)){
          dist.set(next,candidate);parent.set(next,node);
          if(!openSet.has(next)){open.push(next);openSet.add(next)}
        }
      }
      frames.push({node,closed:[...closed],frontier:[...openSet],found:false});
    }
    const path=[];
    if(found){let x=goal;while(x!==null){path.push(x);x=parent.get(x)}path.reverse()}
    return{frames,path,found,algo};
  }
  function cleanVisual(){
    for(const el of grid.querySelectorAll('[data-cell]'))el.classList.remove('mrs-step-current','mrs-step-frontier','mrs-step-seen','mrs-step-route');
  }
  function paint(){
    if(!states)return;
    cleanVisual();
    const frame=step>0?states.frames[step-1]:null;
    const done=step===states.frames.length;
    const explored=new Set(frame?frame.closed:[]);
    const frontier=new Set(frame?frame.frontier:[]);
    const route=new Set(done?states.path:[]);
    for(const cell of grid.querySelectorAll('[data-cell]')){
      const id=Number(cell.dataset.cell);
      if(cell.classList.contains('start')||cell.classList.contains('goal')||cell.classList.contains('wall'))continue;
      if(route.has(id))cell.classList.add('mrs-step-route');
      else if(frame?.node===id)cell.classList.add('mrs-step-current');
      else if(frontier.has(id))cell.classList.add('mrs-step-frontier');
      else if(explored.has(id))cell.classList.add('mrs-step-seen');
    }
    $('mrs-step-count').textContent=step+' / '+states.frames.length;
    $('mrs-step-node').textContent=frame?'('+pos(frame.node).join(', ')+')':'—';
    $('mrs-step-frontier').textContent=frame?String(frame.frontier.length):'1';
    $('mrs-step-explored').textContent=frame?String(frame.closed.length):'0';
    bPrev.disabled=step===0;bNext.disabled=done;bEnd.disabled=done;bExit.disabled=false;
    $('mrs-step-message').textContent=step===0?t('Pesquisa preparada. Clica em Próximo para expandir o primeiro nó.','Search ready. Click Next to expand the first node.'):
      done?(states.found?t('Objetivo encontrado! Custo mínimo: ','Goal found! Shortest path cost: ')+(states.path.length-1)+'.':t('Pesquisa concluída: não existe percurso.','Search complete: no path exists.')):
      (states.algo==='bfs'?t('BFS: expande pela ordem da fila FIFO.','BFS: expands in FIFO queue order.'):t('A*: escolhe a menor prioridade f(n)=g(n)+h(n).','A*: chooses the lowest priority f(n)=g(n)+h(n).'))+' '+t('Nó explorado: ','Expanded node: ')+pos(frame.node).join(', ')+'.';
  }
  function exit(silent=false){
    states=null;step=0;cleanVisual();
    bPrev.disabled=true;bNext.disabled=true;bEnd.disabled=true;bExit.disabled=true;
    ['mrs-step-count','mrs-step-node','mrs-step-frontier','mrs-step-explored'].forEach(id=>$(id).textContent='—');
    if(!silent)$('mrs-step-message').textContent=t('Modo passo a passo terminado. O modo automático continua disponível.','Step-by-step mode closed. Automatic execution remains available.');
  }
  bPrep.addEventListener('click',()=>{
    try{
      // Não usar o botão Limpar: isso eliminaria os obstáculos do mapa selecionado.
      if(run.disabled){$('mrs-step-message').textContent=t('Aguarda que a execução automática termine.','Wait until the automatic run finishes.');return}
      const board=readBoard();
      for(const cell of grid.querySelectorAll('[data-cell]'))cell.classList.remove('checked','route');
      states=simulate(board,algorithm.value);step=0;paint();
    }catch(err){exit(true);$('mrs-step-message').textContent=t('Não foi possível preparar a grelha.','Could not prepare the grid.')}
  });
  bPrev.addEventListener('click',()=>{if(states&&step>0){step--;paint()}});
  bNext.addEventListener('click',()=>{if(states&&step<states.frames.length){step++;paint()}});
  bEnd.addEventListener('click',()=>{if(states){step=states.frames.length;paint()}});
  bExit.addEventListener('click',()=>exit());
  // Alterações a mapa, grelha e algoritmo invalidam uma simulação preparada.
  algorithm.addEventListener('change',()=>exit(true));
  grid.addEventListener('click',()=>{if(states)exit(true)});
  reset.addEventListener('click',()=>exit(true));
  sample.addEventListener('click',()=>exit(true));
  run.addEventListener('click',()=>exit(true));
  document.addEventListener('click',e=>{if(e.target.closest('[data-map]'))exit(true)},true);
  document.addEventListener('mrs:language',()=>{
    for(const el of box.querySelectorAll('[data-pt][data-en]'))el.textContent=el.dataset[document.documentElement.lang==='en'?'en':'pt'];
    if(states)paint();
  });
})();
