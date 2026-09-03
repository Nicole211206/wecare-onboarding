from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import models
from .database import Base, SessionLocal, engine
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

# Limpeza de dados (2026-09-01) — campos de "vistoria_campos" que duplicavam item do catálogo
# de Compras (já coberto por "Itens Obrigatórios"/"Checklist de Enxoval" na vistoria). Feita
# antes via curl direto no /save, mas uma aba do admin com estado antigo em cache reenviava os
# 57 campos por cima da correção toda vez que alguém salvava algo nela — por isso virou
# migração aqui: roda sozinha a cada start do backend, direto no banco, sem depender de
# nenhum cliente estar com o estado certo. Idempotente — rodar de novo não faz nada (os
# labels já não existem mais / o campo de Ar-condicionado já existe).
_VISTORIA_CAMPOS_DUPLICADOS = [
    "Jogo de Cama Basic Percalle", "Cobertor Aspen II", "Edredom Premier Hotel",
    "Capa p/ Edredom Hotel 180 fios c/ Zíper", "Fronha Basic Percalle c/ Abas",
    "Protetor de Colchão", "Travesseiro Sanomed", "Protetor de Travesseiro",
    "Berço Portátil", "Banheira Portátil", "Persiana Blackout",
    "Toalha de Banho Lory Hotel", "Toalha de Rosto Lory Hotel", "Tapete Piso Luxor Hotel",
    "Dispenser de Sabonete", "Secador de Cabelo", "Xícaras (kit 6)", "Copos (kit 6)",
    "Pratos de Sobremesa (kit 6)", "Taças (kit 6)", "Talheres (24 peças)",
    "Abridor de Vinho e Cerveja", "Balde para Gelo", "Jogo de Panelas (kit completo)",
    "Colheres para Cozinhar (kit completo)", "Escorredor de Pratos", "Baixelas (4)",
    "Facas para Cozinha (kit completo)", "Liquidificador", "Sanduicheira",
    "Cafeteira Nespresso Essenza Mini", "Microondas", "Purificador de Água",
    "Chaleira Elétrica", "Air Fryer", "Panos de Prato (10)", "Lixeira de Pia",
    "Abridor de lata", "Passadeira a Vapor", "Pano de chão (10)", "Balde (2)",
    "Lixeira de banheiro", "Pratos Tradicionais (kit 6)", "Potes com Tampa (10)",
    "Detector de Fumaça", "Escada", "Vassoura", "Pá de lixo", "Rodo",
    "Pano Multiuso (10)", "Ar-condicionado quente?", "Ar-condicionado frio?",
]
try:
    with SessionLocal() as _db:
        _db.query(models.VistoriaCampo).filter(
            models.VistoriaCampo.label.in_(_VISTORIA_CAMPOS_DUPLICADOS)
        ).delete(synchronize_session=False)
        if not _db.query(models.VistoriaCampo).filter(models.VistoriaCampo.label == "Ar-condicionado").first():
            _db.add(
                models.VistoriaCampo(
                    id="vc_ar_condicionado_migracao",
                    label="Ar-condicionado",
                    tipo="select",
                    escopo="comodo",
                    opcoes=["Não tem", "Só frio", "Quente e frio"],
                    comodos_tipos="todos",
                    ordem=0,
                )
            )
        _db.commit()
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
