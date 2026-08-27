"""Reconstrói/persiste o dict shape de wc_state (o mesmo JSON que vivia
inteiro numa chave do KV) a partir das tabelas SQLite. Mantém o formato de
saída idêntico ao worker.js para o front não precisar mudar, exceto
`fotos[].data`, que passa a ser uma URL para /foto em vez de base64 cru
(o <img src> renderiza igual — ver ANALISE-MIGRACAO.md e decisão de arquitetura
combinada na conversa)."""

from __future__ import annotations

import base64
import re
import time
import uuid
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import models
from .config import settings

DATA_URL_RE = re.compile(r"^data:([^;]+);base64,(.+)$", re.DOTALL)

# (chave no JSON, atributo na model, tipo)
IMOVEL_SCALARS = [
    ("nome", "nome"),
    ("status", "status"),
    ("statusAnterior", "status_anterior"),
    ("dataCriacao", "data_criacao"),
    ("dataAtivacao", "data_ativacao"),
    ("dataContratoAssinado", "data_contrato_assinado"),
    ("contratoAssinado", "contrato_assinado"),
    ("incluirKpiClaire", "incluir_kpi_claire"),
    ("incluirSetupClaire", "incluir_setup_claire"),
    ("mesReferenciaKpi", "mes_referencia_kpi"),
    ("valorSetupCobrado", "valor_setup_cobrado"),
    ("formToken", "form_token"),
    ("claudeAnalisadoEm", "claude_analisado_em"),
    ("jarvisPreenchidoEm", "jarvis_preenchido_em"),
    ("fotosIaSolicitadoEm", "fotos_ia_solicitado_em"),
]
IMOVEL_JS_KEYS = {js for js, _ in IMOVEL_SCALARS} | {"id", "fotos"}


def foto_url(base_url: str, imovel_id: str, index: int, token: str) -> str:
    # Mesmo contrato de query string do worker.js original (id/index/token),
    # pra /imovel-fotos e integrações externas (Jarvis) continuarem batendo.
    return f"{base_url}/foto?id={imovel_id}&index={index}&token={token}"


def _imovel_to_dict(row: models.Imovel, fotos: list[models.Foto], base_url: str, token: str) -> dict:
    d = dict(row.extra or {})
    d["id"] = row.id
    for js_key, attr in IMOVEL_SCALARS:
        d[js_key] = getattr(row, attr)
    ordenadas = sorted(fotos, key=lambda x: x.ordem)
    d["fotos"] = [
        {
            "id": f.id,
            "nome": f.nome,
            "tipo": f.tipo,
            "fonte": f.fonte,
            "data": foto_url(base_url, row.id, idx, token),
        }
        for idx, f in enumerate(ordenadas)
    ]
    return d


def _imovel_split(im: dict) -> tuple[dict, dict]:
    """Separa o dict do imóvel (formato JSON) em (colunas escalares, extra)."""
    scalars = {}
    for js_key, attr in IMOVEL_SCALARS:
        if js_key in im:
            scalars[attr] = im[js_key]
    extra = {k: v for k, v in im.items() if k not in IMOVEL_JS_KEYS}
    return scalars, extra


