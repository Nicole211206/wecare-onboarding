# Análise e Plano de Migração — wecare-onboarding → Jarvis (VPS)

## 0. Status da investigação no Jarvis (feita em 03/08)

- Porta **18791 está livre**, sem processo escutando.
- Portas vizinhas saudáveis: 18790 (wecare-parceiros) e 18792 (claire-project) rodando uvicorn normalmente.
- Sem serviço systemd, sem pasta em `/home/jarvis/apps/`, sem lixeira relevante — **nunca houve deploy anterior deste projeto no Jarvis**.
- Único achado: `/home/jarvis/apps/claire-project/ONBOARDING-HANDOFF.md` — é a especificação original (o brief que gerou este repo), não resto de deploy.
- SSH do Jarvis usa porta **22022**, user **root**, chave `~/.ssh/wecare_vps` (já configurado em `~/.ssh/config`).
- Conclusão: zero risco de conflito ou perda de dados nessa etapa. Migração parte do zero.

## 1. Situação atual (Cloudflare)

- **Frontend**: `index.html`, `form.html`, `vistoria.html` + `css/` + `js/app.js` (336K) — hoje em Cloudflare Pages.
- **Backend**: `worker.js` (Cloudflare Worker), 1186 linhas, com KV (`ONBOARDING_KV`).
- **Fotos**: guardadas **binário direto no KV** (não em arquivo), servidas via `/foto`.
- **AUTH_TOKEN em texto puro no `wrangler.toml`** (`wecare_sync_7k2p9m`) — vira secret na migração, nunca mais em arquivo versionado.
- Você **não tem acesso à conta Cloudflare** (está na conta pessoal da Nicole) — motivo forte pra migrar tudo, não só o front.
- KV free tier: sem backup automático, sem versionamento, limite de escritas/dia.

### Integrações externas já existentes no worker.js (importante — não é só Cloudflare Workers AI)

| Serviço | Uso | Env var |
|---|---|---|
| Cloudflare Workers AI (`env.AI`) | `/extrair-formulario` — extrai respostas de formulário a partir de transcrição de reunião, usando `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | `AI` (binding nativo Cloudflare) |
| ~~Google Gemini~~ | ~~`/analisar-midia` — analisava fotos/frames de vistoria via `gemini-1.5-flash`~~ | **Descartado — Nicole confirmou que não funciona. Não portar, endpoint será eliminado.** |
| **Anthropic (Claude Haiku)** | `/analisar-drive` — lê arquivos de uma pasta do Google Drive (docs, sheets, imagens) e extrai dados de captação | `ANTHROPIC_KEY` |
| **Google Drive API (OAuth)** | Usado por `/analisar-drive` e `/drive-debug` para listar/baixar arquivos de uma pasta compartilhada | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` |

**Decisão já tomada: consolidar tudo em Anthropic (Claude).** Isso significa:
- `/extrair-formulario` (hoje Workers AI/Llama) → migra pra Claude.
- `/analisar-midia` (Gemini) → **eliminado**, não será portado. Se a análise de fotos de vistoria por IA for necessária no futuro, reimplementar do zero direto com Claude (visão), não como port do endpoint quebrado.
- `/analisar-drive` (já Claude Haiku) → mantém como está, só muda de Cloudflare Worker pra FastAPI.
- Resultado: um único provedor de IA no backend inteiro, sem Gemini nem binding nativo do Cloudflare.

## 2. Mapeamento completo de endpoints (worker.js → FastAPI)

| Endpoint atual | Método | Função | Observação pra migração |
|---|---|---|---|
| `/load` | GET | Estado completo (`wc_state`) | Vira leitura de tabelas SQLite, montado em JSON no mesmo formato |
| `/save` | POST | Merge seguro + backup/hora | **Portar a lógica de merge, não reescrever do zero** (ver seção 3) |
| `/stats` | POST | Salva stats para a Claire | Direto |
| `/onboarding-stats` | GET | Retorna stats + prestadores (sem auth) | Manter sem auth — é o que a Claire consome hoje |
| `/form-load` | GET | Carrega formulário do imóvel (`id`, `t`=token) | Direto |
| `/form-save` | POST | Salva respostas do formulário | Direto |
| `/vistoria-load` | GET | Carrega vistoria específica (`id`, `vid`, `t`) | Direto |
| `/vistoria-save` | POST | Salva/envia vistoria | Direto |
| `/vistoria-midia` | POST | Anexa frames de foto/vídeo à vistoria | Trocar destino: disco em vez de KV |
| `/extrair-formulario` | POST | IA extrai dados de transcrição de reunião | Trocar `env.AI` (Llama via Workers AI) por chamada à API Anthropic (Claude) |
| `/imovel-dados` | GET | Metadados de fotos do imóvel (sem base64) pro Jarvis | Direto |
| `/foto` | GET | Serve foto binária (`image/jpeg`) | Ler de disco em vez de KV |
| `/imovel-fotos` | GET | Índice paginado de fotos | Direto |
| `/imovel-fotos` | POST | (mesma rota, método diferente — upload) | Confirmar com Nicole o que esse POST faz antes de portar — não documentado no README |
| `/jarvis-pending` | GET | Lista imóveis com análise de fotos pendente | **Já pensado pro Jarvis** — vira o próprio backend consultando sua fila interna |
| `/jarvis-notify` | POST | Webhook de notificação do Jarvis | Idem — vira chamada interna, não webhook externo |
| ~~`/gemini-config`~~ | ~~GET~~ | ~~Retorna API key do Gemini pro browser~~ | **Eliminado — não portar.** Expor key de IA pro client também não era boa prática. |
| ~~`/analisar-midia`~~ | ~~POST~~ | ~~Analisava fotos/frames via Gemini~~ | **Eliminado — não portar.** Nicole confirmou que não funcionava. |
| `/drive-debug` | GET | Diagnóstico de conexão Google Drive | Portar como está, útil manter |
| `/analisar-drive` | POST | Lê pasta do Drive + Claude Haiku, extrai dados de captação | Portar como está, já usa Claude |

