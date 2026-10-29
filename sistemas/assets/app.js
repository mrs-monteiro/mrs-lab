/* MRS Systems Administration & Support Lab — interface original, PT-PT.
   Todas as ações operam apenas sobre dados fictícios. */
(() => {
  'use strict';
  const D = window.MRS_DATA;
  if (!D) return;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names = {
    inicio: 'Visão geral', terminal: 'PowerShell Academy', redes: 'Redes & Conectividade',
    diretorio: 'Active Directory Lab', incidentes: 'IT Troubleshooting',
    monitorizacao: 'Saúde da Infraestrutura', comandos: 'Biblioteca de comandos',
    ferramentas: 'Ferramentas externas', aprender: 'Percursos de estudo', visitas: 'Visitas ao portal',
    fontes: 'Projetos de referência'
  };
  const safeStorage = {
    get(key, fallback) { try { const val = JSON.parse(localStorage.getItem(key)); return val ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ } }
  };
  function go(page) {
    if (!(page in names)) page = 'inicio';
    $$('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.nav === page));
    $('#breadcrumb').textContent = names[page];
    if (window.location.hash !== `#${page}`) history.replaceState(null, '', `#${page}`);
    $('#sidebar').classList.remove('open');
    $('#mobile-shade').hidden = true;
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
    window.scrollTo({top:0,behavior:'instant'});
    if (page === 'terminal') $('#terminal-command').focus();
    if (page === 'visitas') loadVisits();
  }
  $$('[data-nav], [data-go]').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.nav || btn.dataset.go)));
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  $('#menu-toggle').addEventListener('click', () => {
    const opened = $('#sidebar').classList.toggle('open');
    $('#mobile-shade').hidden = !opened;
    $('#menu-toggle').setAttribute('aria-expanded', String(opened));
  });
  $('#mobile-shade').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#mobile-shade').hidden = true; });
  $('#n-commands').textContent = String(D.commands.length).padStart(2, '0');
  $('#n-incidents').textContent = String(D.incidents.length).padStart(2, '0');

  // PowerShell: parser estritamente de simulação, sem eval, shells ou rede.
  const output = $('#terminal-output');
  const normalize = s => String(s || '').trim().replace(/^PS\s+[^>]+>\s*/i,'').replace(/\s+/g,' ').toLowerCase();
  const aliases = new Map();
  D.commands.forEach(item => { aliases.set(normalize(item.cmd), item); aliases.set(normalize(item.example), item); });
  aliases.set('get-service -name spooler', D.commands.find(x => x.id === 'services'));
  aliases.set('resolve-dnsname app.lab.interno', D.commands.find(x => x.id === 'resolve'));
  function line(value, css = '') { const el = document.createElement('div'); el.className = css; el.textContent = value; output.append(el); }
  function runTerminal(text) {
    const cmd = String(text || '').trim();
    if (!cmd) return;
    line(`PS C:\\LAB> ${cmd}`, 'cmd');
    const n = normalize(cmd);
    if (n === 'clear' || n === 'cls') { output.replaceChildren(); return; }
    if (n === 'help' || n === '?') {
      line('Comandos reconhecidos:');
      D.commands.forEach(item => line(`  ${item.example}`));
      line('  help, clear, cls');
      line('A consola aceita só estes exemplos — não executa comandos reais.\n', 'hint');
    } else {
      const found = aliases.get(n);
      if (found) {
        line(found.out + '\n', 'answer');
        line(`Interpretação: ${found.interpret}\n`, 'hint');
      } else {
        line('Comando não reconhecido na simulação. Escreve help ou seleciona um dos exemplos.\n', 'hint');
      }
    }
    output.scrollTop = output.scrollHeight;
  }
  $('#terminal-form').addEventListener('submit', e => { e.preventDefault(); const el = $('#terminal-command'); runTerminal(el.value); el.value = ''; el.focus(); });
  $('#terminal-clear').addEventListener('click', () => { output.replaceChildren(); $('#terminal-command').focus(); });
  const shortcuts = ['Get-Service -Name Spooler','ipconfig /all','Resolve-DnsName app.lab.interno','Test-NetConnection app.lab.interno -Port 443','Get-Volume','Get-ADUser -Identity maria.silva -Properties Enabled,Department'];
  $('#terminal-shortcuts').innerHTML = shortcuts.map(cmd => `<button type="button">${html(cmd)}</button>`).join('');
  $$('#terminal-shortcuts button').forEach((button,i) => button.addEventListener('click', () => runTerminal(shortcuts[i])));

  // Rede: cenários fechados, sempre dados fictícios.
  const scenarioResults = {
    dns: 'CENÁRIO: nome sem resolução\n> ipconfig /all\nDNS configurado: 10.20.30.10\n> Resolve-DnsName app.lab.interno\nERRO: Nome DNS não encontrado (simulado)\n\nPróximos passos: consultar a zona DNS, cache e registo A esperado.',
    https: 'CENÁRIO: indisponibilidade HTTPS\n> ping 10.20.30.20\nResposta recebida (ICMP)\n> Test-NetConnection app.lab.interno -Port 443\nTcpTestSucceeded : False\n\nPróximos passos: serviço web, firewall, rota e regras TCP.',
    ok: 'CENÁRIO: comunicação validada\n> Resolve-DnsName app.lab.interno\nA 10.20.30.20\n> Test-NetConnection app.lab.interno -Port 443\nTcpTestSucceeded : True\n\nNota: a porta aberta não garante que a aplicação esteja saudável.',
    rota: 'CENÁRIO: rota interrompida\n> tracert 10.20.40.5\n1  10.20.30.1   <1 ms\n2  * * *  tempo excedido\n3  * * *  tempo excedido\n\nNota: saltos sem resposta podem bloquear ICMP. Confirmar outros testes.'
  };
  let currentScenario = 'dns';
  $$('[data-scenario]').forEach(btn => btn.addEventListener('click', () => {
    currentScenario = btn.dataset.scenario;
    $$('[data-scenario]').forEach(b => b.classList.toggle('active', b === btn));
    $('#network-result').textContent = 'Cenário selecionado. Inicia o diagnóstico simulado.';
  }));
  $('#run-network').addEventListener('click', () => { $('#network-result').textContent = scenarioResults[currentScenario]; });

  // Diretório fictício: persistência local, identificadores gerados no browser.
  const defaultUsers = [
    {id:'demo-maria',name:'Maria Silva',group:'GG_Suporte'},
    {id:'demo-joao',name:'João Costa',group:'GG_Operacoes'}
  ];
  let adUsers = safeStorage.get('mrs_ad_v1', defaultUsers);
  if (!Array.isArray(adUsers)) adUsers = [...defaultUsers];
  function renderAD() {
    $('#ad-user-count').textContent = `${adUsers.length} contas`;
    $('#ad-users').innerHTML = adUsers.map(item => `<div class="tree-leaf user"><span>♙ ${html(item.name)} <small>(${html(item.group)})</small></span><button type="button" data-remove="${html(item.id)}" aria-label="Eliminar utilizador fictício ${html(item.name)}">Eliminar</button></div>`).join('');
    $$('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
      adUsers = adUsers.filter(item => item.id !== btn.dataset.remove);
      safeStorage.set('mrs_ad_v1', adUsers); renderAD();
      $('#ad-notice').textContent = 'Registo fictício eliminado.';
    }));
  }
  $('#ad-form').addEventListener('submit', e => {
    e.preventDefault(); const name = $('#ad-name').value.trim().replace(/\s+/g,' ');
    if (!name || name.length > 40) return;
    const group = $('#ad-group').value;
    if (!['GG_Suporte','GG_Operacoes'].includes(group)) return;
    adUsers.push({id:`demo-${Date.now()}-${Math.random().toString(16).slice(2)}`,name,group});
    safeStorage.set('mrs_ad_v1', adUsers); renderAD();
    $('#ad-form').reset(); $('#ad-notice').textContent = `${name} criado apenas na simulação.`;
  });
  $('#ad-reset').addEventListener('click', () => { adUsers = defaultUsers.map(u=>({...u})); safeStorage.set('mrs_ad_v1', adUsers); renderAD(); $('#ad-notice').textContent = 'Diretório fictício reposto.'; });
  renderAD();

  // Desafios com progressão e explicação.
  let answers = safeStorage.get('mrs_incidents_v1', {});
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) answers = {};
  let challengeIndex = 0;
  function renderChallenge() {
    const incident = D.incidents[challengeIndex];
    $('#challenge-progress').textContent = `INCIDENTE ${challengeIndex+1}/${D.incidents.length}`;
    $('#challenge-severity').textContent = `SEVERIDADE: ${incident.severity.toUpperCase()}`;
    $('#challenge-title').textContent = incident.title;
    $('#challenge-intro').textContent = incident.intro;
    $('#challenge-question').textContent = incident.question;
    const chosen = answers[incident.id];
    $('#challenge-options').innerHTML = incident.options.map((opt,i) => `<button type="button" class="answer-item ${chosen === undefined ? '' : i === incident.correct ? 'correct' : i === chosen ? 'wrong' : ''}" ${chosen === undefined ? '' : 'disabled'} data-choice="${i}">${String.fromCharCode(65+i)}. ${html(opt)}</button>`).join('');
    if (chosen !== undefined) {
      const steps = incident.steps.map(s => `<li>${html(s)}</li>`).join('');
      $('#challenge-feedback').innerHTML = `<div class="feedback-box"><strong>${chosen === incident.correct ? '✓ Decisão correta' : '◇ Há uma alternativa mais segura'}</strong><p>${html(incident.explanation)}</p><strong>Roteiro de resolução</strong><ol>${steps}</ol><span class="small-muted">Comandos úteis: ${html(incident.command)}</span></div>`;
    } else $('#challenge-feedback').replaceChildren();
    const completed = D.incidents.filter(i => answers[i.id] !== undefined).length;
    const correct = D.incidents.filter(i => answers[i.id] === i.correct).length;
    $('#challenge-completed').textContent = `${completed} / ${D.incidents.length}`;
    $('#challenge-bar').style.width = `${100*completed/D.incidents.length}%`;
    $('#challenge-counter').textContent = `${correct} respostas certas`;
    $('#challenge-next').textContent = challengeIndex === D.incidents.length-1 ? 'Voltar ao primeiro ↻' : 'Próximo incidente →';
  }
  $('#challenge-options').addEventListener('click', e => {
    const btn = e.target.closest('[data-choice]'); if (!btn) return;
    const incident = D.incidents[challengeIndex];
    if (answers[incident.id] !== undefined) return;
    answers[incident.id] = Number(btn.dataset.choice);
    safeStorage.set('mrs_incidents_v1', answers); renderChallenge();
  });
  $('#challenge-next').addEventListener('click', () => { challengeIndex = (challengeIndex+1)%D.incidents.length; renderChallenge(); });
  $('#challenge-reset').addEventListener('click', () => { answers = {}; safeStorage.set('mrs_incidents_v1', answers); challengeIndex = 0; renderChallenge(); });
  renderChallenge();

  // Saúde: números demonstrativos, nunca inventar ligação a métricas reais.
  const servers = [
    {name:'SRV-APP-01',role:'Aplicações · Windows Server',cpu:31,ram:62,disk:47,alert:false},
    {name:'SRV-AD-01',role:'Domínio e DNS · Windows Server',cpu:18,ram:44,disk:56,alert:false},
    {name:'SRV-FILES-01',role:'Ficheiros · Windows Server',cpu:25,ram:71,disk:96,alert:true}
  ];
  $('#server-cards').innerHTML = servers.map(s => `<div class="server-card"><div class="server-name">${html(s.name)}<span class="${s.alert?'alert':''}">${s.alert?'⚑ Alerta':'● Saudável'}</span></div><p>${html(s.role)}</p>${[['CPU',s.cpu],['RAM',s.ram],['Disco',s.disk]].map(([n,v]) => `<div class="metric"><span>${n}</span><strong>${v}%</strong></div><div class="bar"><span class="${v>=85?'warn':''}" style="width:${v}%"></span></div>`).join('')}</div>`).join('');

  // Biblioteca, formação, fontes e recursos externos.
  const cats = [...new Set(D.commands.map(c=>c.category))].sort((a,b)=>a.localeCompare(b,'pt'));
  $('#command-filter').innerHTML += cats.map(s=>`<option value="${html(s)}">${html(s)}</option>`).join('');
  function renderCommands() {
    const search = $('#command-search').value.trim().toLocaleLowerCase('pt-PT');
    const category = $('#command-filter').value;
    const matched = D.commands.filter(c=> (!category||c.category===category) && [c.cmd,c.description,c.example,c.category].join(' ').toLocaleLowerCase('pt-PT').includes(search));
    $('#command-list').innerHTML = matched.length ? matched.map(c => `<article class="command-row"><div><code>${html(c.example)}</code><p>${html(c.description)}</p></div><div class="command-badges"><span class="tag">${html(c.level)}</span><span class="tag ${c.risk==='Modificação'?'risky':''}">${html(c.risk)}</span><button class="btn small ghost" type="button" data-details="${html(c.id)}" aria-expanded="false">Detalhes ↓</button></div><div class="command-expanded" hidden id="details-${html(c.id)}"><strong>Exemplo de saída (simulada)</strong><pre>${html(c.out)}</pre><p><b>Interpretação:</b> ${html(c.interpret)}</p><button type="button" data-copy="${html(c.id)}">Copiar comando</button></div></article>`).join('') : '<div class="note-banner muted"><span>ⓘ</span><p>Não foram encontrados comandos para esta pesquisa.</p></div>';
    $$('[data-details]').forEach(btn=>btn.addEventListener('click',()=>{
      const target = document.getElementById(`details-${btn.dataset.details}`);
      target.hidden = !target.hidden;
      btn.setAttribute('aria-expanded', String(!target.hidden));
      btn.textContent = target.hidden ? 'Detalhes ↓' : 'Fechar ↑';
    }));
    $$('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{
      const c = D.commands.find(c=>c.id===btn.dataset.copy);if(!c)return;
      try { await navigator.clipboard.writeText(c.example);btn.textContent='Copiado ✓'; }
      catch { btn.textContent='Seleciona o comando para copiar'; }
    }));
  }
  $('#command-search').addEventListener('input',renderCommands);
  $('#command-filter').addEventListener('change',renderCommands);
  renderCommands();
  $('#tools-grid').innerHTML = D.tools.map(t=>`<a class="tool-card" href="${html(t.url)}" target="_blank" rel="noopener noreferrer"><div class="tool-heading"><strong>${html(t.name)}</strong><span class="outlink">↗</span></div><p>${html(t.description)}</p><small>${html(t.type)} · ${html(t.tag)}</small></a>`).join('');
  $('#courses-list').innerHTML = D.courses.map((c,i)=>`<article class="course-card"><div class="course-summary"><div><h3>${html(c.name)}</h3><p>${html(c.description)}</p><div class="course-meta"><span class="tag">${html(c.level)}</span><span class="tag">${html(c.duration)}</span>${c.tags.map(t=>`<span class="tag">${html(t)}</span>`).join('')}</div></div><button class="btn ghost" type="button" data-course="${i}" aria-expanded="false">Ver exercícios ↓</button></div><div class="course-more"><ol>${c.tasks.map(t=>`<li>${html(t)}</li>`).join('')}</ol></div></article>`).join('');
  $$('[data-course]').forEach(btn=>btn.addEventListener('click',()=>{
    const card = btn.closest('.course-card');card.classList.toggle('open');
    const opened=card.classList.contains('open');btn.textContent=opened?'Ocultar ↑':'Ver exercícios ↓';btn.setAttribute('aria-expanded', String(opened));
  }));
  $('#source-list').innerHTML = D.sources.map(s=>`<article class="source-card"><div><h3>${html(s.name)}</h3><p>${html(s.usage)}</p><p class="small-muted">${html(s.note)}</p></div><div class="source-side"><span class="tag">${html(s.area)}</span><br><small>Licença: ${html(s.license)}</small></div></article>`).join('');

  // Cloudflare: apenas pedido ao endpoint próprio, sem credenciais no front-end.
  let visitsPending = false; let visitsLoaded = false;
  const fmt = n => new Intl.NumberFormat('pt-PT').format(n);
  function drawChart(days) {
    const chart = $('#visits-chart');
    const max = Math.max(1, ...days.map(d => d.visits));
    const W=800,H=280, left=46,right=16,top=20,bottom=38, cw=W-left-right, ch=H-top-bottom;
    const n=days.length;
    const bars=days.map((d,i)=>{
      const x=left+(i+.15)*(cw/n),w=cw/n*.7,h=Math.max(0,d.visits/max*ch),y=H-bottom-h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#388ef0"><title>${html(d.date)}: ${fmt(d.visits)} visitas</title></rect>`;
    }).join('');
    const grids=[0,.25,.5,.75,1].map(f=>`<line class="grid-line" x1="${left}" x2="${W-right}" y1="${(H-bottom-f*ch).toFixed(1)}" y2="${(H-bottom-f*ch).toFixed(1)}"/><text x="${left-7}" y="${(H-bottom-f*ch+4).toFixed(1)}" text-anchor="end">${fmt(Math.round(f*max))}</text>`).join('');
    const labels=days.map((d,i)=>(i===0||i===n-1||i%5===0)?`<text x="${(left+(i+.5)*cw/n).toFixed(1)}" y="${H-15}" text-anchor="middle">${html(d.date.slice(5).replace('-','/'))}</text>`:'').join('');
    chart.innerHTML=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico diário de visitas do portal durante os últimos 30 dias">${grids}${bars}${labels}</svg>`;
  }
  async function loadVisits(force=false) {
    if (visitsPending || (visitsLoaded && !force)) return;
    visitsPending=true;
    $('#visits-status').textContent = 'A consultar a integração de visitas…';
    $('#visits-status').className='visits-status';
    try {
      const endpoint=window.MRS_VISITS_API || '/api/visitas';
      const res=await fetch(endpoint, {headers:{Accept:'application/json'},cache:force?'reload':'default'});
      if (!res.ok) throw new Error(res.status===404?'O endpoint /api/visitas ainda não foi publicado.':'O serviço de visitas não está disponível (HTTP '+res.status+').');
      const data=await res.json();
      if (!Array.isArray(data.days)||!data.days.length||data.days.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isSafeInteger(d.visits)||d.visits<0||!Number.isSafeInteger(d.pageviews)||d.pageviews<0)) throw new Error('A resposta da API não tem o formato esperado.');
      const days=data.days.slice(-30);
      const sum=(items,key)=>items.reduce((acc,d)=>acc+d[key],0);
      $('#visits-today').textContent=fmt(days.at(-1)?.visits||0);
      $('#visits-week').textContent=fmt(sum(days.slice(-7),'visits'));
      $('#visits-month').textContent=fmt(sum(days,'visits'));
      $('#pageviews-month').textContent=fmt(sum(days,'pageviews'));
      drawChart(days);
      $('#visits-status').textContent=`Integração ativa · Dados recolhidos pela Cloudflare · Atualização: ${new Date().toLocaleString('pt-PT')} · Períodos por dia UTC. Os valores podem ser estimados por amostragem.`;
      $('#visits-status').classList.add('ready');
      visitsLoaded=true;
    } catch (err) {
      $('#visits-status').textContent=`Integração por configurar: ${err.message} Consulta o guia docs/INSTALACAO.md para ativar a API segura.`;
      $('#visits-status').classList.add('failed');
      // Sem dados verdadeiros, nunca apresentar contadores inventados ou zero fictício.
      ['#visits-today','#visits-week','#visits-month','#pageviews-month'].forEach(sel=>$(sel).textContent='—');
      $('#visits-chart').innerHTML='<div class="chart-empty">Ainda não existem dados autenticados da Cloudflare disponíveis neste portal.</div>';
    } finally {visitsPending=false;}
  }
  $('#visits-refresh').addEventListener('click',()=>loadVisits(true));
  go(location.hash.slice(1));
})();
