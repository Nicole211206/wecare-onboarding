# Deploy — wecare-onboarding no Jarvis (porta 18791)

Migração de Cloudflare Worker+KV para FastAPI+SQLite, mesmo padrão do
claire-project (systemd + nginx + auto-deploy via cron). Ver
`docs/ANALISE-MIGRACAO.md` na raiz do repo pro plano completo.

## 0. Pré-requisitos já confirmados

- Porta 18791 livre no Jarvis, sem conflito com 18790 (wecare-parceiros) e
  18792 (claire-project).
- SSH: `ssh -i ~/.ssh/wecare_vps -p 22022 root@143.95.210.92`.
- DNS de `onboarding.wecarehosting.com.br` já aponta pro Jarvis.

## 1. Clonar o repo no Jarvis

```bash
cd /home/jarvis/apps
git clone <url-do-repo-github> wecare-onboarding
cd wecare-onboarding/backend
```

## 2. Configurar `.env` (secrets — nunca commitar)

```bash
cp .env.example .env
# editar .env com os valores reais:
#   AUTH_TOKEN=<token compartilhado com o app.js — hoje wecare_sync_7k2p9m>
#   ANTHROPIC_API_KEY=<chave da conta Anthropic>
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN=<credenciais OAuth do Drive — pendência 3 do ANALISE-MIGRACAO.md>
```

## 3. Instalar dependências e subir uma vez manualmente pra testar

```bash
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 18791
# Ctrl+C depois de confirmar que subiu sem erro
```

## 4. Importar os dados reais do KV (migração única, não automática)

Ainda **não existe** um script de import automatizado neste primeiro corte —
os dados reais (10 imóveis, 4 usuários, etc.) foram só *lidos* do worker
(`GET /load`) pra desenhar o schema, nunca gravados no SQLite de produção.
Antes do cutover, alguém precisa:

1. Buscar o dump real: `curl "https://wecare-onboarding.nicole-0e7.workers.dev/load?token=<TOKEN>"`.
2. POST desse mesmo JSON pro `/save` do backend novo (isso já passa pela
   lógica de merge/fotos-pro-disco — testado nesta sessão com os dados reais,
   ver resumo da conversa).
3. Confirmar com `/load` que os 10 imóveis, fotos e users vieram certos.

## 5. systemd

```bash
sudo cp deploy/systemd/wecare-onboarding.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wecare-onboarding
sudo systemctl status wecare-onboarding
```

## 6. nginx (HTTP primeiro, depois Certbot)

```bash
sudo cp deploy/nginx/proxy_params_onboarding /etc/nginx/
sudo cp deploy/nginx/onboarding.wecarehosting.com.br.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/onboarding.wecarehosting.com.br.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Confirmar que `http://onboarding.wecarehosting.com.br/load?token=...` responde
antes de rodar o Certbot.

## 7. Certbot (SSL)

```bash
sudo certbot --nginx -d onboarding.wecarehosting.com.br
```

O certbot reescreve o `.conf` sozinho (server 443 + redirect 80→443), mesmo
formato final do `claire.wecarehosting.com.br.conf`. Não editar os caminhos
`ssl_certificate` à mão antes disso — `nginx -t` falha se o certificado ainda
não existe.

## 8. auto-deploy (cron + sudoers)

```bash
sudo cp deploy/sudoers/wecare-onboarding-deploy /etc/sudoers.d/
sudo chmod 440 /etc/sudoers.d/wecare-onboarding-deploy
sudo visudo -c

crontab -u jarvis -e
# colar a linha de deploy/cron/wecare-onboarding-autodeploy
```

## 9. Cutover (trocar URLs no frontend)

Depois do backend validado em paralelo (alguns dias, conforme o plano):

1. Trocar `https://wecare-onboarding.nicole-0e7.workers.dev` por
   `https://onboarding.wecarehosting.com.br` em `index.html`, `form.html`,
   `vistoria.html` (já feito nesta sessão, ver commit) e fazer deploy do
   Cloudflare Pages com essa mudança, OU passar a servir o próprio frontend
   do Jarvis (o nginx acima já está preparado pra isso).
2. Trocar a URL que a Claire consulta pra `onboarding.wecarehosting.com.br/onboarding-stats`.
3. Trocar o webhook do ZapSign pra apontar pro Jarvis.
4. Só depois de confirmar zero perda de dados: desligar Worker + Pages na Cloudflare.

## Notas de segurança herdadas do sistema atual (não resolvidas nesta migração)

- **Senhas de `wc_users`/`wc_membros` continuam em texto puro** no banco —
  o login do app.js é comparação client-side (`app.js:361`), então hashear
  no backend quebraria o login sem um endpoint de `/login` server-side (fora
  do escopo desta migração, que porta os 16 endpoints como estão). Recomendo
  tratar isso numa tarefa separada antes de abrir o sistema pra mais gente.
- `AUTH_TOKEN` vira secret em `.env` (nunca mais em arquivo versionado).
