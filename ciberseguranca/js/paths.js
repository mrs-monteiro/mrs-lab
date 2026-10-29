/* Cyber Defense Paths — original interactive routing diagram (synthetic, browser-only). */
(()=>{'use strict';
const $=id=>document.getElementById(id), svg=$('cp-svg');if(!svg)return;
const route=$('cp-route'),aura=$('cp-glow-path'),ball=$('cp-packet'),barrier=$('cp-blocker'),workbench=document.querySelector('.cp-workbench'),play=$('cp-pause');
const rules={
public:{d:'M184 101 L238 101 L404 101 L458 101 L535 101',nodes:['internet','edge','web'],label:'Internet → Firewall/WAF → Web · HTTPS 443',block:.36},
db:{d:'M184 101 L238 101 L404 101 L426 101 L426 197 L761 197 L761 227',nodes:['internet','edge','database'],label:'Internet → Perímetro → Base de dados · TCP 5432',block:.29},
ssh:{d:'M184 101 L238 101 L318 101 L318 227',nodes:['internet','edge','admin'],label:'Internet → Acesso administrativo · SSH 22',block:.49},
webapp:{d:'M624 101 L678 101 L761 101',nodes:['web','app'],label:'Web na DMZ → Aplicação · HTTPS 443',block:.99},
admin:{d:'M184 101 L238 101 L318 101 L318 227 L404 273 L646 273 L646 101 L678 101',nodes:['internet','edge','admin','app'],label:'Administrador → VPN / Bastion → Aplicação',block:.68},
employee:{d:'M184 273 L238 273 L404 273 L646 273 L646 101 L678 101',nodes:['staff','admin','app'],label:'Colaborador → Aplicação · HTTPS 443',block:.80}
};
function decide(){const c={fw:$('net-fw').checked,seg:$('net-seg').checked,waf:$('net-waf').checked,vpn:$('net-vpn').checked,mfa:$('net-mfa').checked};const s=$('net-flow').value;
if(s==='public')return !c.fw?'unsafe':'allow';
if(s==='db')return c.fw&&c.seg?'deny':'unsafe';
if(s==='ssh')return c.fw?'deny':'unsafe';
if(s==='webapp')return c.seg?'allow':'unsafe';
if(s==='admin')return !c.vpn||!c.mfa?'deny':'allow';
if(s==='employee')return c.mfa?'allow':'deny';return 'allow'}
let paused=false,start=0,last=0,cur='',decision='',length=1,limit=1,animId=0;
const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function position(t){const p=route.getPointAtLength(Math.max(0,Math.min(1,t))*length);ball.setAttribute('cx',p.x);ball.setAttribute('cy',p.y)}
function frame(time){if(!last)last=time;const dt=Math.min(90,time-last);last=time;if(!paused&&!reduce){start+=dt;const pos=(start%2700)/2700;position(pos*limit);}animId=requestAnimationFrame(frame)}
function update(){const s=$('net-flow').value,r=rules[s];if(!r)return;decision=decide();workbench.dataset.decision=decision;cur=s;route.setAttribute('d',r.d);aura.setAttribute('d',r.d);length=Math.max(1,route.getTotalLength());limit=decision==='deny'?r.block:1;start=0;last=0;position(0);
barrier.setAttribute('visibility',decision==='deny'?'visible':'hidden');if(decision==='deny'){const p=route.getPointAtLength(length*limit);barrier.setAttribute('transform',`translate(${p.x} ${p.y})`)}
document.querySelectorAll('.cp-node').forEach(n=>n.classList.toggle('cp-selected',r.nodes.some(id=>n.id==='cp-node-'+id)));
$('cp-label').textContent=r.label;const names={allow:'PERMITIDO',deny:'BLOQUEADO',unsafe:'EXPOSIÇÃO SIMULADA'};$('cp-state').textContent=names[decision];$('cp-state').dataset.decision=decision;
$('cp-note').textContent=decision==='deny'?'O pacote é interrompido no controlo de acesso representado no mapa.':decision==='unsafe'?'O percurso é visualizado a vermelho por faltar uma defesa importante.':'O percurso é visualizado a verde. A autorização real dependeria de regras, identidade e contexto.';
if(reduce)position(limit);
}
play.onclick=()=>{paused=!paused;play.setAttribute('aria-pressed',String(paused));play.textContent=paused?'Reproduzir animação':'Pausar animação';if(!paused)last=0};
$('net-test').addEventListener('click',update);$('net-flow').addEventListener('change',update);document.querySelectorAll('#net-controls input').forEach(el=>el.addEventListener('change',update));
document.addEventListener('visibilitychange',()=>{last=0});update();if(!reduce)animId=requestAnimationFrame(frame);else{play.disabled=true;play.textContent='Movimento reduzido';}
})();
