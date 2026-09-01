from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import Base, engine
from .routers import fotos, form, ia, onboarding, vistoria

Base.metadata.create_all(bind=engine)

# Sem Alembic nesta v1 — create_all() só cria tabela que ainda não existe, nunca adiciona
# coluna nova numa tabela já existente (achado em 2026-08-21, subindo campos novos pra
# modalidades_enxoval que já tinha sido criada num deploy anterior). Migrações pontuais de
# coluna ficam aqui, uma linha de ALTER por coluna — cada uma protegida por try/except
# porque não tem jeito nativo (SQLite nem Postgres) de fazer "ADD COLUMN IF NOT EXISTS" que
# funcione idêntico nos dois: se a coluna já existe (deploy já rodou essa migração antes),
# o ALTER falha e é ignorado; se a tabela em si não existir ainda (banco novo, create_all()
# acima já criou ela com a coluna desde o início), também falha e é ignorado sem problema.
_COLUNAS_NOVAS = [
    "ALTER TABLE modalidades_enxoval ADD COLUMN tem_setup BOOLEAN",
    "ALTER TABLE modalidades_enxoval ADD COLUMN valor_setup NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN valor_por_hospede NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN setup_custo NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN setup_cobrado NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN precificacao_mensal VARCHAR",
    "ALTER TABLE modalidades_enxoval ADD COLUMN hospedes_base INTEGER",
    "ALTER TABLE modalidades_enxoval ADD COLUMN mensal_base_custo NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN mensal_base_cobrado NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN mensal_extra_custo NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN mensal_extra_cobrado NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN mensal_tabela JSON",
    "ALTER TABLE proprietarios ADD COLUMN tipo_documento VARCHAR",
    "ALTER TABLE proprietarios ADD COLUMN cpf VARCHAR",
    "ALTER TABLE proprietarios ADD COLUMN cnpj VARCHAR",
    "ALTER TABLE proprietarios ADD COLUMN razao_social VARCHAR",
    "ALTER TABLE proprietarios ADD COLUMN dados_bancarios VARCHAR",
    "ALTER TABLE proprietarios ADD COLUMN chave_pix VARCHAR",
    "ALTER TABLE modalidades_enxoval ADD COLUMN base_cobranca VARCHAR",
    "ALTER TABLE modalidades_enxoval ADD COLUMN minimo_mensal_custo NUMERIC",
    "ALTER TABLE modalidades_enxoval ADD COLUMN minimo_mensal_cobrado NUMERIC",
]
for _sql in _COLUNAS_NOVAS:
    try:
        with engine.begin() as _conn:
            _conn.execute(text(_sql))
    except Exception:
        pass

app = FastAPI(title="WeCare Onboarding")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(onboarding.router)
app.include_router(form.router)
app.include_router(vistoria.router)
app.include_router(fotos.router)
app.include_router(ia.router)


@app.get("/")
def root():
    return {"ok": True, "service": "wecare-onboarding-backend"}
