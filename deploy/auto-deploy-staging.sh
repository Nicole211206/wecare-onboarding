#!/usr/bin/env bash
# Auto-deploy do ambiente de DEV do wecare-onboarding — git pull (branch
# develop) + restart condicional do serviço systemd. Cópia parametrizada de
# auto-deploy.sh (que cuida só de produção), mesma lógica do
# claire-project-staging: aponta pro checkout/serviço de dev e acompanha
# develop em vez de main.
#
# WC_SYNC/WC_WORKER_URL do index.html/form.html/vistoria.html: o valor
# commitado no repo é sempre o de PRODUÇÃO (aponta pro domínio/token de
# onboarding.wecarehosting.com.br), porque essa mesma linha existe tanto em
# develop quanto em main. Por isso esse script SEMPRE reescreve essas linhas
# pro domínio/token de dev depois de cada pull — nunca commitar esse valor de
# volta pro git, senão um merge develop->main vaza a URL/token de dev pra
# produção.
set -euo pipefail

REPO_DIR="/home/jarvis/apps/wecare-onboarding-staging"
BACKEND_DIR="$REPO_DIR/backend"
SERVICE_NAME="wecare-onboarding-staging"
BRANCH="develop"
UV_BIN="/home/jarvis/.local/bin/uv"
LOG_FILE="$REPO_DIR/deploy/auto-deploy-staging.log"
LOCK_FILE="/tmp/wecare-onboarding-staging-autodeploy.lock"
# Token lido do .env do próprio dev (nunca hardcoded aqui/no repo).
DEV_TOKEN="$(grep '^AUTH_TOKEN=' "$BACKEND_DIR/.env" | cut -d= -f2-)"
DEV_URL="https://dev-onboarding.wecarehosting.com.br"

log() { printf '%s %s\n' "$(date -Is)" "$1" >> "$LOG_FILE"; }

apply_dev_sync_override() {
  # -z: bloco WC_SYNC é multi-linha no index.html (url/token em linhas
  # separadas) — sed normal não casa \{[^}]*\} através de quebras de linha.
  sed -i -z -E "s#window\.WC_SYNC = \{[^}]*\};#window.WC_SYNC = {\n      url:   '${DEV_URL}',\n      token: '${DEV_TOKEN}'\n    };#" "$REPO_DIR/index.html"
  sed -i -E "s#window\.WC_WORKER_URL = '[^']*';#window.WC_WORKER_URL = '${DEV_URL}';#" "$REPO_DIR/form.html"
  sed -i -E "s#^const WC_WORKER_URL = '[^']*';#const WC_WORKER_URL = '${DEV_URL}';#" "$REPO_DIR/vistoria.html"
}

# Evita duas execuções sobrepostas (ex: um deploy anterior ainda rodando uv sync
# quando o cron dispara de novo 5min depois).
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Já existe um deploy em andamento — saindo."
  exit 0
fi

cd "$REPO_DIR"
git fetch origin "$BRANCH" --quiet

LOCAL_REV="$(git rev-parse HEAD)"
REMOTE_REV="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_REV" = "$REMOTE_REV" ]; then
  # Mesmo sem commit novo, garante que os overrides não tenham revertido pro
  # valor commitado de produção por algum motivo externo a este script (ex.:
  # um `git pull`/`git checkout` manual feito fora do auto-deploy). Idempotente
  # e barato — roda toda vez, sem log (senão o arquivo cresce à toa a cada 5min).
  apply_dev_sync_override
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$LOCAL_REV" "$REMOTE_REV")"
BACKEND_CHANGED=false
grep -q '^backend/' <<<"$CHANGED_FILES" && BACKEND_CHANGED=true

log "Novo commit detectado (${LOCAL_REV:0:8} -> ${REMOTE_REV:0:8}). Arquivos alterados:"
log "$(sed 's/^/    /' <<<"$CHANGED_FILES")"

# Reverte os overrides pro valor commitado (produção) antes do pull, senão o
# diff local (HTMLs editados) pode fazer o --ff-only falhar.
git checkout -- index.html form.html vistoria.html 2>/dev/null || true

if ! git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "ERRO: git pull --ff-only falhou (histórico divergente?). Abortando deploy."
  exit 1
fi

apply_dev_sync_override
log "WC_SYNC/WC_WORKER_URL ajustados pro domínio/token de dev (${DEV_URL})."

if [ "$BACKEND_CHANGED" = true ]; then
  cd "$BACKEND_DIR"

  if ! "$UV_BIN" sync >> "$LOG_FILE" 2>&1; then
    log "ERRO: uv sync falhou. Abortando restart do serviço."
    exit 1
  fi

  # Sem Alembic nesta v1 — Base.metadata.create_all() no startup do FastAPI
  # cria tabelas novas sozinho (mesma nota do auto-deploy.sh de produção).
  if sudo /usr/bin/systemctl restart "$SERVICE_NAME"; then
    log "Backend mudou — serviço reiniciado. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
  else
    log "ERRO: falha ao reiniciar $SERVICE_NAME via systemctl. Verifique o sudoers (deploy/sudoers/wecare-onboarding-staging-deploy)."
    exit 1
  fi
else
  log "Backend não mudou nesse pull — sem restart."
fi

log "Deploy de dev concluído. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
