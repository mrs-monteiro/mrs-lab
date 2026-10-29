# MRS Systems Administration & Support Lab — Instalação e publicação

**Versão:** 1.0 — 29/10/2026  
**Idioma:** português de Portugal (pt-PT)

## 1. Conteúdo do pacote

- `index.html`, `assets/style.css`, `assets/app.js` e `assets/data.js`: portal educativo funcional, sem bibliotecas ou bases de dados externas.
- `assets/portal-visitas-widget.js`: pequeno contador reutilizável para a página principal do portal existente.
- `functions/api/visitas.js`: endpoint para Cloudflare Pages.
- `cloudflare/metrics-core.mjs` e `cloudflare/visitas-worker.mjs`: lógica comum e alternativa via Worker.
- `scripts/Diagnostico-Windows.ps1` e `scripts/diagnostico_local.py`: scripts locais de diagnóstico e leitura; NÃO são executados pelo portal.

## 2. Testar localmente

Na pasta do projeto, executar:

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000/`. Também funciona em alojamento estático comum, mas o endpoint de visitas exige uma função de servidor.

**Atenção:** na versão local, o gráfico de visitas mostrará *integração por configurar*, não um valor fictício.

## 3. Publicar em `lab.mrs-monteiro.com/sistemas/`

Para alojamento tradicional, colocar os ficheiros estáticos do portal dentro da pasta `/sistemas/` do servidor web. A página ficará em `https://lab.mrs-monteiro.com/sistemas/` se o subdomínio e a pasta já estiverem configurados.

Caso o portal esteja em **Cloudflare Pages** e queiras a API via Pages Functions, publicar o projeto como raiz de um projeto Pages e usar a rota `/api/visitas`. O projeto ficará na raiz desse projeto Pages (ou à rota que o DNS disponibilizar). A publicação como subpasta de outro projeto requer integrar a pasta `functions/api/visitas.js` no projeto raiz e garantir que o módulo `cloudflare/metrics-core.mjs` está no caminho importado.

## 4. Ligar visitas reais à Cloudflare

O endereço enviado na conversa identifica uma propriedade **Cloudflare Web Analytics**, mas o dashboard é privado. Não é possível obter os valores reais apenas através do URL partilhado, nem é seguro publicar uma API token no JavaScript.

Nesta versão, a API aceita os nomes de configuração seguintes, que devem ser definidos **só no servidor**:

| Nome | Exemplo / Explicação |
| --- | --- |
| `CF_ACCOUNT_ID` | ID da conta Cloudflare (32 caracteres hexadecimais). É visível no dashboard. |
| `CF_SITE_TAG` | Tag da propriedade Web Analytics (32 caracteres hexadecimais). É visível no URL e no snippet da Cloudflare. |
| `CF_ANALYTICS_TOKEN` | **Segredo:** API Token com permissão **Account → Account Analytics → Read** e âmbito limitado à conta. Nunca incluir no repositório ou páginas públicas. |
| `CF_HOSTNAME` | Opcional, por exemplo `lab.mrs-monteiro.com`. Filtra as métricas pelo hostname para não somar subdomínios da mesma propriedade. |

### Opção A — Cloudflare Pages (recomendada se o site já estiver em Pages)

1. Em **Workers & Pages**, escolher o projeto e publicar a pasta como site com Pages Functions.
2. Configurar `CF_ACCOUNT_ID`, `CF_SITE_TAG` e `CF_HOSTNAME` em **Settings → Variables and Secrets**.
3. Configurar `CF_ANALYTICS_TOKEN` como **secret**, não como variável pública.
4. Publicar a atualização. O ficheiro `functions/api/visitas.js` disponibiliza `GET /api/visitas`.
5. Verificar o JSON em `https://<dominio-do-portal>/api/visitas` e a página **Visitas ao portal** no laboratório.

### Opção B — Cloudflare Worker (site alojado noutro serviço)

1. Criar um Worker com o ficheiro `cloudflare/visitas-worker.mjs` e o módulo `cloudflare/metrics-core.mjs` (deploy com suporte a módulos/imports).
2. Associar uma rota `lab.mrs-monteiro.com/api/visitas*` ao Worker, desde que o hostname esteja proxied pela Cloudflare.
3. Definir os mesmos valores e o **secret** nas definições do Worker.
4. Confirmar que `GET /api/visitas` devolve JSON e abrir a área de visitas do laboratório.

Se a API estiver noutra rota, definir **antes** de `assets/app.js`:

```html
<script>window.MRS_VISITS_API = '/minha-rota/api/visitas';</script>
```

### Exemplo de resposta da API (formato, NÃO valores reais)

```json
{
  "source": "cloudflare-web-analytics",
  "timezone": "UTC",
  "days": [
    {"date": "2026-10-29", "visits": 0, "pageviews": 0}
  ]
}
```

A resposta real inclui os **últimos 30 dias**, até ao dia atual UTC. São apresentados valores agregados; `visits` **não deve ser chamado de visitantes únicos**. O dashboard Web Analytics pode apresentar números ligeiramente diferentes devido a amostragem e regras de filtragem. A API pode não estar disponível em todas as configurações/planos; se o acesso for recusado, o portal mostra o estado de configuração em vez de fabricar números.

## 5. Colocar contador no portal MRS existente

Para mostrar um pequeno contador na página inicial do teu portal, sem copiar o dashboard:

```html
<div id="mrs-visitas" data-api="/api/visitas"></div>
<script defer src="/sistemas/assets/portal-visitas-widget.js"></script>
```

Ajustar o caminho do script conforme o alojamento. O componente mostra apenas as visitas agregadas de 7 e 30 dias, ou uma mensagem de indisponibilidade. A API foi pensada para divulgar **apenas totais**, não métricas detalhadas. Os dados mais completos (incluindo geografia e URLs) devem continuar privados no painel Cloudflare, com acesso do administrador.

## 6. Boas práticas e segurança

- Nunca usar o token no `index.html`, no `assets/app.js` ou no widget de visitas.
- O endpoint público permite consultar totais de visitas; aplica proteção adicional (por exemplo, Cloudflare Access) se quiseres tornar esses dados privados, **mas nesse caso um contador público não deverá consumi-los diretamente**.
- Não contar `visits` como pessoas únicas. `pageviews` representa visualizações de páginas registadas no Web Analytics.
- Os filtros e limites do GraphQL podem variar consoante o produto/plano. Testar primeiro com a conta autenticada.
- A Cloudflare pode injetar automaticamente o beacon Web Analytics em sites proxied; não duplicar o script manual sem necessidade.
- Nos simuladores, nada é ligado a computadores reais. Para scripts, rever código, dados recolhidos e permissões antes de utilizar.
- O Active Directory virtual e o progresso dos desafios usam `localStorage` do navegador; não contêm credenciais e não são sincronizados entre equipamentos.

## 7. Requisitos e próximas melhorias

A V1 funciona com HTML, CSS e JavaScript, inclusive em dispositivos móveis. Para integração com infraestruturas reais são necessários mecanismos separados de autenticação, autorização, auditoria, controlo de comandos e aprovação. Não expor scripts de administração em páginas públicas com execução remota.

Evoluções sugeridas: autenticação do administrador, métricas agregadas por módulo, biblioteca de scripts versionados, simulador GPO mais detalhado, novas provas de diagnóstico e percurso DevOps/Kubernetes.
