/* MRS Interactive Lab — Clareza Didática v2
 * Complemento não intrusivo: não modifica os algoritmos, mapas ou exercícios.
 * Carregar DEPOIS de lab/js/passos.js.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panel = document.querySelector('.mrs-steps');
  const autoMetrics = document.querySelector('#searchlab .metrics');
  const counter = $('mrs-step-count');
  const message = $('mrs-step-message');
  if (!panel || !autoMetrics || !counter || !message || panel.querySelector('.mrs-learning-v2')) return;
  const en = () => document.documentElement.lang === 'en';
  const t = (pt, eng) => en() ? eng : pt;
  const safe = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
  const style = document.createElement('style');
  style.textContent = `
    .mrs-learning-v2{border-top:1px solid var(--line,#263c50);margin-top:15px;padding-top:13px}
    .mrs-learning-v2 h3{font-size:14px;color:var(--accent,#80dfd0);margin:0 0 9px}
    .mrs-learning-v2__explain{font-size:13px;line-height:1.6;color:#d8e9ef;margin:0 0 12px}
    .mrs-learning-v2__summary{padding:12px 14px;background:#0a1d2d;border:1px solid #32576a;border-radius:11px}
    .mrs-learning-v2__summary strong{display:block;color:#a1eadf;font-size:13px;margin-bottom:6px}
    .mrs-learning-v2__summary p{font-size:13px;color:#dce9ef;margin:0;line-height:1.65}
    .mrs-automatic-v2{font-weight:700;color:var(--accent,#80dfd0);font-size:13px;margin:20px 0 8px}
    .mrs-automatic-v2__help{display:block;color:var(--muted,#9eb1c3);font-size:12px;font-weight:400;margin-top:3px}
    .mrs-steps__metrics>div{min-width:0;overflow-wrap:anywhere}
  `;
  document.head.appendChild(style);
  const educational = document.createElement('div');
  educational.className = 'mrs-learning-v2';
  educational.innerHTML = '<h3 id="mrs-learning-v2-title"></h3><p class="mrs-learning-v2__explain" id="mrs-learning-v2-explain"></p><div class="mrs-learning-v2__summary" id="mrs-learning-v2-summary" hidden><strong id="mrs-learning-v2-summary-title"></strong><p id="mrs-learning-v2-summary-text"></p></div>';
  panel.appendChild(educational);
  const automatic = document.createElement('div');
  automatic.className = 'mrs-automatic-v2';
  automatic.id = 'mrs-automatic-v2';
  autoMetrics.parentNode.insertBefore(automatic, autoMetrics);

  function render() {
    const current = counter.textContent.trim();
    const count = current.match(/^(\d+)\s*\/\s*(\d+)$/);
    const algo = $('algorithm')?.value === 'astar' ? 'A*' : 'BFS';
    const map = document.querySelector('.mrs-map-preset.active')?.textContent.trim() || t('Mapa personalizado / exemplo','Custom map / example');
    const node = $('mrs-step-node')?.textContent.trim() || '—';
    const frontier = $('mrs-step-frontier')?.textContent.trim() || '—';
    const explored = $('mrs-step-explored')?.textContent.trim() || '—';
    $('mrs-learning-v2-title').textContent = t('Leitura da decisão', 'Understanding the decision');
    $('mrs-learning-v2-summary-title').textContent = t('Resumo da experiência', 'Experiment summary');
    automatic.innerHTML = `${t('Resultados da execução automática','Automatic execution results')}<span class="mrs-automatic-v2__help">${t('Estes valores só são atualizados por «Executar pesquisa». Não representam o modo passo a passo.','These values update only when you select «Run search». They do not represent step-by-step execution.')}</span>`;
    const summary = $('mrs-learning-v2-summary');
    const desc = $('mrs-learning-v2-explain');
    if (!count) {
      desc.textContent = t('Escolhe o mapa e o algoritmo e clica em «Preparar pesquisa». Os indicadores do painel superior serão atualizados de forma independente.','Choose the map and algorithm, then click «Prepare search». The upper-panel metrics update independently.');
      summary.hidden = true;
      return;
    }
    const step = Number(count[1]), max = Number(count[2]);
    const msg = message.textContent;
    const won = /Objetivo encontrado|Goal found/i.test(msg);
    const lost = /não existe percurso|no path exists/i.test(msg);
    const done = step === max && max > 0;
    if (step === 0) {
      desc.textContent = t(`Pesquisa ${algo} preparada no mapa ${map}. A fronteira contém inicialmente apenas o nó de partida; nenhum nó foi expandido.`,`${algo} search prepared on ${map}. The frontier initially contains only the starting node; no node has been expanded.`);
    } else if (done) {
      desc.textContent = won
        ? t(`O destino foi alcançado no passo ${step}. A pesquisa termina, mesmo que ainda existam ${frontier} nós na fronteira.`,`The goal was reached at step ${step}. Search stops even if ${frontier} frontier nodes remain.`)
        : t(`A pesquisa terminou depois de expandir ${explored} estados. A fronteira ficou esgotada sem alcançar o destino.`,`Search ended after expanding ${explored} states. The frontier was exhausted without reaching the destination.`);
    } else if (algo === 'BFS') {
      desc.textContent = t(`Passo ${step}: a BFS retira o próximo nó (${node}) da fila FIFO e analisa os seus vizinhos acessíveis ainda não descobertos. Há agora ${frontier} nós na fronteira e ${explored} estados explorados.`,`Step ${step}: BFS removes node ${node} from the FIFO queue and examines accessible undiscovered neighbors. There are now ${frontier} frontier nodes and ${explored} explored states.`);
    } else {
      desc.textContent = t(`Passo ${step}: A* expande o nó (${node}) com menor prioridade f(n) = g(n) + h(n), usando a distância Manhattan como heurística. Há ${frontier} nós na fronteira e ${explored} estados explorados.`,`Step ${step}: A* expands node ${node} with lowest priority f(n) = g(n) + h(n), using the Manhattan heuristic. There are ${frontier} frontier nodes and ${explored} explored states.`);
    }
    summary.hidden = !done;
    if (done) {
      const cost = msg.match(/(?:Custo mínimo:|Shortest path cost:)\s*(\d+)/i)?.[1];
      const outcome = won ? t('Encontrado','Found') : lost ? t('Sem percurso','No path') : t('Concluído','Complete');
      const costText = cost ?? '—';
      $('mrs-learning-v2-summary-text').textContent = t(`Algoritmo: ${algo} · Cenário: ${map} · Estados explorados: ${explored} · Custo: ${costText} · Resultado: ${outcome}.`,`Algorithm: ${algo} · Scenario: ${map} · Explored states: ${explored} · Cost: ${costText} · Result: ${outcome}.`);
    }
  }
  const observer = new MutationObserver(render);
  observer.observe(counter, {childList:true,characterData:true,subtree:true});
  observer.observe(message, {childList:true,characterData:true,subtree:true});
  document.addEventListener('mrs:language',render);
  document.querySelector('#searchlab')?.addEventListener('click',e=>{if(e.target.closest('[data-map]'))queueMicrotask(render)});
  render();
})();
