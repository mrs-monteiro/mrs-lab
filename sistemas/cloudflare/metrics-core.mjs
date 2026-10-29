/* Cloudflare Web Analytics -> MRS. Só divulga totais agregados de uma propriedade.
   A API token nunca é exposta ao navegador. Suporte: Pages Functions / Workers. */
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const MAX_AGE = 300;
const json = (body, code = 200) => new Response(JSON.stringify(body), {
  status: code,
  headers: {'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': code === 200 ? `public, max-age=${MAX_AGE}, s-maxage=${MAX_AGE}` : 'no-store',
    'X-Content-Type-Options':'nosniff'}
});
const isTag = v => /^[a-f0-9]{32}$/i.test(v || '');
const isHost = v => /^(?=.{1,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(v || '');

export async function handleMetrics(request, env) {
  if (request.method !== 'GET') return json({erro: 'metodo_nao_permitido'}, 405);
  if (!isTag(env?.CF_ACCOUNT_ID) || !isTag(env?.CF_SITE_TAG) || !env?.CF_ANALYTICS_TOKEN) {
    return json({erro:'configuracao_pendente'}, 503);
  }
  if (env.CF_HOSTNAME && !isHost(env.CF_HOSTNAME)) return json({erro:'hostname_invalido'}, 503);
  try {
    const cache = globalThis.caches?.default;
    const cacheKey = new Request(new URL(request.url).origin + '/api/visitas', {method:'GET'});
    if (cache) { const hit=await cache.match(cacheKey); if(hit) return hit; }
    const until = new Date();
    const last = new Date(Date.UTC(until.getUTCFullYear(),until.getUTCMonth(),until.getUTCDate()));
    const since = new Date(last.getTime() - 29*86400_000);
    const untilExclusive = new Date(last.getTime() + 86400_000);
    const query = `query MRSWebAnalytics($accountTag: string!, $siteTag: string!, $from: Time!, $to: Time!) {
      viewer {
        accounts(filter: {accountTag: $accountTag}) {
          events: rumPageloadEventsAdaptiveGroups(
            limit: 2500, orderBy: [date_ASC],
            filter: {siteTag: $siteTag, datetime_geq: $from, datetime_lt: $to}
          ) {
            count
            sum { visits }
            dimensions { date requestHost }
          }
        }
      }
    }`;
    const upstream = await fetch(GRAPHQL_URL, {
      method:'POST',
      headers:{'Authorization':`Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type':'application/json'},
      body:JSON.stringify({query, variables:{accountTag:env.CF_ACCOUNT_ID,siteTag:env.CF_SITE_TAG,from:since.toISOString(),to:untilExclusive.toISOString()}}),
      signal:AbortSignal.timeout(10000)
    });
    if (!upstream.ok) return json({erro:'cloudflare_indisponivel'}, 502);
    const payload = await upstream.json();
    if (payload.errors?.length) return json({erro:'consulta_graphql_falhou'}, 502);
    const accounts = payload?.data?.viewer?.accounts;
    if (!Array.isArray(accounts) || accounts.length !== 1) return json({erro:'propriedade_indisponivel'}, 502);
    const rows = accounts[0]?.events;
    if (!Array.isArray(rows)) return json({erro:'resposta_invalida'}, 502);
    // Evita apresentar um total truncado se o número de grupos atingir o limite.
    if (rows.length >= 2500) return json({erro:'demasiados_grupos'}, 503);
    const map = new Map();
    for(let i=0;i<30;i++) {
      const d = new Date(since.getTime()+i*86400_000).toISOString().slice(0,10);
      map.set(d,{date:d,visits:0,pageviews:0});
    }
    for(const row of rows) {
      const {date,requestHost} = row?.dimensions || {};
      if (!map.has(date)) continue;
      if (env.CF_HOSTNAME && String(requestHost || '').toLowerCase() !== env.CF_HOSTNAME.toLowerCase()) continue;
      const visits=Number(row?.sum?.visits), pageviews=Number(row?.count);
      if (![visits,pageviews].every(n=>Number.isFinite(n)&&Number.isSafeInteger(n)&&n>=0)) return json({erro:'metricas_invalidas'},502);
      const day=map.get(date); day.visits+=visits; day.pageviews+=pageviews;
    }
    const response=json({source:'cloudflare-web-analytics',timezone:'UTC',days:[...map.values()]});
    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    // O segredo e a mensagem de erro interna nunca são devolvidos ao público.
    return json({erro:'falha_temporaria'},502);
  }
}
