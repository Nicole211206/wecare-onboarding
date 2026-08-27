from sqlalchemy import JSON, Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Imovel(Base):
    __tablename__ = "imoveis"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    nome: Mapped[str | None] = mapped_column(String)
    status: Mapped[str | None] = mapped_column(String)
    status_anterior: Mapped[str | None] = mapped_column(String)
    data_criacao: Mapped[str | None] = mapped_column(String)
    data_ativacao: Mapped[str | None] = mapped_column(String)
    data_contrato_assinado: Mapped[str | None] = mapped_column(String)
    contrato_assinado: Mapped[bool] = mapped_column(Boolean, default=False)
    incluir_kpi_claire: Mapped[bool] = mapped_column(Boolean, default=False)
    incluir_setup_claire: Mapped[bool] = mapped_column(Boolean, default=False)
    mes_referencia_kpi: Mapped[str | None] = mapped_column(String)
    valor_setup_cobrado: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    form_token: Mapped[str | None] = mapped_column(String)
    claude_analisado_em: Mapped[str | None] = mapped_column(String)
    jarvis_preenchido_em: Mapped[str | None] = mapped_column(String)
    fotos_ia_solicitado_em: Mapped[str | None] = mapped_column(String)
    # Tudo que não tem coluna própria (endereco, camas, plataformas, ops, compras,
    # custos, defLimpeza, defEnxoval, formRascunho/Respostas/Confirmados, vistorias
    # com midiaFrames em base64 (igual worker.js), comprasLotes, gastosAvulsos,
    # atualizacoes, itensExtras, eventosExtras, manutencoes, wifi, acesso etc.)
    # — ver app/state.py.
    extra: Mapped[dict] = mapped_column(JSON, default=dict)


class Foto(Base):
    __tablename__ = "fotos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    imovel_id: Mapped[str] = mapped_column(String, index=True)
    nome: Mapped[str | None] = mapped_column(String)
    tipo: Mapped[str | None] = mapped_column(String)
    fonte: Mapped[str | None] = mapped_column(String, default="upload")
    path: Mapped[str] = mapped_column(String)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    criado_em: Mapped[str | None] = mapped_column(String)


class User(Base):
    __tablename__ = "users"

    # ATENÇÃO: senha em texto puro, igual ao KV original — login é comparação
    # client-side (app.js:361), não dá pra hashear sem adicionar um endpoint
    # de login server-side (fora do escopo desta migração, fica registrado
    # como recomendação de segurança separada).
    email: Mapped[str] = mapped_column(String, primary_key=True)
    senha: Mapped[str | None] = mapped_column(String)
    nome: Mapped[str | None] = mapped_column(String)
    perfil: Mapped[str | None] = mapped_column(String)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class Membro(Base):
    __tablename__ = "membros"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nome: Mapped[str | None] = mapped_column(String)
    funcao: Mapped[str | None] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    senha: Mapped[str | None] = mapped_column(String)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class Prestador(Base):
    __tablename__ = "prestadores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    nome: Mapped[str | None] = mapped_column(String)
    tipo: Mapped[str | None] = mapped_column(String)
    telefone: Mapped[str | None] = mapped_column(String)
    cidade: Mapped[str | None] = mapped_column(String)
    nota: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    valor: Mapped[str | None] = mapped_column(String)
    obs: Mapped[str | None] = mapped_column(String)


class Item(Base):
    __tablename__ = "itens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # posição no array original — compras[] no imóvel referencia itens POR ÍNDICE
    # (chaves "0".."50" e "N_TipoCama"), então a ordem aqui não é cosmética.
    ordem: Mapped[int] = mapped_column(Integer, unique=True)
    cat: Mapped[str | None] = mapped_column(String)
    nome: Mapped[str | None] = mapped_column(String)
    tipo_preco: Mapped[str | None] = mapped_column(String)
    enxoval_dep: Mapped[bool] = mapped_column(Boolean, default=False)
    qtd_rule: Mapped[str | None] = mapped_column(String)
    link: Mapped[str | None] = mapped_column(String)
    modalidades: Mapped[list] = mapped_column(JSON, default=list)
    preco: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    estoque_enxoval: Mapped[bool] = mapped_column(Boolean, default=False)
    sem_sofa_cama: Mapped[bool] = mapped_column(Boolean, default=False)


