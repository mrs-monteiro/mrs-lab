'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const set = (id, value) => { $(id).textContent = String(value); };
  const el = (tag, cls, value) => { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = String(value); return node; };

  // 01. Exercises written for this laboratory; not a C compiler.
  const numerals = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  function roman() {
    const raw = $('roman-input').value; const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 1 || n > 3999) {
      set('roman-output', 'Número inválido'); set('roman-steps', 'Utiliza um inteiro entre 1 e 3999.'); return;
    }
    let remain = n, result = ''; const trace = [];
    for (const [value, mark] of numerals) {
      let count = 0;
      while (remain >= value) { remain -= value; result += mark; count++; }
      if (count) trace.push(`${value} → ${mark} × ${count} · restante ${remain}`);
    }
    set('roman-output', result); set('roman-steps', trace.join('\n'));
    set('roman-lesson', `O valor ${n} foi decomposto com ciclos, comparações e subtrações. Uma implementação em C pode seguir esta mesma estratégia.`);
  }
  function palindrome() {
    const text = $('pal-input').value.trim();
    const normal = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT').replace(/[^a-z0-9]/g, '');
    if (!normal) { set('pal-result', 'Texto inválido'); set('pal-steps', 'Introduz uma expressão com letras ou números.'); return; }
    const reversed = [...normal].reverse().join(''); const same = normal === reversed;
    set('pal-result', same ? '✓ É palíndromo' : '× Não é palíndromo');
    set('pal-steps', `Original normalizado: ${normal}\nOrdem inversa:          ${reversed}\nComparação: ${same ? 'iguais' : 'diferentes'}`);
  }
  $('roman-run').addEventListener('click', roman);
  $('pal-run').addEventListener('click', palindrome);
  $('roman-input').addEventListener('keydown', e => { if (e.key === 'Enter') roman(); });
  $('pal-input').addEventListener('keydown', e => { if (e.key === 'Enter') palindrome(); });
  roman(); palindrome();

  // 02. Fictional C++ object mission. Only fixed, whitelisted strings enter sample code.
  const scenarios = [
    { title: 'Portal de demonstração indisponível', description: 'Uma aplicação fictícia não responde aos pedidos dos utilizadores de teste.', priority: 'Alta', hint: 'Uma indisponibilidade generalizada merece prioridade alta.', action: 'Verificar disponibilidade' },
    { title: 'Atualização de perfil lenta', description: 'O perfil abre, mas demora mais do que seria esperado num cenário fictício.', priority: 'Média', hint: 'O serviço continua acessível; classifica o impacto como médio.', action: 'Medir tempo de resposta' },
    { title: 'Ícone desalinhado na página', description: 'Um pequeno detalhe visual não impede a utilização da aplicação fictícia.', priority: 'Baixa', hint: 'Sem impacto na função principal: a prioridade pode ser baixa.', action: 'Rever apresentação visual' }
  ];
  let missionIndex = 0, missionScore = 0, incident = null;
  function missionNew() {
    const spec = scenarios[missionIndex];
    incident = { priority: null, stage: 0, history: [], title: spec.title };
    set('mission-counter', `Missão ${missionIndex + 1} de ${scenarios.length}`);
    set('mission-title', spec.title); set('mission-description', spec.description);
    set('mission-feedback', `Primeiro, escolhe a prioridade. Dica: ${spec.hint}`);
    $('mission-next').hidden = true;
    missionRender();
  }
  function missionRender() {
    const stages = ['Por classificar', 'Classificado', 'Em análise', 'Resolvido', 'Encerrado'];
    set('mission-points', `${missionScore} / 300`);
    set('mission-state', stages[incident.stage]);
    set('mission-steps', `${incident.stage}/4 etapas`);
    $('mission-progress').setAttribute('aria-valuenow', String(missionIndex + (incident.stage === 4 ? 1 : 0)));
    $('mission-progress-fill').style.width = `${100 * (missionIndex + (incident.stage === 4 ? 1 : 0)) / scenarios.length}%`;
    document.querySelectorAll('[data-priority]').forEach(b => {
      b.disabled = incident.stage !== 0;
      b.setAttribute('aria-pressed', String(incident.priority === b.dataset.priority));
    });
    $('mission-diagnose').disabled = incident.stage !== 1;
    $('mission-fix').disabled = incident.stage !== 2;
    $('mission-close').disabled = incident.stage !== 3;
    const attrs = {
      classe: 'Incidente', titulo: incident.title,
      prioridade: incident.priority || 'Por definir', estado: stages[incident.stage],
      metodosInvocados: incident.history.map(a => a.method)
    };
    set('mission-object', JSON.stringify(attrs, null, 2));
    const escapes = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const code = `#include <iostream>\n#include <string>\n\nclass Incidente {\nprivate:\n    std::string titulo;\n    std::string prioridade = "Por definir";\n    std::string estado = "Novo";\npublic:\n    explicit Incidente(const std::string& t) : titulo(t) {}\n    void definirPrioridade(const std::string& p) { prioridade = p; estado = "Classificado"; }\n    void analisar() { estado = "Em análise"; }\n    void resolver() { estado = "Resolvido"; }\n    void encerrar() { estado = "Encerrado"; }\n    void mostrar() const { std::cout << titulo << " | " << prioridade << " | " << estado << "\\n"; }\n};\n\nint main() {\n    Incidente item("${escapes(incident.title)}");\n${incident.history.map(a => '    item.' + a.method + '; // ' + a.note).join('\n')}${incident.history.length ? '\n' : ''}    item.mostrar();\n    return 0;\n}`;
    set('mission-code', code);
    const lesson = [
      'O objeto acabou de ser criado. A classe descreve a estrutura, mas ainda não foram chamados métodos.',
      'Atributo atualizado: prioridade. O método definirPrioridade modifica o estado interno.',
      'O método analisar altera o estado do objeto. Os métodos representam comportamentos.',
      'O método resolver representa uma nova transição de estado, mantendo os atributos no mesmo objeto.',
      'O método encerrar conclui o ciclo de vida da instância.'
    ];
    set('mission-explain', lesson[incident.stage]);
  }
  document.querySelectorAll('[data-priority]').forEach(button => button.addEventListener('click', () => {
    if (incident.stage !== 0) return;
    const selected = button.dataset.priority, spec = scenarios[missionIndex];
    if (selected !== spec.priority) { set('mission-feedback', `Ainda não: ${spec.hint} Experimenta outra prioridade.`); return; }
    incident.priority = selected; incident.stage = 1;
    incident.history.push({ method: `definirPrioridade("${selected}")`, note: 'atualizar um atributo' });
    set('mission-feedback', 'Boa classificação! Agora usa «Analisar» e observa o método no código.'); missionRender();
  }));
  $('mission-diagnose').addEventListener('click', () => {
    if (incident.stage !== 1) return;
    incident.stage = 2; incident.history.push({ method: 'analisar()', note: 'iniciar análise' });
    set('mission-feedback', `Análise simulada: ${scenarios[missionIndex].action}. Segue-se «Resolver».`); missionRender();
  });
  $('mission-fix').addEventListener('click', () => {
    if (incident.stage !== 2) return;
    incident.stage = 3; incident.history.push({ method: 'resolver()', note: 'marcar como resolvido' });
    set('mission-feedback', 'O incidente fictício está resolvido. Falta encerrar.'); missionRender();
  });
  $('mission-close').addEventListener('click', () => {
    if (incident.stage !== 3) return;
    incident.stage = 4; incident.history.push({ method: 'encerrar()', note: 'terminar ciclo de vida' });
    missionScore += 100; missionRender();
    set('mission-feedback', missionIndex === scenarios.length - 1 ? '🏆 Concluíste as três missões! Podes repetir o jogo.' : '✓ Missão concluída! Avança para o próximo incidente.');
    $('mission-next').hidden = missionIndex === scenarios.length - 1;
  });
  $('mission-next').addEventListener('click', () => { if (incident.stage !== 4 || missionIndex >= scenarios.length - 1) return; missionIndex++; missionNew(); });
  $('mission-reset').addEventListener('click', () => { missionIndex = 0; missionScore = 0; missionNew(); });
  $('mission-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('mission-code').textContent); set('mission-explain', 'Código educativo copiado. Não contém dados empresariais nem classes académicas.'); }
    catch { set('mission-explain', 'A cópia automática pode não funcionar neste contexto. Seleciona o texto para copiar.'); }
  });
  missionNew();

  // Shared, bounded interval controls; never evaluate user input as code.
  let pdaTimer = null, tmTimer = null;
  const stopPda = () => { if (pdaTimer !== null) clearInterval(pdaTimer); pdaTimer = null; $('pda-stop').disabled = true; };
  const stopTm = () => { if (tmTimer !== null) clearInterval(tmTimer); tmTimer = null; $('tm-stop').disabled = true; };
  // 03. Deterministic pushdown automata for two explicitly delimited educational languages.
  let pda = null;
  function pdaPrepare() {
    stopPda(); const mode = $('pda-mode').value, word = $('pda-input').value.trim();
    const valid = word.length >= 1 && word.length <= 30 && (mode === 'balanced' ? /^[()]+$/.test(word) : /^[ab]+$/.test(word));
    pda = { mode, word: valid ? word : '', i: 0, state: 'q0', stack: ['Z'], done: !valid, trace: [], rule: '—' };
    if (mode === 'balanced') {
      document.querySelector('[data-pda-node="q0"]').textContent = 'q0 · Ler ( ou )';
      document.querySelector('[data-pda-node="q1"]').textContent = 'Pilha · Guardar';
    } else {
      document.querySelector('[data-pda-node="q0"]').textContent = 'q0 · Ler a';
      document.querySelector('[data-pda-node="q1"]').textContent = 'q1 · Ler b';
    }
    set('pda-feedback', valid ? 'Pronto. Executa um passo para ler o primeiro símbolo.' : 'Entrada inválida para o modo escolhido (1 a 30 caracteres).');
    pdaRender();
  }
  function pdaRender() {
    set('pda-state', pda.state); set('pda-position', `${pda.i}/${pda.word.length}`); set('pda-rule', `Regra aplicada: ${pda.rule}`);
    const input = $('pda-word'); input.replaceChildren();
    [...pda.word].forEach((symbol, i) => input.append(el('span', i < pda.i ? 'seen' : i === pda.i && !pda.done ? 'current' : '', symbol)));
    const stack = $('pda-stack'); stack.replaceChildren();
    [...pda.stack].reverse().forEach(sym => stack.append(el('span', '', sym)));
    set('pda-top', pda.stack.at(-1) || '∅');
    const history = $('pda-trace'); history.replaceChildren();
    (pda.trace.length ? pda.trace.slice(-9) : ['Sem transições executadas.']).forEach(line => history.append(el('p', '', line)));
    document.querySelectorAll('[data-pda-node]').forEach(node => {
      node.classList.toggle('current', node.dataset.pdaNode === pda.state);
      node.classList.toggle('reached', pda.state === 'qf' && node.dataset.pdaNode === 'qf');
    });
    $('pda-step').disabled = pda.done; $('pda-run').disabled = pda.done || pdaTimer !== null;
    if (pda.done) stopPda();
  }
  function pdaFinish(ok, reason) {
    pda.state = ok ? 'qf' : 'qr'; pda.done = true;
    pda.trace.push((ok ? 'ACEITE: ' : 'REJEITADO: ') + reason);
    set('pda-feedback', (ok ? '✓ ' : '× ') + reason); pdaRender();
  }
  function pdaStep() {
    if (!pda || pda.done) return;
    if (pda.i === pda.word.length) {
      const ok = pda.stack.length === 1 && (pda.mode === 'balanced' || pda.state === 'q1');
      pda.rule = 'ε → verificação final';
      pdaFinish(ok, ok ? 'entrada consumida e pilha na base Z.' : 'entrada terminou, mas a pilha ou o estado não satisfaz a linguagem.'); return;
    }
    const ch = pda.word[pda.i], step = pda.i + 1, top = pda.stack.at(-1);
    if (pda.mode === 'balanced') {
      if (ch === '(') { pda.stack.push('('); pda.rule = `δ(q0, (, ${top}) → empilhar (`; pda.trace.push(`Passo ${step}: «(» → empilhar (.`); }
      else if (ch === ')' && top === '(') { pda.stack.pop(); pda.rule = 'δ(q0, ), () → desempilhar ('; pda.trace.push(`Passo ${step}: «)» → retirar (.`); }
      else { pda.i++; pda.rule = 'não existe regra aplicável'; pdaFinish(false, `um parêntese fecha sem abertura correspondente na posição ${step}.`); return; }
    } else {
      if (ch === 'a' && pda.state === 'q0') { pda.stack.push('A'); pda.rule = 'δ(q0, a) → push A'; pda.trace.push(`Passo ${step}: a → empilhar A.`); }
      else if (ch === 'b' && ['q0', 'q1'].includes(pda.state) && top === 'A') { pda.stack.pop(); pda.state = 'q1'; pda.rule = 'δ(q0/q1, b, A) → pop A'; pda.trace.push(`Passo ${step}: b → retirar A.`); }
      else { pda.i++; pda.rule = 'transição inexistente'; pdaFinish(false, `o símbolo ${ch} não é permitido neste estado ou a pilha não tem A para retirar.`); return; }
    }
    pda.i++; set('pda-feedback', `Passo ${step} concluído. Consulta a regra e o topo da pilha.`); pdaRender();
  }
  $('pda-mode').addEventListener('change', () => { $('pda-input').value = $('pda-mode').value === 'balanced' ? '(()())' : 'aabb'; pdaPrepare(); });
  $('pda-prepare').addEventListener('click', pdaPrepare);
  $('pda-reset').addEventListener('click', pdaPrepare);
  $('pda-step').addEventListener('click', pdaStep);
  $('pda-run').addEventListener('click', () => {
    if (pda.done || pdaTimer !== null) return;
    pdaTimer = setInterval(pdaStep, 580); $('pda-stop').disabled = false; $('pda-run').disabled = true;
  });
  $('pda-stop').addEventListener('click', () => { stopPda(); pdaRender(); });
  $('pda-valid').addEventListener('click', () => { $('pda-input').value = $('pda-mode').value === 'balanced' ? '(()())' : 'aaabbb'; pdaPrepare(); });
  $('pda-invalid').addEventListener('click', () => { $('pda-input').value = $('pda-mode').value === 'balanced' ? '(()' : 'aab'; pdaPrepare(); });
  pdaPrepare();

  // 04. Bounded deterministic, one-tape Turing machine: two new instructional presets.
  const BLANK = '□';
  const presets = {
    invert: { name: 'Inversão de bits', input: '0101', rules: [
      { from: 'q0', read: '0', write: '1', move: 'R', next: 'q0' },
      { from: 'q0', read: '1', write: '0', move: 'R', next: 'q0' },
      { from: 'q0', read: BLANK, write: BLANK, move: 'S', next: 'qf' }
    ] },
    unary: { name: 'Incremento unário', input: '111', rules: [
      { from: 'q0', read: '1', write: '1', move: 'R', next: 'q0' },
      { from: 'q0', read: BLANK, write: '1', move: 'S', next: 'qf' }
    ] }
  };
  let tm = null, rules = [], lastRule = -1;
  function tmSetPreset() {
    stopTm(); const model = presets[$('tm-model').value];
    rules = model.rules.map(r => ({ ...r })); $('tm-input').value = model.input;
    set('tm-rule-feedback', 'Modelo educativo original carregado. Podes adicionar regras de treino.'); tmPrepare();
  }
  function tmPrepare() {
    stopTm(); const model = $('tm-model').value, input = $('tm-input').value.trim();
    const valid = input.length >= 1 && input.length <= 20 && (model === 'unary' ? /^1+$/.test(input) : /^[01]+$/.test(input));
    const cells = new Map([...input].map((symbol, i) => [i, symbol]));
    tm = { cells, input, head: 0, state: 'q0', steps: 0, done: !valid, trace: [], outcome: valid ? 'Preparado' : 'Entrada inválida' };
    lastRule = -1;
    set('tm-feedback', valid ? 'Pronto. A cabeça está na primeira célula da fita.' : 'Para este modelo, utiliza apenas os símbolos permitidos (máximo 20).');
    tmRender();
  }
  function cellAt(i) { return tm.cells.get(i) || BLANK; }
  function tmRender() {
    set('tm-state', tm.state); set('tm-count', `${tm.steps} / 120 passos`); set('tm-status', tm.outcome);
    const tape = $('tm-tape'); tape.replaceChildren();
    const extent = tm.cells.size ? Math.max(...tm.cells.keys()) : 0;
    const start = Math.max(-20, Math.min(-2, tm.head - 3));
    const end = Math.min(20, Math.max(extent + 2, tm.head + 3));
    for (let i = start; i <= end; i++) {
      const node = el('span', 'square' + (i === tm.head ? ' head' : ''), cellAt(i));
      node.append(el('small', '', i)); node.setAttribute('aria-label', `Posição ${i}: ${cellAt(i)}${i === tm.head ? ', cabeça' : ''}`);
      tape.append(node);
    }
    const body = $('tm-rules'); body.replaceChildren();
    rules.forEach((rule, i) => {
      const tr = el('tr', i === lastRule ? 'current-rule' : '');
      [rule.from, rule.read, rule.write, rule.move === 'R' ? '→' : rule.move === 'L' ? '←' : '■', rule.next].forEach(value => tr.append(el('td', '', value)));
      body.append(tr);
    });
    const trace = $('tm-trace'); trace.replaceChildren();
    (tm.trace.length ? tm.trace.slice(-12) : ['Ainda não executaste nenhuma regra.']).forEach(line => trace.append(el('p', '', line)));
    $('tm-step').disabled = tm.done; $('tm-run').disabled = tm.done || tmTimer !== null;
    if (tm.done) stopTm();
  }
  function tmFinish(outcome, reason) {
    tm.done = true; tm.outcome = outcome; tm.trace.push(`${outcome}: ${reason}`);
    set('tm-feedback', reason); tmRender();
  }
  function tmStep() {
    if (tm.done) return;
    if (tm.steps >= 120) { tmFinish('Limite atingido', 'Execução interrompida ao atingir o limite de 120 passos.'); return; }
    const symbol = cellAt(tm.head), idx = rules.findIndex(r => r.from === tm.state && r.read === symbol);
    if (idx < 0) { tmFinish('Rejeitado', `Sem regra para δ(${tm.state}, ${symbol}).`); return; }
    const rule = rules[idx], nextHead = tm.head + (rule.move === 'R' ? 1 : rule.move === 'L' ? -1 : 0);
    if (nextHead < -20 || nextHead > 20) { tmFinish('Limite atingido', 'A cabeça tentou sair da fita de treino (−20 a 20).'); return; }
    if (rule.write === BLANK) tm.cells.delete(tm.head); else tm.cells.set(tm.head, rule.write);
    tm.trace.push(`Passo ${tm.steps + 1}: δ(${rule.from}, ${rule.read}) → ${rule.write}, ${rule.move}, ${rule.next}`);
    lastRule = idx; tm.head = nextHead; tm.state = rule.next; tm.steps++;
    set('tm-feedback', `A cabeça leu «${symbol}», escreveu «${rule.write}» e moveu-se ${rule.move === 'R' ? 'para a direita' : rule.move === 'L' ? 'para a esquerda' : 'zero posições'}.`);
    if (tm.state === 'qf') { tmFinish('Aceite', `Parou no estado final qf após ${tm.steps} passos.`); return; }
    if (tm.state === 'qr') { tmFinish('Rejeitado', `Parou no estado qr após ${tm.steps} passos.`); return; }
    tmRender();
  }
  $('tm-model').addEventListener('change', tmSetPreset);
  $('tm-load').addEventListener('click', tmPrepare);
  $('tm-reset').addEventListener('click', tmPrepare);
  $('tm-step').addEventListener('click', tmStep);
  $('tm-run').addEventListener('click', () => {
    if (tm.done || tmTimer !== null) return;
    tmTimer = setInterval(tmStep, 580); $('tm-stop').disabled = false; $('tm-run').disabled = true;
  });
  $('tm-stop').addEventListener('click', () => { stopTm(); tmRender(); });
  $('tm-default').addEventListener('click', tmSetPreset);
  $('tm-add-rule').addEventListener('click', () => {
    const from = $('tm-new-state').value.trim(), read = $('tm-new-read').value.trim(),
      write = $('tm-new-write').value.trim(), next = $('tm-new-next').value.trim(), move = $('tm-new-move').value;
    const stateValid = s => /^q(?:[0-9]|f|r)$/.test(s);
    const symbolValid = s => /^[01□]$/.test(s);
    if (!stateValid(from) || !stateValid(next) || !symbolValid(read) || !symbolValid(write) || !['L', 'R', 'S'].includes(move)) {
      set('tm-rule-feedback', 'Usa estados q0–q9, qf ou qr; símbolos 0, 1 ou □; movimentos L, R ou S.'); return;
    }
    if (['qf', 'qr'].includes(from)) { set('tm-rule-feedback', 'Não se criam regras de saída de estados finais.'); return; }
    if (rules.length >= 32) { set('tm-rule-feedback', 'Limite de 32 regras. Recarrega o modelo.'); return; }
    if (rules.some(r => r.from === from && r.read === read)) { set('tm-rule-feedback', `Já existe uma regra para δ(${from}, ${read}); um modelo determinístico só pode ter uma.`); return; }
    rules.push({ from, read, write, move, next });
    set('tm-rule-feedback', `Regra δ(${from}, ${read}) adicionada. Reinicia a fita para a experimentar.`); tmRender();
  });
  tmSetPreset();
})();
