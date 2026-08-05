#!/usr/bin/env bash
# Auto-deploy do wecare-onboarding — git pull (branch develop, main fica intocada
# até o cutover) + restart condicional
# do serviço systemd. Pensado pra rodar via cron a cada 5 minutos (mesmo padrão
# do claire-project).
#
# Só mexe em nada se houver commit novo em origin/$BRANCH. Restart do backend só
# acontece se algo em backend/ mudou nesse pull — mudança só em frontend
# (index.html/form.html/vistoria.html/css/js/img) não precisa de restart, o
# nginx já serve direto do checkout.
set -euo pipefail

REPO_DIR="/home/jarvis/apps/wecare-onboarding"
BACKEND_DIR="$REPO_DIR/backend"
SERVICE_NAME="wecare-onboarding"
BRANCH="develop"
UV_BIN="/home/jarvis/.local/bin/uv"
LOG_FILE="$REPO_DIR/deploy/auto-deploy.log"
LOCK_FILE="/tmp/wecare-onboarding-autodeploy.lock"

log() { printf '%s %s\n' "$(date -Is)" "$1" >> "$LOG_FILE"; }

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
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$LOCAL_REV" "$REMOTE_REV")"
BACKEND_CHANGED=false
grep -q '^backend/' <<<"$CHANGED_FILES" && BACKEND_CHANGED=true

log "Novo commit detectado (${LOCAL_REV:0:8} -> ${REMOTE_REV:0:8}). Arquivos alterados:"
log "$(sed 's/^/    /' <<<"$CHANGED_FILES")"

if ! git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "ERRO: git pull --ff-only falhou (histórico divergente?). Abortando deploy."
  exit 1
fi

if [ "$BACKEND_CHANGED" = true ]; then
  cd "$BACKEND_DIR"

  if ! "$UV_BIN" sync >> "$LOG_FILE" 2>&1; then
    log "ERRO: uv sync falhou. Abortando restart do serviço."
    exit 1
  fi

  # Sem Alembic nesta v1 — Base.metadata.create_all() no startup do FastAPI
  # cria tabelas novas sozinho. Se um dia precisar de migração real (alterar
  # coluna existente, não só criar tabela nova), essa é a hora de adicionar.
  if sudo /usr/bin/systemctl restart "$SERVICE_NAME"; then
    log "Backend mudou — serviço reiniciado. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
  else
    log "ERRO: falha ao reiniciar $SERVICE_NAME via systemctl. Verifique o sudoers (deploy/sudoers/wecare-onboarding-deploy)."
    exit 1
  fi
else
  log "Backend não mudou nesse pull — sem restart."
fi

log "Deploy concluído. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
