MRS MONTEIRO LAB — site independente

1. Criar repositório público 'mrs-lab' na organização mrs-monteiro (ou conta com permissão para Pages).
2. Carregar index.html e CNAME na raiz, branch main.
3. Settings > Pages > Deploy from a branch > main / (root) > Save.
4. Spaceship Advanced DNS: criar CNAME Host=lab Value=mrs-monteiro.github.io TTL=30 min.
5. Settings > Pages: custom domain lab.mrs-monteiro.com, verificar DNS e ativar Enforce HTTPS.
6. Testar https://lab.mrs-monteiro.com/. O domínio 'lab' não pode ter registos A/AAAA/CNAME conflitantes.

Nota: Se GitHub Pages não estiver disponível no repositório da organização, rever permissões/planos ou usar repositório numa conta com Pages.
