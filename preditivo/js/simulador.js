/* MRS — Desafio da Jornada | Simulador educativo independente. Nenhuma API, aposta ou dado real. */
(()=>{'use strict';
const $=id=>document.getElementById(id);if(!$('sim-play'))return;
const outcomes=['1','X','2'],teams=['Azul','Verde','Âmbar','Marinho','Horizonte','Serra','Lago','Estrela','Vale','Aurora'];
let round=0,played=0,correct=0,scenario=null,finished=false;
const rnd=()=>Math.random();
const percent=v=>new Intl.NumberFormat('pt-PT',{style:'percent',maximumFractionDigits:0}).format(v);
function makeScenario(){
 const a=Math.floor(rnd()*teams.length);let b=Math.floor(rnd()*(teams.length-1));if(b>=a)b++;
 // Somente probabilidades didáticas; sem qualquer modelo real.
 const home=0.32+rnd()*0.32,draw=0.16+rnd()*0.20,away=1-home-draw;
 return {home:teams[a],away:teams[b],probs:[home,draw,away]};
}
function render(){scenario=makeScenario();finished=false;$('sim-round').textContent='Ronda '+(round+1)+' de 10';$('sim-state').textContent='Por jogar';$('sim-match').textContent=scenario.home+' × '+scenario.away;
 const host=$('sim-bars');host.replaceChildren();scenario.probs.forEach((p,i)=>{const item=document.createElement('div');item.className='sim-prob';const label=document.createElement('span');label.textContent=outcomes[i]+' · '+percent(p);const bar=document.createElement('div');bar.className='sim-prob-track';const fill=document.createElement('div');fill.className='sim-prob-fill';fill.style.width=percent(p);bar.append(fill);item.append(label,bar);host.append(item);});
 document.querySelectorAll('input[name="sim-pick"]').forEach(x=>{x.checked=false;x.disabled=false;});$('sim-play').disabled=false;$('sim-next').disabled=true;$('sim-feedback').textContent='Escolhe 1, X ou 2. Depois revela o resultado simulado.';
}
function play(){if(finished)return;const selection=document.querySelector('input[name="sim-pick"]:checked');if(!selection){$('sim-feedback').textContent='Seleciona primeiro 1, X ou 2.';return;}
 const u=rnd(),p=scenario.probs;const idx=u<p[0]?0:u<p[0]+p[1]?1:2;const result=outcomes[idx],hit=selection.value===result;finished=true;played++;if(hit)correct++;
 $('sim-state').textContent=hit?'Acertaste':'Não acertaste';$('sim-feedback').textContent=`Resultado fictício: ${result} (${percent(p[idx])}). ${hit?'Acertaste nesta ronda!':'A tua opção era '+selection.value+'.'} Mesmo o resultado menos provável pode acontecer. Não são previsões de jogos reais.`;
 $('sim-total').textContent=String(played);$('sim-correct').textContent=String(correct);$('sim-score').textContent=percent(correct/played);
 document.querySelectorAll('input[name="sim-pick"]').forEach(x=>x.disabled=true);$('sim-play').disabled=true;$('sim-next').disabled=round>=9;if(round>=9)$('sim-feedback').textContent+=' Fim das 10 rondas. Podes reiniciar para repetir.';
}
$('sim-play').addEventListener('click',play);$('sim-next').addEventListener('click',()=>{if(!finished||round>=9)return;round++;render();});$('sim-reset').addEventListener('click',()=>{round=0;played=0;correct=0;$('sim-total').textContent='0';$('sim-correct').textContent='0';$('sim-score').textContent='—';render();});render();
})();