class EnxovalPreco(Base):
    __tablename__ = "enxoval_precos"

    item: Mapped[str] = mapped_column(String, primary_key=True)
    tipo_cama: Mapped[str] = mapped_column(String, primary_key=True)
    preco: Mapped[float] = mapped_column(Numeric(asdecimal=False))


class Limpeza(Base):
    __tablename__ = "limpeza"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    quartos: Mapped[int | None] = mapped_column(Integer)
    empresa: Mapped[str | None] = mapped_column(String)
    custo: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    cobrado: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))


class LimpezaCheckout(Base):
    __tablename__ = "limpeza_checkout"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    empresa: Mapped[str | None] = mapped_column(String)
    especificacao: Mapped[str | None] = mapped_column(String)
    custo: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    cobrado: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    regiao: Mapped[str | None] = mapped_column(String)


class DefOperacional(Base):
    __tablename__ = "def_operacionais"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nome: Mapped[str | None] = mapped_column(String)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class VistoriaCampo(Base):
    __tablename__ = "vistoria_campos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    label: Mapped[str | None] = mapped_column(String)
    tipo: Mapped[str | None] = mapped_column(String)
    escopo: Mapped[str | None] = mapped_column(String)
    opcoes: Mapped[list | None] = mapped_column(JSON)
    comodos_tipos: Mapped[list | None] = mapped_column(JSON)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class TemplateMsg(Base):
    __tablename__ = "templates_msg"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    nome: Mapped[str | None] = mapped_column(String)
    texto: Mapped[str | None] = mapped_column(Text)


class CamaTipoCustom(Base):
    __tablename__ = "cama_tipos_custom"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nome: Mapped[str | None] = mapped_column(String)
    componentes: Mapped[list | None] = mapped_column(JSON)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class ModeloNegocio(Base):
    __tablename__ = "modelos_negocio"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nome: Mapped[str | None] = mapped_column(String)
    etapas: Mapped[list | None] = mapped_column(JSON)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class Orcamento(Base):
    __tablename__ = "orcamentos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    criado_em: Mapped[str | None] = mapped_column(String)
    nome_cliente: Mapped[str | None] = mapped_column(String)
    observacoes: Mapped[str | None] = mapped_column(String)
    secoes: Mapped[dict] = mapped_column(JSON, default=dict)
    fornecedor_enxoval: Mapped[str | None] = mapped_column(String)
    camas: Mapped[list] = mapped_column(JSON, default=list)
    itens_soltos: Mapped[list] = mapped_column(JSON, default=list)
    fotos_valor: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    fotos_obs: Mapped[str | None] = mapped_column(String)
    limpeza_valor: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    limpeza_obs: Mapped[str | None] = mapped_column(String)
    vistoria_valor: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    vistoria_obs: Mapped[str | None] = mapped_column(String)


class EstoqueItem(Base):
    __tablename__ = "estoque_itens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    item: Mapped[str | None] = mapped_column(String)
    data_entrada: Mapped[str | None] = mapped_column(String)
    data_saida: Mapped[str | None] = mapped_column(String)
    valor: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))


class ConfigFotoPreco(Base):
    __tablename__ = "config_fotos_precos"

    quartos: Mapped[int] = mapped_column(Integer, primary_key=True)
    min: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    max: Mapped[float | None] = mapped_column(Numeric(asdecimal=False))
    resp: Mapped[str | None] = mapped_column(String)


class ConfigTexto(Base):
    __tablename__ = "config_textos"

    chave: Mapped[str] = mapped_column(String, primary_key=True)
    texto: Mapped[str | None] = mapped_column(Text)


class Stats(Base):
    __tablename__ = "stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    atualizado_em: Mapped[str | None] = mapped_column(String)


class Backup(Base):
    __tablename__ = "backups"

    hora_bucket: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    criado_em: Mapped[str] = mapped_column(String)
