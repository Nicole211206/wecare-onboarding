"""IMPORTANTE: app/config.py instancia Settings() e app/database.py cria o
engine no nível de módulo (import time), e app/main.py roda create_all() +
ALTER TABLEs também no import — não dentro de um evento de startup. Por
isso as variáveis de ambiente abaixo têm que existir ANTES de qualquer
teste importar app.main/app.config/app.database, e usam um SQLite
temporário (nunca o wecare_onboarding.db real de dev)."""

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

_TMP_DIR = tempfile.mkdtemp(prefix="wecare-onboarding-tests-")

os.environ["AUTH_TOKEN"] = "test-token"
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DIR}/test.db"
os.environ["MEDIA_DIR"] = f"{_TMP_DIR}/media"
os.environ.setdefault("ANTHROPIC_API_KEY", "")
os.environ.setdefault("GOOGLE_CLIENT_ID", "")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "")
os.environ.setdefault("GOOGLE_REFRESH_TOKEN", "")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_client():
    """Cliente já autenticado — sobrescreve require_auth em vez de passar
    ?token= de verdade em toda chamada."""
    from app.auth import require_auth
    from app.main import app

    app.dependency_overrides[require_auth] = lambda: "test-token"
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def semear_imoveis():
    """Substitui o wc_imoveis inteiro direto no banco (preparação de teste). Desde o protocolo
    3 o /save só aceita imóveis por patch por campo (ver app/merge_campos.py)."""
    from app import state
    from app.database import SessionLocal

    def _semear(imoveis):
        with SessionLocal() as s:
            st = state.get_state(s, "", "")
            st["wc_imoveis"] = imoveis
            state.put_state_versionado(s, st)
            s.commit()

    return _semear
