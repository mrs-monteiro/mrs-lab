/* MRS MONTEIRO Interactive Lab — Consolidação didática v3
   Módulo original, sem dependências: não altera a lógica de BFS/A*.
   Complementa passos.js, substituindo clareza.js (não carregar ambos).
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stepBox = document.querySelector('.mrs-steps');
  const grid = $('grid');
  const automaticMetrics = document.querySelector('#searchlab .metrics');
  if (!stepBox || !grid || !automaticMetrics || $('mrs-final-panel')) return;
  const tr = (pt,en) => document.documentElement.lang === 'en' ? en : pt;
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
  const style = document.createElement('style');
  style.textContent = `
    .mrs-final-panel{margin:14px 0 18px;padding:15px 17px;border-radius:12px;background:#0b2030;border:1px solid #345669}
    .mrs-final-panel h3{font-size:14px;color:#80dfd0;margin:0 0 7px}
    .mrs-final-panel p{font-size:13px;line-height:1.6;color:#d7e8ed;margin:0}
    .mrs-final-panel .mrs-final-details{margin-top:10px;color:#a7c5d2;font-size:12px}
    .mrs-final-panel .mrs-final-report{margin-top:13px;border-top:1px solid #345669;padding-top:12px;display:none}
    .mrs-final-panel .mrs-final-report[aria-hidden="false"]{display:block}
    .mrs-auto-caption{color:#80dfd0;font-weight:700;font-size:13px;margin:20px 0 5px}
    .mrs-auto-note{color:#9eb1c3;font-size:12px;margin:0 0 12px}
    .mrs-final-panel strong{color:#ebf9ff}
  `;
  document.head.appendChild(style);
  const panel = document.createElement('section');
  panel.id = 'mrs-final-panel';
  panel.className = 'mrs-final-panel';
  panel.setAttribute('aria-label','Análise da execução');
  panel.innerHTML = '<h3 id="mrs-final-heading"></h3><p id="mrs-final-explain" aria-live="polite"></p><div class="mrs-final-details" id="mrs-final-details"></div><div class="mrs-final-report" id="mrs-final-report" aria-hidden="true"></div>';
  stepBox.appendChild(panel);
  const caption = document.createElement('h3');
  caption.className='mrs-auto-caption';
  const note=document.createElement('p');
  note.className='mrs-auto-note';
  automaticMetrics.parentElement.insertBefore(caption,automaticMetrics);
  automaticMetrics.parentElement.insertBefore(note,automaticMetrics);
  const report=$('mrs-final-report');
  const count=$('mrs-step-count');
  const node=$('mrs-step-node');
  const frontier=$('mrs-step-frontier');
  const explored=$('mrs-step-explored');
  const message=$('mrs-step-message');
  const algo=$('algorithm');
  let live = false;
  const getMap=()=>document.querySelector('.mrs-map-preset.active')?.textContent.trim() || tr('Mapa personalizado','Custom map');
  const getAlgo=()=>algo.value==='astar'?'A*':'BFS';
  const getCurrentCoord=()=>node.textContent.trim();
  const getSummary=()=>{
    const value=count.textContent.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    return value ? {step:+value[1],total:+value[2],done:+value[1]===+value[2] && +value[2]>0} : null;
  };
  const asInt=id=>Number($(id).textContent.trim());
  const finalPath=()=>[...grid.querySelectorAll('.mrs-step-route')].length + 1;
  function clearReport(){report.setAttribute('aria-hidden','true'); report.textContent='';}
  function render(){
    caption.textContent=tr('Resultados da execução automática','Automatic execution results');
    note.textContent=tr('Estes indicadores são atualizados apenas por «Executar pesquisa» e não representam o modo passo a passo.','These indicators update only when you select “Run search”; they do not describe step-by-step execution.');
    const value=getSummary();
    $('mrs-final-heading').textContent=tr('Leitura da decisão','Understanding each decision');
    if(!value || !live){
      $('mrs-final-explain').textContent=tr('Escolhe um mapa e um algoritmo. Clica em «Preparar pesquisa» para iniciar a análise didática.','Choose a map and algorithm. Select “Prepare search” to begin the explanation.');
      $('mrs-final-details').textContent='';
      clearReport(); return;
    }
    const {step,total,done}=value;
    const f=asInt('mrs-step-frontier'),n=asInt('mrs-step-explored');
    if(step===0){
      $('mrs-final-explain').textContent=tr('A fronteira contém o nó inicial. No próximo passo será removido e os vizinhos transitáveis ainda não descobertos serão acrescentados.','The frontier contains only the start node. Next, it will be expanded and newly discovered walkable neighbors will enter the frontier.');
    } else if(!done){
      const base = algo.value==='bfs' ?
        tr(`Passo ${step}: BFS remove o nó ${getCurrentCoord()} da fila FIFO e examina os vizinhos ainda não descobertos.`,`Step ${step}: BFS removes node ${getCurrentCoord()} from its FIFO queue and examines undiscovered neighbors.`) :
        tr(`Passo ${step}: A* expande o nó ${getCurrentCoord()}, escolhido pela prioridade f(n)=g(n)+h(n), com h de Manhattan.`,`Step ${step}: A* expands node ${getCurrentCoord()}, selected by priority f(n)=g(n)+h(n) using Manhattan distance.`);
      $('mrs-final-explain').textContent=base;
    } else {
      const found = grid.querySelectorAll('.mrs-step-route').length>0 || /encontrad|found/i.test(message.textContent);
      $('mrs-final-explain').textContent=found ?
        tr('Objetivo alcançado. O percurso verde representa a solução encontrada; a pesquisa termina sem precisar de esvaziar toda a fronteira.','Goal reached. The green path is the discovered solution; the search may stop before the frontier is empty.') :
        tr('Pesquisa concluída sem percurso. Todos os estados alcançáveis foram analisados sem encontrar o destino.','Search ended without a path. All reachable states were expanded without reaching the destination.');
      const cost=found?finalPath():'—';
      report.setAttribute('aria-hidden','false');
      report.innerHTML=`<h3>${esc(tr('Resumo final','Final summary'))}</h3><p><strong>${esc(getAlgo())}</strong> · ${esc(getMap())} · ${esc(tr('Estados explorados','Explored states'))}: <strong>${n}</strong> · ${esc(tr('Custo','Cost'))}: <strong>${cost}</strong> · ${esc(found?tr('Encontrado','Found'):tr('Sem percurso','No path'))}</p>`;
    }
    $('mrs-final-details').textContent=tr(`Nó: ${getCurrentCoord()} · Fronteira: ${f} · Estados explorados: ${n} · Passo ${step} de ${total}.`,`Node: ${getCurrentCoord()} · Frontier: ${f} · Explored states: ${n} · Step ${step} of ${total}.`);
    if(!done)clearReport();
  }
  function reset(){live=false;render();}
  const prep=$('mrs-step-prepare');
  prep.addEventListener('click',()=>{live=true;queueMicrotask(render);});
  for(const id of ['mrs-step-next','mrs-step-prev','mrs-step-end']) $(id).addEventListener('click',()=>queueMicrotask(render));
  for(const id of ['mrs-step-exit','reset','sample','run']) $(id)?.addEventListener('click',()=>queueMicrotask(reset));
  algo.addEventListener('change',reset);
  grid.addEventListener('click',()=>queueMicrotask(reset));
  // O mapa é aplicado por uma extensão separada; limpar texto antes da aplicação.
  document.addEventListener('click',e=>{if(e.target.closest('[data-map]'))queueMicrotask(reset)},true);
  document.addEventListener('mrs:language',()=>queueMicrotask(render));
  render();
})();