def _save_fotos_to_disk(db: Session, imovel_id: str, fotos_in: list[dict]) -> None:
    """Recebe o array `fotos` como veio no body do /save. Itens com `data`
    em base64 (upload novo, vindo do front) são gravados em disco; itens que
    já são metadados (nome/tipo/fonte, sem base64 novo — já persistidos)
    são ignorados. Fotos que saíram do array (removidas no front, e que
    sobreviveram à checagem de encolhida catastrófica em merge.py) são
    apagadas do disco."""
    existentes = {f.id: f for f in db.scalars(select(models.Foto).where(models.Foto.imovel_id == imovel_id))}
    ids_recebidos = set()
    pasta = settings.media_dir / imovel_id / "fotos"

    for idx, f in enumerate(fotos_in):
        if not isinstance(f, dict):
            continue
        foto_id = f.get("id") or f"foto_{uuid.uuid4().hex[:12]}"
        ids_recebidos.add(foto_id)
        data = f.get("data") or ""
        match = DATA_URL_RE.match(data)
        if not match:
            # já é metadado/URL (foto existente, sem alteração) — só garante ordem
            if foto_id in existentes:
                existentes[foto_id].ordem = idx
            continue
        # upload novo: decodifica e grava em disco
        pasta.mkdir(parents=True, exist_ok=True)
        content_type, b64 = match.group(1), match.group(2)
        ext = (content_type.split("/")[-1] or "jpg").split("+")[0]
        path = pasta / f"{foto_id}.{ext}"
        path.write_bytes(base64.b64decode(b64))
        if foto_id in existentes:
            row = existentes[foto_id]
            row.nome = f.get("nome") or row.nome
            row.tipo = content_type
            row.path = str(path)
            row.ordem = idx
        else:
            db.add(
                models.Foto(
                    id=foto_id,
                    imovel_id=imovel_id,
                    nome=f.get("nome"),
                    tipo=content_type,
                    fonte=f.get("fonte") or "upload",
                    path=str(path),
                    ordem=idx,
                    criado_em=f.get("criadoEm"),
                )
            )

    # remove do disco/banco as fotos que não sobreviveram ao merge
    for foto_id, row in existentes.items():
        if foto_id not in ids_recebidos:
            p = Path(row.path)
            if p.exists():
                p.unlink()
            db.delete(row)


def get_state(db: Session, base_url: str, token: str) -> dict:
    imoveis = db.scalars(select(models.Imovel).order_by(models.Imovel.ordem)).all()
    fotos_por_imovel: dict[str, list[models.Foto]] = {}
    for f in db.scalars(select(models.Foto)):
        fotos_por_imovel.setdefault(f.imovel_id, []).append(f)

    state = {
        "wc_imoveis": [_imovel_to_dict(im, fotos_por_imovel.get(im.id, []), base_url, token) for im in imoveis],
        "wc_users": [
            {"email": u.email, "senha": u.senha, "nome": u.nome, "perfil": u.perfil}
            for u in db.scalars(select(models.User).order_by(models.User.ordem))
        ],
        "wc_membros": [
            {"id": m.id, "nome": m.nome, "funcao": m.funcao, "email": m.email, "senha": m.senha}
            for m in db.scalars(select(models.Membro).order_by(models.Membro.ordem))
        ],
        "wc_prestadores": [
            {
                "nome": p.nome,
                "tipo": p.tipo,
                "telefone": p.telefone,
                "cidade": p.cidade,
                "nota": p.nota,
                "valor": p.valor,
                "obs": p.obs,
            }
            for p in db.scalars(select(models.Prestador).order_by(models.Prestador.ordem))
        ],
        "wc_itens": [
            {
                "cat": i.cat,
                "nome": i.nome,
                "tipoPreco": i.tipo_preco,
                "enxovalDep": i.enxoval_dep,
                "qtdRule": i.qtd_rule,
                "link": i.link,
                "modalidades": i.modalidades,
                "preco": i.preco,
                "estoqueEnxoval": i.estoque_enxoval,
                "semSofaCama": i.sem_sofa_cama,
            }
            for i in db.scalars(select(models.Item).order_by(models.Item.ordem))
        ],
        "wc_enxoval": _enxoval_precos_to_dict(db),
        "wc_limpeza": [
            {"id": l.id, "quartos": l.quartos, "empresa": l.empresa, "custo": l.custo, "cobrado": l.cobrado}
            for l in db.scalars(select(models.Limpeza).order_by(models.Limpeza.ordem))
        ],
        "wc_limpeza_checkout": [
            {
                "id": l.id,
                "empresa": l.empresa,
                "especificacao": l.especificacao,
                "custo": l.custo,
                "cobrado": l.cobrado,
                "regiao": l.regiao,
            }
            for l in db.scalars(select(models.LimpezaCheckout).order_by(models.LimpezaCheckout.ordem))
        ],
        "wc_fotos": {
            str(c.quartos): {"min": c.min, "max": c.max, "resp": c.resp}
            for c in db.scalars(select(models.ConfigFotoPreco))
        },
        "wc_def_operacionais": [
            {"id": d.id, "nome": d.nome}
            for d in db.scalars(select(models.DefOperacional).order_by(models.DefOperacional.ordem))
        ],
        "wc_vistoria_campos": [
            {
                "id": v.id,
                "label": v.label,
                "tipo": v.tipo,
                "escopo": v.escopo,
                "opcoes": v.opcoes,
                "comodosTipos": v.comodos_tipos,
            }
            for v in db.scalars(select(models.VistoriaCampo).order_by(models.VistoriaCampo.ordem))
        ],
        "wc_templates_msg": [
            {"nome": t.nome, "texto": t.texto}
            for t in db.scalars(select(models.TemplateMsg).order_by(models.TemplateMsg.ordem))
        ],
        "wc_camas_custom": [
            {"id": c.id, "nome": c.nome, "componentes": c.componentes}
            for c in db.scalars(select(models.CamaTipoCustom).order_by(models.CamaTipoCustom.ordem))
        ],
        "wc_modelos_negocio": [
            {"id": m.id, "nome": m.nome, "etapas": m.etapas}
            for m in db.scalars(select(models.ModeloNegocio).order_by(models.ModeloNegocio.ordem))
        ],
        "wc_orcamentos": [
            {
                "id": o.id,
                "criadoEm": o.criado_em,
                "nomeCliente": o.nome_cliente,
                "observacoes": o.observacoes,
                "secoes": o.secoes,
                "fornecedorEnxoval": o.fornecedor_enxoval,
                "camas": o.camas,
                "itensSoltos": o.itens_soltos,
                "fotosValor": o.fotos_valor,
                "fotosObs": o.fotos_obs,
                "limpezaValor": o.limpeza_valor,
                "limpezaObs": o.limpeza_obs,
                "vistoriaValor": o.vistoria_valor,
                "vistoriaObs": o.vistoria_obs,
            }
            for o in db.scalars(select(models.Orcamento).order_by(models.Orcamento.criado_em))
        ],
        "wc_estoque_itens": [
            {"id": e.id, "item": e.item, "dataEntrada": e.data_entrada, "dataSaida": e.data_saida, "valor": e.valor}
            for e in db.scalars(select(models.EstoqueItem).order_by(models.EstoqueItem.data_entrada))
        ],
        "wc_anotacoes_texto": _texto(db, "anotacoes_texto"),
        "wc_manual_fornecedores": _texto(db, "manual_fornecedores"),
        "wc_processo_texto": _texto(db, "processo_texto"),
        "lastSaved": _texto(db, "_lastSaved") or 0,
    }
    return state


