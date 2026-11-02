'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const text = (id, value) => { $(id).textContent = String(value); };
  const create = (tag, cls, value) => {const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;};
  // C: playful teaching models; no execution of original C source.
  const romanValues=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  function roman(){const raw=$('roman-input').value, n=Number(raw);
    if(!Number.isInteger(n)||n<1||n>3999||!raw){text('roman-output','Entrada inválida');text('roman-steps','Introduz um número inteiro entre 1 e 3999.');return;}
    let remain=n,result='',trace=[];
    for(const [amount,symbol] of romanValues){let count=0;while(remain>=amount){result+=symbol;remain-=amount;count++;}
      if(count)trace.push(`${amount} → ${symbol} × ${count} · resta ${remain}`);
    }
    text('roman-output',result);text('roman-steps',trace.join('\n'));
    text('roman-lesson',`Para representar ${n}, repetimos comparações e subtrações até restar 0. Isto ilustra ciclos e decisões.`);
  }
  function palindrome(){const raw=$('pal-input').value.trim();const normal=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').replace(/[^a-z0-9]/g,'');
    if(!normal){text('pal-result','Introduz texto');text('pal-steps','Escreve uma palavra com letras ou números.');return;}
    const reverse=[...normal].reverse().join('');const same=normal===reverse;
    text('pal-result',same?'✓ É palíndromo':'× Não é palíndromo');
    text('pal-steps',`Normalizado: ${normal}\nInvertido: ${reverse}\nConclusão: ${same?'as duas sequências coincidem':'as sequências são diferentes'}.`);
  }
  $('roman-run').addEventListener('click',roman);$('pal-run').addEventListener('click',palindrome);
  $('roman-input').addEventListener('keydown',e=>{if(e.key==='Enter')roman();});$('pal-input').addEventListener('keydown',e=>{if(e.key==='Enter')palindrome();});
  roman();palindrome();
  // C++: a state-machine representing a fictional object; not the original academic classes.
  let score={sport:'futebol',home:0,away:0,events:[]};
  function renderScore(){text('score-home',score.home);text('score-away',score.away);
    text('object-state',JSON.stringify({classe:'EncontroDemonstrativo',modalidade:score.sport,equipas:['Azul','Verde'],marcador:{azul:score.home,verde:score.away},eventos:score.events.length},null,2));
    text('event-last',score.events.at(-1)||'Nenhum.');
    text('sport-hint',`O objeto guarda o estado; o botão invoca o método educativo «registarEvento». Total de ${score.events.length} eventos.`);
  }
  function resetScore(){score={sport:$('sport').value,home:0,away:0,events:[]};renderScore();}
  $('sport').addEventListener('change',resetScore);$('score-reset').addEventListener('click',resetScore);
  document.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.team;if(!['home','away'].includes(key))return;
    if(score.events.length>=60){text('sport-hint','Chegaste aos 60 eventos da demonstração. Reinicia para continuar.');return;}
    const points=score.sport==='futebol'?1:2;score[key]+=points;
    score.events.push(`${key==='home'?'Equipa Azul':'Equipa Verde'}: +${points} ${score.sport==='futebol'?'golo':'pontos'}`);renderScore();
  }));resetScore();
  // A deliberately constrained PDA learner. No JSON imports, parsing of arbitrary source, or eval.
  let pda={input:'',at:0,phase:'q0',stack:['Z'],done:false};
  function pdaRender(){text('pda-state',pda.phase+(pda.done?' · Terminado':''));text('pda-progress',`${pda.at} / ${pda.input.length}`);
    const tape=$('pda-tape');tape.replaceChildren();
    for(let i=0;i<pda.input.length;i++)tape.append(create('span','symbol '+(i<pda.at?'done':i===pda.at&&!pda.done?'active':''),pda.input[i]));
    const stack=$('pda-stack');stack.replaceChildren();for(const s of pda.stack)stack.append(create('span','symbol',s));
    $('pda-step').disabled=pda.done;$('pda-all').disabled=pda.done;
  }
  function pdaPrepare(){const raw=$('pda-input').value.trim().toLowerCase();if(!/^[av]{1,24}$/.test(raw)){
      pda={input:'',at:0,phase:'Erro',stack:['Z'],done:true};text('pda-message','Utiliza apenas letras a e v (1 a 24 caracteres).');pdaRender();return;}
    pda={input:raw,at:0,phase:'q0',stack:['Z'],done:false};text('pda-message','q0: começa com a, empilhando um A por cada símbolo.');pdaRender();
  }
  function pdaStep(){if(pda.done)return;
    if(pda.at===pda.input.length){pda.done=true;
      if(pda.stack.length===1&&pda.phase==='q1'){pda.phase='q2';text('pda-message','Aceite! Leste todas as letras e a pilha regressou ao símbolo-base Z.');}
      else{pda.phase='Rejeitado';text('pda-message','Rejeitado: a sequência terminou sem satisfazer as condições.');}
      pdaRender();return;
    }
    const letter=pda.input[pda.at++];
    if(letter==='a'&&pda.phase==='q0'){pda.stack.push('A');text('pda-message',`Passo ${pda.at}: leste a → empilhas A.`);}
    else if(letter==='v'&&['q0','q1'].includes(pda.phase)&&pda.stack.at(-1)==='A'){
      pda.stack.pop();pda.phase='q1';text('pda-message',`Passo ${pda.at}: leste v → retiras A do topo.`);
    }else{pda.done=true;pda.phase='Rejeitado';text('pda-message',`Rejeitado no símbolo ${pda.at}: transição inválida ou pilha vazia.`);}
    pdaRender();
  }
  $('pda-load').addEventListener('click',pdaPrepare);$('pda-step').addEventListener('click',pdaStep);
  $('pda-all').addEventListener('click',()=>{for(let n=0;n<32&&!pda.done;n++)pdaStep();});
  $('pda-example').addEventListener('click',()=>{$('pda-input').value=$('pda-input').value==='aavv'?'avv':'aavv';pdaPrepare();});
  pdaPrepare();
  // Turing marking strategy — an illustrative high-level trace, not a complete universal TM engine.
  let tm={raw:'',tape:[],phase:0,triples:0,done:false,head:-1,validStructure:false,groups:[]};
  function turingRender(){const tape=$('turing-tape');tape.replaceChildren();tm.tape.forEach((c,i)=>tape.append(create('span','symbol '+(i===tm.head?'active':['X','Y','Z'].includes(c)?'done':''),c)));
    text('turing-status',tm.done?(tm.validStructure?'Marcação concluída':'Sequência não reconhecida'):'Marcação didática em curso');
    text('turing-count',`${tm.triples*3+tm.phase} marcações`);$('turing-step').disabled=tm.done;$('turing-all').disabled=tm.done;
  }
  function turingPrepare(){const raw=$('turing-input').value.trim();if(!/^[01]{1,30}$/.test(raw)){
      tm={raw:'',tape:[],phase:0,triples:0,done:true,head:-1,validStructure:false,groups:[]};text('turing-message','Introduz uma sequência de 0 e 1 com até 30 símbolos.');turingRender();return;}
    const groups=/^(0+)(1+)(0+)$/.exec(raw);
    tm={raw,tape:[...raw],phase:0,triples:0,done:false,head:-1,validStructure:!!groups,groups:groups?[groups[1].length,groups[2].length,groups[3].length]:[]};
    text('turing-message','Preparada. Clica em «Próxima marcação» para observar X, Y e Z.');turingRender();
  }
  function turingStep(){if(tm.done)return;
    if(!tm.validStructure){tm.done=true;text('turing-message','Rejeitado: a entrada não tem a estrutura 0…1…0… .');turingRender();return;}
    const [n0,n1,n2]=tm.groups;
    if(tm.triples===n0&&tm.phase===0){tm.done=true;tm.validStructure=n0===n1&&n1===n2;
      text('turing-message',tm.validStructure?`Aceite: ${n0} grupos completos de símbolos 0, 1 e 0.`:'Rejeitado: os três grupos têm comprimentos diferentes.');turingRender();return;}
    const index=tm.phase===0?tm.triples:tm.phase===1?n0+tm.triples:n0+n1+tm.triples;
    if(index>=tm.tape.length||tm.triples>=[n0,n1,n2][tm.phase]){
      tm.done=true;tm.validStructure=false;text('turing-message','Rejeitado: falta um símbolo num dos grupos para completar a marcação.');turingRender();return;}
    const marker=['X','Y','Z'][tm.phase];tm.tape[index]=marker;tm.head=index;tm.phase++;
    text('turing-message',`Marcado ${marker} na posição ${index+1} da fita. ${tm.phase===1?'Segue-se o 1 do grupo central.':tm.phase===2?'Segue-se o 0 do último grupo.':'Concluída uma ronda de três marcas.'}`);
    if(tm.phase===3){tm.phase=0;tm.triples++;}turingRender();
  }
  $('turing-load').addEventListener('click',turingPrepare);$('turing-step').addEventListener('click',turingStep);
  $('turing-all').addEventListener('click',()=>{for(let n=0;n<100&&!tm.done;n++)turingStep();});turingPrepare();
})();
