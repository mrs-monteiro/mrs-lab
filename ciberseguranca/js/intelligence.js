/* MRS Cyber Intelligence Hub V2.2 - local privacy-first guidance only. No fetch/network calls. */
(()=>{'use strict';
const $=id=>document.getElementById(id);if(!$('inteligencia'))return;
const make=(tag,txt)=>{const x=document.createElement(tag);x.textContent=txt;return x};
const result=$('ci-url-result');
const warn=(messages,title,alert=false)=>{result.replaceChildren(make('strong',title));if(messages.length){const ul=document.createElement('ul');messages.forEach(m=>ul.append(make('li',m)));result.append(ul)}result.className='ci-result '+(alert?'ci-alert':'ci-neutral')};
function checkUrl(){const raw=$('ci-url').value.trim();if(!raw){warn(['Escreve um endereço ou utiliza um exemplo fictício.'],'Nenhum endereço indicado');return}
 if(raw.length>1000){warn(['A análise está limitada a 1000 caracteres.'],'Entrada demasiado longa',true);return}
 let u;try{u=new URL(raw)}catch{warn(['O endereço não parece ser um URL absoluto válido, com http:// ou https://.'],'Formato não reconhecido',true);return}
 if(!['https:','http:'].includes(u.protocol)){warn(['Este guia apenas explica endereços HTTP(S); não suporta outros protocolos.'],'Protocolo não esperado',true);return}
 const issues=[];const host=u.hostname.toLowerCase();
 if(u.protocol!=='https:')issues.push('Não usa HTTPS. O conteúdo da ligação pode não estar protegido em trânsito.');
 if(u.username||u.password||raw.includes('@'))issues.push('Contém “@” ou dados antes do domínio: o nome real do servidor pode não ser o que aparenta.');
 if(host.startsWith('xn--')||host.includes('.xn--'))issues.push('O domínio contém codificação internacionalizada (punycode): verifica cuidadosamente a grafia.');
 if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host))issues.push('Utiliza um endereço IP em vez de um domínio: confirma a origem por outra via.');
 if(host.split('.').length>5)issues.push('Tem vários subdomínios: confirma qual é o domínio efetivo.');
 if(host.length>55)issues.push('Domínio muito longo: torna-se mais difícil verificar visualmente a origem.');
 if(/(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)$/i.test(host))issues.push('Parece ser um serviço de encurtamento: o destino pode estar oculto.');
 if(u.searchParams.size && [...u.searchParams.keys()].some(k=>/token|key|pass|senha|session|auth|secret|codigo/i.test(k)))issues.push('A URL contém parâmetros possivelmente sensíveis; não a publiques num serviço externo.');
 if(/(?:verificar|urgente|suspens|validar-conta|confirmar-login)/i.test(u.pathname+' '+host))issues.push('O texto usa termos de urgência ou validação de conta: confirma o pedido por um canal independente.');
 if(host.endsWith('.example'))issues.push('É um domínio fictício reservado para demonstrações: não deve ser usado como prova de reputação.');
 if(issues.length){warn(issues,'Sinais a investigar ('+issues.length+')',true)}else{warn(['Não foram identificados sinais óbvios nesta inspeção textual.', 'Isto NÃO confirma que o endereço seja seguro. Verifica a origem por canais oficiais e, se apropriado, consulta uma ferramenta externa.'],'Sem alertas textuais óbvios')}
}
$('ci-check-url').addEventListener('click',checkUrl);$('ci-url').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkUrl()}});
document.querySelectorAll('[data-ci-example]').forEach(btn=>btn.addEventListener('click',()=>{$('ci-url').value=btn.dataset.ciExample;checkUrl()}));
const modes={
 local:{title:'IA totalmente local',infer:'Modelo executado localmente',desc:'Nesta arquitetura ilustrativa, a pesquisa documental e a inferência são executadas dentro da infraestrutura controlada pela organização. Não implica que todos os sistemas de gestão sejam automaticamente locais.',qs:['Quem administra os servidores e os modelos?', 'A telemetria, as atualizações ou os backups utilizam serviços externos?', 'Existem autenticação, segregação e revisão de acesso?'],warning:'Local não significa automaticamente seguro. Configurações, permissões, manutenção e fuga de dados continuam a ser riscos.',cloud:false},
 cloud:{title:'IA na cloud',infer:'Modelo num serviço cloud',desc:'O prompt e o contexto necessário à resposta podem ser enviados a um serviço externo de inferência, mesmo quando a origem documental é uma intranet. O fornecedor e o contrato determinam os controlos de tratamento dos dados.',qs:['Que excertos são enviados e para que região?', 'Qual é a retenção e o uso dos dados para treino?', 'Existe acordo empresarial, auditoria e controlo de residência?'],warning:'Tenant dedicado é isolamento lógico e governação, não prova de inferência on-premises. O tratamento depende da configuração contratada.',cloud:true},
 hybrid:{title:'IA híbrida',infer:'Inferência local e/ou na cloud',desc:'Uma solução híbrida pode pesquisar e filtrar localmente e encaminhar apenas pedidos aprovados para um modelo cloud; também pode escolher modelos locais para certos dados. É necessário documentar os caminhos reais.',qs:['Que classificação permite utilizar modelos externos?', 'Há sanitização, DLP e política de encaminhamento?', 'Os logs mostram o destino de cada pedido e excerto?'],warning:'“Híbrido” por si só não garante que os dados não saiam da rede. Cada rota deve ser validada.',cloud:true}
};
function mode(k){const m=modes[k];document.querySelectorAll('[data-ci-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ciMode===k)));$('ci-mode-title').textContent=m.title;$('ci-mode-desc').textContent=m.desc;$('ci-infer-node').querySelector('strong').textContent=m.infer;$('ci-infer-node').classList.toggle('ci-cloud-node',m.cloud);$('ci-mode-warning').textContent=m.warning;const list=$('ci-mode-questions');list.replaceChildren(...m.qs.map(q=>make('li',q)))}
document.querySelectorAll('[data-ci-mode]').forEach(b=>b.addEventListener('click',()=>mode(b.dataset.ciMode)));
document.querySelectorAll('[data-ci-filter]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.ciFilter;document.querySelectorAll('[data-ci-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-ci-category]').forEach(x=>{x.hidden=k!=='todos'&&x.dataset.ciCategory!==k})}));
$('ci-export').addEventListener('click',()=>{const body=[
 'MRS MONTEIRO · Cyber Intelligence Hub · Guia de boas práticas',
 'Material educativo; não constitui auditoria ou análise de reputação.',
 '',
 'VERIFICAR LINKS',
 '1. Confirmar a origem por um canal independente; não clicar sob pressão.',
 '2. Verificar domínio real, HTTPS, caracteres estranhos, redirecionamentos e pedidos de credenciais.',
 '3. Se adequado, consultar reputação em Google Safe Browsing, VirusTotal ou urlscan.',
 '4. Não enviar ficheiros confidenciais, URLs com tokens ou documentos internos a serviços públicos.',
 '',
 'IA NAS ORGANIZAÇÕES',
 '1. Confirmar onde ocorre a inferência e que conteúdo é transmitido.',
 '2. Verificar retenção, região, treino, controlos de acesso e política de dados.',
 '3. Distinguir tenant próprio de execução local do modelo.',
 '4. Exigir auditoria, minimização de dados e autorização para ações sensíveis.',
 '',
 'BASES',
 'ENISA: https://www.enisa.europa.eu/publications/enisa-threat-landscape-2026',
 'CNCS: https://www.cncs.gov.pt/',
 'MITRE ATT&CK: https://attack.mitre.org/',
 'OWASP GenAI: https://genai.owasp.org/',
 'NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework',
 '',
 'Nenhum link/ficheiro é analisado remotamente pelo LAB.'];
 const file=new Blob([body.join('\n')],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download='MRS_Cyber_Guia_Pratico.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
});
mode('local');
})();