def _enxoval_precos_to_dict(db: Session) -> dict:
    out: dict[str, dict[str, float]] = {}
    for e in db.scalars(select(models.EnxovalPreco)):
        out.setdefault(e.item, {})[e.tipo_cama] = e.preco
    return out


def _texto(db: Session, chave: str):
    row = db.get(models.ConfigTexto, chave)
    return row.texto if row else ("" if chave != "_lastSaved" else None)


def put_state(db: Session, state: dict) -> None:
    """Persiste o dict shape de wc_state (já processado pelo merge) de volta
    nas tabelas. Substituição wholesale por coleção (mesma semântica do
    worker.js: cada /save reescreve a coleção inteira; a proteção contra
    encolhida catastrófica já rodou em merge.py antes de chegar aqui)."""

    if "wc_imoveis" in state:
        existentes = {i.id: i for i in db.scalars(select(models.Imovel))}
        vistos = set()
        for idx, im in enumerate(state["wc_imoveis"]):
            if not isinstance(im, dict) or not im.get("id"):
                continue
            vistos.add(im["id"])
            scalars, extra = _imovel_split(im)
            row = existentes.get(im["id"])
            if row is None:
                row = models.Imovel(id=im["id"])
                db.add(row)
            row.ordem = idx
            row.extra = extra
            for attr, val in scalars.items():
                setattr(row, attr, val)
            _save_fotos_to_disk(db, im["id"], im.get("fotos") or [])
        for imovel_id, row in existentes.items():
            if imovel_id not in vistos:
                for f in db.scalars(select(models.Foto).where(models.Foto.imovel_id == imovel_id)):
                    p = Path(f.path)
                    if p.exists():
                        p.unlink()
                    db.delete(f)
                db.delete(row)

    if "wc_users" in state:
        db.execute(delete(models.User))
        for idx, u in enumerate(state["wc_users"] or []):
            db.add(
                models.User(
                    email=u["email"],
                    senha=u.get("senha"),
                    nome=u.get("nome"),
                    perfil=u.get("perfil"),
                    ordem=idx,
                )
            )

    if "wc_membros" in state:
        db.execute(delete(models.Membro))
        for idx, m in enumerate(state["wc_membros"] or []):
            db.add(
                models.Membro(
                    id=m.get("id") or f"mem_{uuid.uuid4().hex[:12]}",
                    nome=m.get("nome"),
                    funcao=m.get("funcao"),
                    email=m.get("email"),
                    senha=m.get("senha"),
                    ordem=idx,
                )
            )

    if "wc_prestadores" in state:
        db.execute(delete(models.Prestador))
        for idx, p in enumerate(state["wc_prestadores"] or []):
            db.add(
                models.Prestador(
                    ordem=idx,
                    nome=p.get("nome"),
                    tipo=p.get("tipo"),
                    telefone=p.get("telefone"),
                    cidade=p.get("cidade"),
                    nota=p.get("nota"),
                    valor=p.get("valor"),
                    obs=p.get("obs"),
                )
            )

    if "wc_itens" in state:
        db.execute(delete(models.Item))
        for idx, i in enumerate(state["wc_itens"] or []):
            db.add(
                models.Item(
                    ordem=idx,
                    cat=i.get("cat"),
                    nome=i.get("nome"),
                    tipo_preco=i.get("tipoPreco"),
                    enxoval_dep=bool(i.get("enxovalDep")),
                    qtd_rule=i.get("qtdRule"),
                    link=i.get("link"),
                    modalidades=i.get("modalidades") or [],
                    preco=i.get("preco"),
                    estoque_enxoval=bool(i.get("estoqueEnxoval")),
                    sem_sofa_cama=bool(i.get("semSofaCama")),
                )
            )

    if "wc_enxoval" in state:
        db.execute(delete(models.EnxovalPreco))
        for item, precos in (state["wc_enxoval"] or {}).items():
            for tipo_cama, preco in (precos or {}).items():
                db.add(models.EnxovalPreco(item=item, tipo_cama=tipo_cama, preco=preco))

    if "wc_limpeza" in state:
        db.execute(delete(models.Limpeza))
        for idx, l in enumerate(state["wc_limpeza"] or []):
            db.add(
                models.Limpeza(
                    id=l.get("id") or f"lmp_{uuid.uuid4().hex[:12]}",
                    ordem=idx,
                    quartos=l.get("quartos"),
                    empresa=l.get("empresa"),
                    custo=l.get("custo"),
                    cobrado=l.get("cobrado"),
                )
            )

    if "wc_limpeza_checkout" in state:
        db.execute(delete(models.LimpezaCheckout))
        for idx, l in enumerate(state["wc_limpeza_checkout"] or []):
            db.add(
                models.LimpezaCheckout(
                    id=l.get("id") or f"lco_{uuid.uuid4().hex[:12]}",
                    ordem=idx,
                    empresa=l.get("empresa"),
                    especificacao=l.get("especificacao"),
                    custo=l.get("custo"),
                    cobrado=l.get("cobrado"),
                    regiao=l.get("regiao"),
                )
            )

    if "wc_fotos" in state:
        db.execute(delete(models.ConfigFotoPreco))
        for quartos, cfg in (state["wc_fotos"] or {}).items():
            db.add(
                models.ConfigFotoPreco(
                    quartos=int(quartos), min=cfg.get("min"), max=cfg.get("max"), resp=cfg.get("resp")
                )
            )

    if "wc_def_operacionais" in state:
        db.execute(delete(models.DefOperacional))
        for idx, d in enumerate(state["wc_def_operacionais"] or []):
            db.add(models.DefOperacional(id=d["id"], nome=d.get("nome"), ordem=idx))

    if "wc_vistoria_campos" in state:
        db.execute(delete(models.VistoriaCampo))
        for idx, v in enumerate(state["wc_vistoria_campos"] or []):
            db.add(
                models.VistoriaCampo(
                    id=v["id"],
                    label=v.get("label"),
                    tipo=v.get("tipo"),
                    escopo=v.get("escopo"),
                    opcoes=v.get("opcoes"),
                    comodos_tipos=v.get("comodosTipos"),
                    ordem=idx,
                )
            )

    if "wc_camas_custom" in state:
        db.execute(delete(models.CamaTipoCustom))
        for idx, c in enumerate(state["wc_camas_custom"] or []):
            db.add(
                models.CamaTipoCustom(
                    id=c["id"], nome=c.get("nome"), componentes=c.get("componentes"), ordem=idx
                )
            )

    if "wc_modelos_negocio" in state:
        db.execute(delete(models.ModeloNegocio))
        for idx, m in enumerate(state["wc_modelos_negocio"] or []):
            db.add(
                models.ModeloNegocio(
                    id=m["id"], nome=m.get("nome"), etapas=m.get("etapas"), ordem=idx
                )
            )

    if "wc_templates_msg" in state:
        db.execute(delete(models.TemplateMsg))
        for idx, t in enumerate(state["wc_templates_msg"] or []):
            db.add(models.TemplateMsg(ordem=idx, nome=t.get("nome"), texto=t.get("texto")))

    if "wc_orcamentos" in state:
        db.execute(delete(models.Orcamento))
        for o in state["wc_orcamentos"] or []:
            db.add(
                models.Orcamento(
                    id=o.get("id") or f"orc_{uuid.uuid4().hex[:12]}",
                    criado_em=o.get("criadoEm"),
                    nome_cliente=o.get("nomeCliente"),
                    observacoes=o.get("observacoes"),
                    secoes=o.get("secoes") or {},
                    fornecedor_enxoval=o.get("fornecedorEnxoval"),
                    camas=o.get("camas") or [],
                    itens_soltos=o.get("itensSoltos") or [],
                    fotos_valor=o.get("fotosValor"),
                    fotos_obs=o.get("fotosObs"),
                    limpeza_valor=o.get("limpezaValor"),
                    limpeza_obs=o.get("limpezaObs"),
                    vistoria_valor=o.get("vistoriaValor"),
                    vistoria_obs=o.get("vistoriaObs"),
                )
            )

    if "wc_estoque_itens" in state:
        db.execute(delete(models.EstoqueItem))
        for e in state["wc_estoque_itens"] or []:
            db.add(
                models.EstoqueItem(
                    id=e.get("id") or f"est_{uuid.uuid4().hex[:12]}",
                    item=e.get("item"),
                    data_entrada=e.get("dataEntrada"),
                    data_saida=e.get("dataSaida"),
                    valor=e.get("valor"),
                )
            )

    for chave, key_estado in (
        ("anotacoes_texto", "wc_anotacoes_texto"),
        ("manual_fornecedores", "wc_manual_fornecedores"),
        ("processo_texto", "wc_processo_texto"),
    ):
        if key_estado in state:
            _set_texto(db, chave, state[key_estado] or "")

    if "lastSaved" in state:
        _set_texto(db, "_lastSaved", str(state["lastSaved"]))


def _set_texto(db: Session, chave: str, texto: str) -> None:
    row = db.get(models.ConfigTexto, chave)
    if row is None:
        db.add(models.ConfigTexto(chave=chave, texto=texto))
    else:
        row.texto = texto


def hourly_backup_bucket() -> int:
    return int(time.time() // 3600)


def list_fotos_ordenadas(db: Session, imovel_id: str) -> list[models.Foto]:
    return list(
        db.scalars(
            select(models.Foto).where(models.Foto.imovel_id == imovel_id).order_by(models.Foto.ordem)
        )
    )


def get_foto_by_index(db: Session, imovel_id: str, index: int) -> models.Foto | None:
    fotos = list_fotos_ordenadas(db, imovel_id)
    if 0 <= index < len(fotos):
        return fotos[index]
    return None