## 3. Lógica de merge anti-sobrescrita — PORTAR, não reinventar

O worker.js documenta pelo menos 2 incidentes reais (23/07, imóvel Ária Higienópolis) de perda de dados por sobrescrita de cliente desatualizado. As funções abaixo já resolvem isso e devem ser portadas linha a linha pra Python, só trocando a estrutura de dados:

- `mergeItemArraysById` — recupera itens de array que sumiram numa sincronização "catastrófica" (encolhida brusca), casando por `id`.
- `mergeCompras` — protege contadores de itens comprados contra zeramento acidental.
- `mergeOps` — protege campos de data (fotos/limpeza/vistoria) contra sobrescrita por valor vazio.
- `mergeStatusAtivacao` — trata `status: 'ativo'` como estado terminal; nunca regride sem justificativa.
- `mergeArraySimples` — mesma proteção de encolhida catastrófica pra listas simples (plataformas/camas).
- `mergeCamposNaoVazios` — não deixa campo preenchido virar vazio numa sincronização mais nova.

## 4. Plano de migração

| Item | Decisão |
|---|---|
| Backend | FastAPI + SQLite, réplica dos endpoints da seção 2 |
| Fotos | Disco (`/home/jarvis/apps/wecare-onboarding/media/`) em vez de KV binário |
| IA (extração/análise) | **Decidido:** consolidar em API Anthropic (Claude). Gemini eliminado (não funcionava), Workers AI substituído por Claude. |
| Google Drive | Portar `/analisar-drive` e `/drive-debug` com as mesmas credenciais OAuth (mover pra secrets no Jarvis, nunca em arquivo versionado) |
| Frontend | Mesmos arquivos estáticos, servidos via nginx |
| Porta | 18791 |
| Domínio | `onboarding.wecarehosting.com.br` (nginx + Certbot SSL) |
| Merge anti-sobrescrita | Portar as 6 funções da seção 3 sem alterar a lógica |
| Auth | Manter token compartilhado (compatível com `app.js` atual) |
| ZapSign | Trocar URL do webhook pra apontar pro Jarvis |
| Claire | Trocar URL que ela consulta pra `onboarding.wecarehosting.com.br/onboarding-stats` |
| Deploy | systemd + git-based auto-deploy (mesmo cron dos outros projetos) |
| Cutover | Rodar em paralelo, testar alguns dias, só depois desligar Worker + Pages na Cloudflare |

## 5. Pendências antes de codar

1. Confirmar com a Nicole o que o `POST /imovel-fotos` faz (não está no README, achado só no código).
2. Confirmar se a cópia local dela (Windows, porta 3456) é a mesma versão deste repo do GitHub.
3. Levantar as credenciais reais do Google Drive (`GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REFRESH_TOKEN`) — hoje só existem na conta Cloudflare da Nicole, você vai precisar pedir a ela ou gerar novas. `GEMINI_API_KEY` não é mais necessária (endpoint eliminado).

## 6. Próximos passos sugeridos pro Claude Code local

1. Ler este documento.
2. Mapear o schema SQLite completo a partir do `wc_state` salvo hoje no KV (pedir um dump via `/load` pra ver a estrutura real).
3. Escrever o backend FastAPI endpoint a endpoint (seção 2), portando as funções de merge (seção 3) primeiro — são a parte crítica.
4. Subir em paralelo no Jarvis (porta 18791) sem desligar o Cloudflare.
5. Trocar URLs no `app.js`/`form.html`/`vistoria.html` pra apontar pro Jarvis, testar por alguns dias.
6. Desligar Worker + Pages só depois de confirmar zero perda de dados.
