/* MRS Interactive Lab — Mapas de Pesquisa v1
   Extensão independente de lab/js/lab.js: não altera os algoritmos.
   Aplique apenas a páginas que tenham os elementos originais #grid, #mode e #reset.
*/
(() => {
  'use strict';
  const W = 19, H = 12;
  const grid = document.querySelector('#grid');
  const mode = document.querySelector('#mode');
  const reset = document.querySelector('#reset');
  const controls = document.querySelector('#searchlab .controls');
  if (!grid || !mode || !reset || !controls) return;

  const tr = (pt, en) => document.documentElement.lang === 'en' ? en : pt;
  const index = (x, y) => y * W + x;
  const clickCell = (x, y) => {
    const cell = grid.querySelector(`[data-cell="${index(x, y)}"]`);
    if (cell) cell.click();
  };
  const presets = {
    city: {
      label: ['Cidade', 'City'],
      desc: ['Ruas e quarteirões com passagens alternativas.', 'Streets and blocks with alternative crossings.'],
      start: [1, 10], goal: [17, 1],
      walls() {
        const cells = [];
        for (const x of [5, 11, 15]) {
          for (let y = 1; y < 11; y++) {
            if ((x === 5 && [3, 8].includes(y)) ||
                (x === 11 && [2, 7].includes(y)) ||
                (x === 15 && [4, 9].includes(y))) continue;
            cells.push([x, y]);
          }
        }
        for (let x = 2; x <= 17; x++) {
          if ([4, 8, 12, 16].includes(x)) continue;
          cells.push([x, 5]);
        }
        return cells;
      }
    },
    maze: {
      label: ['Labirinto', 'Maze'],
      desc: ['Corredores com desvios que obrigam a explorar alternativas.', 'Corridors and detours that require exploring alternatives.'],
      start: [1, 10], goal: [17, 1],
      walls() {
        const cells = [];
        for (let k = 0; k < 5; k++) {
          const x = 3 + k * 3;
          const opening = k % 2 === 0 ? [1, 2] : [9, 10];
          for (let y = 1; y <= 10; y++) {
            if (!opening.includes(y)) cells.push([x, y]);
          }
        }
        return cells;
      }
    },
    blocked: {
      label: ['Sem solução', 'No solution'],
      desc: ['Uma barreira separa o início do destino: não existe percurso.', 'A barrier separates the start and goal: no path exists.'],
      start: [1, 10], goal: [17, 1],
      walls() { return Array.from({length: W}, (_, x) => [x, 6]); }
    }
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'mrs-map-presets';
  wrapper.setAttribute('aria-label', tr('Cenários de pesquisa', 'Pathfinding scenarios'));
  wrapper.innerHTML = `
    <div class="mrs-map-presets__head">
      <strong data-pt="Mapas de pesquisa" data-en="Search maps">${tr('Mapas de pesquisa', 'Search maps')}</strong>
      <span data-pt="Escolhe um cenário e executa BFS ou A*." data-en="Choose a scenario and run BFS or A*.">${tr('Escolhe um cenário e executa BFS ou A*.', 'Choose a scenario and run BFS or A*.')}</span>
    </div>
    <div class="mrs-map-presets__buttons" role="group" aria-label="Map presets"></div>
    <p class="mrs-map-presets__help" aria-live="polite"></p>`;
  controls.parentNode.insertBefore(wrapper, controls);
  const buttons = wrapper.querySelector('.mrs-map-presets__buttons');
  const help = wrapper.querySelector('.mrs-map-presets__help');
  let selected = null;

  function renderLabels() {
    wrapper.querySelectorAll('[data-pt][data-en]').forEach(el => {
      el.textContent = el.dataset[document.documentElement.lang === 'en' ? 'en' : 'pt'];
    });
    for (const [key, cfg] of Object.entries(presets)) {
      const btn = buttons.querySelector(`[data-map="${key}"]`);
      if (btn) btn.textContent = tr(...cfg.label);
    }
    if (selected) help.textContent = tr(...presets[selected].desc);
  }

  function applyPreset(key) {
    const cfg = presets[key];
    if (!cfg) return;
    // O reset original limpa a pesquisa, obstáculos, início e destino.
    reset.click();
    const old = mode.value;
    mode.value = 'start'; clickCell(...cfg.start);
    mode.value = 'goal'; clickCell(...cfg.goal);
    mode.value = 'wall';
    const seen = new Set();
    for (const [x, y] of cfg.walls()) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      if ((x === cfg.start[0] && y === cfg.start[1]) ||
          (x === cfg.goal[0] && y === cfg.goal[1])) continue;
      const id = index(x, y);
      if (seen.has(id)) continue;
      seen.add(id);
      clickCell(x, y);
    }
    mode.value = old;
    selected = key;
    buttons.querySelectorAll('button').forEach(btn => {
      const active = btn.dataset.map === key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    help.textContent = tr(...cfg.desc);
  }

  for (const [key, cfg] of Object.entries(presets)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mrs-map-preset';
    btn.dataset.map = key;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = tr(...cfg.label);
    btn.addEventListener('click', () => applyPreset(key));
    buttons.appendChild(btn);
  }

  document.addEventListener('mrs:language', renderLabels);
  renderLabels();
  // Não aplica um mapa automaticamente: preserva o exemplo original ao entrar no separador.
})();
