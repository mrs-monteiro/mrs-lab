/* Cloudflare Pages Function: publicada automaticamente em /api/visitas
   quando a pasta do projeto é a raiz do build Pages. */
import {handleMetrics} from '../../cloudflare/metrics-core.mjs';
export async function onRequestGet({request,env}) { return handleMetrics(request,env); }
