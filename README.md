# WeCare Onboarding

Sistema de onboarding de imóveis da WeCare Hosting.  
Kanban 7 fases · ZapSign · Formulário público · Intel de Mercado · Enxoval · Compras ML

---

## 🚀 Deploy (GitHub + Cloudflare Pages)

### 1. Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome: `wecare-onboarding`
3. Privado ✓ → **Create repository**
4. No seu computador, abra o terminal dentro da pasta `wecare-onboarding`:

```bash
git init
git add .
git commit -m "feat: WeCare Onboarding v2"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/wecare-onboarding.git
git push -u origin main
```

---

### 2. Cloudflare Pages (frontend)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. **Connect to Git** → Selecione `wecare-onboarding`
3. Configurações:
   - **Framework preset:** None
   - **Build command:** *(vazio)*
   - **Build output directory:** `/`
4. **Save and Deploy**
5. Seu site estará em `https://wecare-onboarding.pages.dev`

---

### 3. Worker + KV (backend/sync)

```bash
# Na pasta do projeto:
npm install -g wrangler   # ou: npx wrangler

# Login na Cloudflare
npx wrangler login

# Criar o namespace KV
npx wrangler kv namespace create ONBOARDING_KV
# → Copie o ID retornado

# Abra wrangler.toml e cole o ID:
# id = "COLE_O_ID_AQUI"

# Deploy do Worker
npx wrangler deploy
```

4. No painel Cloudflare → **Workers & Pages** → `wecare-onboarding` → **Settings** → **Variables**:
   - Adicione: `AUTH_TOKEN` = `wc_token_SEU_TOKEN_SECRETO`

---

### 4. Configurar o app

Abra `index.html` e preencha:

```js
window.WC_SYNC = {
  url:   'https://wecare-onboarding.SEU_SUBDOMINIO.workers.dev',
  token: 'wc_token_SEU_TOKEN_SECRETO'   // mesmo do passo 3
};
```

Depois, commit + push:
```bash
git add index.html
git commit -m "config: worker URL"
git push
```
O Cloudflare Pages redeploya automaticamente em ~30 segundos.

---

### 5. Configurar form.html (formulário do proprietário)

Abra `form.html` e preencha:
```js
window.WC_WORKER_URL = 'https://wecare-onboarding.SEU_SUBDOMINIO.workers.dev';
```

---

### 6. ZapSign — webhook automático

No painel ZapSign:
- **Configurações** → **Webhooks** → Adicionar URL:
  ```
  https://wecare-onboarding.SEU_SUBDOMINIO.workers.dev/zapsign-webhook
  ```
- Evento: **Assinatura realizada**

Quando o proprietário assinar, o sistema avança automaticamente para a fase **Compras**.

---

### 7. Integração com a Claire (KPI de Onboarding)

O Worker expõe `GET /onboarding-stats` (sem autenticação).  
Na Claire, configure essa URL para ler o KPI "Tempo de Ativação".

---

## 👤 Login padrão

| Campo | Valor |
|---|---|
| E-mail | `admin@wecare.com` |
| Senha | `wecare2025` |

⚠️ **Troque a senha no painel Usuários após o primeiro acesso.**

---

## 📁 Estrutura

```
wecare-onboarding/
├── index.html          # App principal
├── form.html           # Formulário público (proprietário)
├── worker.js           # Cloudflare Worker (API + KV)
├── wrangler.toml       # Config do Worker
├── css/styles.css      # Design WeCare (gradiente vermelho→roxo)
└── js/app.js           # Lógica completa
```

---

## 🔄 Atualizar o sistema

Qualquer mudança nos arquivos → commit + push → Cloudflare Pages redeploya sozinho.

```bash
git add .
git commit -m "feat: descrição da mudança"
git push
```
