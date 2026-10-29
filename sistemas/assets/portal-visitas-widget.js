/* Widget reutilizável de visitas para o portal MRS.
   Exemplo: <div id="mrs-visitas"></div>
            <script defer src="/sistemas/assets/portal-visitas-widget.js"></script> */
(() => {
  'use strict';
  const root=document.getElementById('mrs-visitas'); if(!root)return;
  const endpoint=root.dataset.api || '/api/visitas';
  root.innerHTML='<div style="padding:16px;border-radius:12px;border:1px solid #294366;background:#101e33;color:#d9eaff;font:14px system-ui"><strong>Visitas ao portal</strong><div data-stats style="margin-top:9px;color:#91abc5">A consultar Cloudflare…</div></div>';
  const display=root.querySelector('[data-stats]');
  const fmt = n => new Intl.NumberFormat('pt-PT').format(n);
  fetch(endpoint,{headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw Error('indisponível');return r.json();}).then(data=>{
    if(!Array.isArray(data.days) || data.days.length<7 || data.days.some(d=>!Number.isSafeInteger(d.visits)||d.visits<0))throw Error('resposta inválida');
    const days=data.days.slice(-30),sum=items=>items.reduce((n,d)=>n+d.visits,0);
    display.textContent=`${fmt(sum(days.slice(-7)))} visitas nos últimos 7 dias · ${fmt(sum(days))} nos últimos 30 dias`;
  }).catch(()=>{display.textContent='Estatísticas indisponíveis. Consulta o painel da Cloudflare.';});
})();
