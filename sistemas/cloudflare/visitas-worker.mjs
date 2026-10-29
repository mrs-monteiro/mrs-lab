/* Worker autónomo, se o portal não estiver alojado em Cloudflare Pages.
   Associar como rota GET /api/visitas* no domínio do portal. */
import {handleMetrics} from './metrics-core.mjs';
export default {async fetch(request, env) {return handleMetrics(request,env);}};
