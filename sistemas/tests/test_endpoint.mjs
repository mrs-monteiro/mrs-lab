import assert from 'node:assert/strict';
import {handleMetrics} from '../cloudflare/metrics-core.mjs';
const uri = 'https://lab.mrs-monteiro.com/api/visitas';
const env = { CF_ACCOUNT_ID:'a'.repeat(32), CF_SITE_TAG:'b'.repeat(32), CF_ANALYTICS_TOKEN:'TOKEN_FICTICIO', CF_HOSTNAME:'lab.mrs-monteiro.com'};
assert.equal((await handleMetrics(new Request(uri), {})).status,503);
const originalFetch=globalThis.fetch;
try {
  globalThis.fetch=async(_uri,params)=>{
    const v=JSON.parse(params.body).variables;
    const date=new Date(Date.parse(v.to)-86400000).toISOString().slice(0,10);
    return new Response(JSON.stringify({data:{viewer:{accounts:[{events:[
      {dimensions:{date,requestHost:'lab.mrs-monteiro.com'},count:20,sum:{visits:12}},
      {dimensions:{date,requestHost:'outro.mrs-monteiro.com'},count:200,sum:{visits:120}}
    ]}]}}}),{status:200});
  };
  const res=await handleMetrics(new Request(uri),env);
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.days.length,30);
  assert.equal(data.days.reduce((n,d)=>n+d.visits,0),12);
  assert.equal(data.days.reduce((n,d)=>n+d.pageviews,0),20);
  globalThis.fetch=async()=>new Response(JSON.stringify({errors:[{message:'erro sensível'}]}),{status:200});
  const errorRes=await handleMetrics(new Request(uri),env);
  assert.equal(errorRes.status,502);
  assert(!JSON.stringify(await errorRes.json()).includes('sensível'));
} finally {globalThis.fetch=originalFetch;}
console.log('MRS: testes de integração Cloudflare concluídos com sucesso.');
