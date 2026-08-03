from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from .. import models, state
from ..auth import require_auth
from ..database import get_db

router = APIRouter()


def _find_imovel_row(db: Session, imovel_id: str) -> models.Imovel | None:
    return db.get(models.Imovel, imovel_id)


@router.get("/imovel-dados")
def imovel_dados(id: str = "", db: Session = Depends(get_db), token: str = Depends(require_auth)):
    if not id:
        return {"ok": False, "error": "id obrigatório"}
    im = _find_imovel_row(db, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    fotos = state.list_fotos_ordenadas(db, id)
    extra = im.extra or {}
    return {
        "ok": True,
        "imovel": {
            "id": im.id,
            "nome": im.nome,
            "endereco": extra.get("endereco"),
            "proprietarioNome": extra.get("proprietarioNome"),
            "proprietarioTel": extra.get("proprietarioTel"),
            "quartos": extra.get("quartos"),
            "banheiros": extra.get("banheiros"),
            "status": im.status,
            "captacaoLink": extra.get("captacaoLink"),
            "dataCriacao": im.data_criacao,
            "dataAtivacao": im.data_ativacao,
            "observacoes": extra.get("observacoes"),
            "formRespostas": extra.get("formRespostas") or {},
            "jarvisPreenchidoEm": im.jarvis_preenchido_em,
            "fotosTotal": len(fotos),
            "fotosMeta": [
                {"index": i, "nome": f.nome or f"foto_{i}", "tipo": f.tipo or "image/jpeg", "fonte": f.fonte or "upload"}
                for i, f in enumerate(fotos)
            ],
        },
    }


@router.get("/foto")
def foto(id: str = "", index: int = 0, db: Session = Depends(get_db), token: str = Depends(require_auth)):
    if not id:
        return Response("id obrigatório", status_code=400)
    f = state.get_foto_by_index(db, id, index)
    if not f:
        return Response("Foto não encontrada", status_code=404)
    path = Path(f.path)
    if not path.exists():
        return Response("Foto sem dados", status_code=422)
    return Response(
        content=path.read_bytes(),
        media_type=f.tipo or "image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/imovel-fotos")
def imovel_fotos_get(
    id: str = "",
    page: int = 1,
    limit: int = 5,
    request: Request = None,
    db: Session = Depends(get_db),
    token: str = Depends(require_auth),
):
    if not id:
        return {"ok": False, "error": "id obrigatório"}
    page = max(1, page)
    limit = min(20, max(1, limit))
    im = _find_imovel_row(db, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    fotos = state.list_fotos_ordenadas(db, id)
    total = len(fotos)
    start = (page - 1) * limit
    base = str(request.base_url).rstrip("/")
    pagina = fotos[start : start + limit]
    return {
        "ok": True,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total else 0,
        "fotos": [
            {
                "index": start + i,
                "nome": f.nome or f"foto_{start + i}",
                "tipo": f.tipo or "image/jpeg",
                "fonte": f.fonte or "upload",
                "url": f"{base}/foto?id={id}&index={start + i}&token={token}",
            }
            for i, f in enumerate(pagina)
        ],
    }


@router.post("/imovel-fotos")
async def imovel_fotos_post(
    id: str = "", request: Request = None, db: Session = Depends(get_db), token: str = Depends(require_auth)
):
    """Jarvis envia URLs externas de fotos (upload em lote) — baixa e grava
    em disco, mesma origem 'externo' do worker.js."""
    if not id:
        return {"ok": False, "error": "id obrigatório"}
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}

    urls = [u for u in (body.get("urls") or []) if isinstance(u, str)]
    if not urls:
        return {"ok": False, "error": "urls vazio"}

    im = _find_imovel_row(db, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}

    pasta = Path(state.settings.media_dir) / id / "fotos"
    existentes = state.list_fotos_ordenadas(db, id)
    ordem = len(existentes)
    total = 0

    async with httpx.AsyncClient(timeout=20) as client:
        for foto_url in urls[:20]:
            try:
                res = await client.get(foto_url)
                if res.status_code != 200:
                    continue
                content_type = res.headers.get("content-type", "image/jpeg")
                foto_id = f"foto_{uuid.uuid4().hex[:16]}"
                ext = (content_type.split("/")[-1] or "jpg").split("+")[0]
                pasta.mkdir(parents=True, exist_ok=True)
                path = pasta / f"{foto_id}.{ext}"
                path.write_bytes(res.content)
                nome = foto_url.rstrip("/").split("/")[-1].split("?")[0] or f"foto_{int(datetime.now().timestamp())}.jpg"
                db.add(
                    models.Foto(
                        id=foto_id,
                        imovel_id=id,
                        nome=nome,
                        tipo=content_type,
                        fonte=body.get("fonte") or "externo",
                        path=str(path),
                        ordem=ordem,
                        criado_em=datetime.now(timezone.utc).isoformat(),
                    )
                )
                ordem += 1
                total += 1
            except Exception:
                continue

    if total:
        db.commit()
    return {"ok": True, "total": total}


@router.get("/jarvis-pending")
def jarvis_pending(db: Session = Depends(get_db), token: str = Depends(require_auth)):
    pending = []
    for im in db.query(models.Imovel).filter(models.Imovel.fotos_ia_solicitado_em.isnot(None)):
        pending.append(
            {
                "id": im.id,
                "nome": im.nome,
                "solicitadoEm": im.fotos_ia_solicitado_em,
                "fotosCount": len(state.list_fotos_ordenadas(db, im.id)),
            }
        )
    return {"ok": True, "pending": pending}


@router.post("/jarvis-notify")
async def jarvis_notify(
    id: str = "", request: Request = None, db: Session = Depends(get_db), token: str = Depends(require_auth)
):
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}
    imovel_id = body.get("id") or id
    if not imovel_id:
        return {"ok": False, "error": "id obrigatório"}

    data = state.get_state(db, str(request.base_url).rstrip("/"), token)
    im = next((i for i in data.get("wc_imoveis") or [] if str(i.get("id")) == imovel_id), None)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}

    dados = body.get("dados") or {}

    def has_val(v):
        return v is not None and v != ""

    if dados.get("captacaoLink"):
        im["captacaoLink"] = dados["captacaoLink"]
    if dados.get("proprietarioNome") and not im.get("proprietarioNome"):
        im["proprietarioNome"] = dados["proprietarioNome"]
    if dados.get("proprietarioTel") and not im.get("proprietarioTel"):
        im["proprietarioTel"] = dados["proprietarioTel"]
    if dados.get("endereco") and not im.get("endereco"):
        im["endereco"] = dados["endereco"]
    if dados.get("quartos"):
        im["quartos"] = int(dados["quartos"])
    if dados.get("banheiros"):
        im["banheiros"] = int(dados["banheiros"])
    if dados.get("observacoes") and not im.get("observacoes"):
        im["observacoes"] = dados["observacoes"]
    if dados.get("wifi_rede") or dados.get("wifi_senha"):
        if not isinstance(im.get("wifi"), dict):
            im["wifi"] = {}
        if dados.get("wifi_rede"):
            im["wifi"]["rede"] = dados["wifi_rede"]
        if dados.get("wifi_senha"):
            im["wifi"]["senha"] = dados["wifi_senha"]
    if dados.get("acesso"):
        im["acesso"] = dados["acesso"]
    if dados.get("senha_porta"):
        im["senhaPorta"] = dados["senha_porta"]
    if dados.get("vaga"):
        im["vaga"] = dados["vaga"]
    if dados.get("zelador_nome"):
        im["zeladorNome"] = dados["zelador_nome"]
    if dados.get("zelador_tel"):
        im["zeladorTel"] = dados["zelador_tel"]
    if isinstance(dados.get("camas"), list) and dados["camas"]:
        im["camas"] = dados["camas"]

    if not isinstance(im.get("formRascunho"), dict):
        im["formRascunho"] = {}
    conf = im.get("formConfirmados") or {}

    def _set(qid, val):
        if not conf.get(qid) and has_val(val):
            im["formRascunho"][qid] = str(val)

    wifi = im.get("wifi") or {}
    wifi_rede = dados.get("wifi_rede") or wifi.get("rede") or ""
    wifi_senha = dados.get("wifi_senha") or wifi.get("senha") or ""
    acesso = dados.get("acesso") or im.get("acesso") or ""
    senha_porta = dados.get("senha_porta") or im.get("senhaPorta") or ""
    vaga = dados.get("vaga") or im.get("vaga") or ""
    zel_nome = dados.get("zelador_nome") or im.get("zeladorNome") or ""
    zel_tel = dados.get("zelador_tel") or im.get("zeladorTel") or ""

    acesso_parts = [p for p in [acesso, f"Senha da porta: {senha_porta}" if senha_porta else "", f"Vaga: {vaga}" if vaga else ""] if p]
    if acesso_parts:
        _set("q81", "\n".join(acesso_parts))
    if zel_nome or zel_tel:
        _set("q83", " — ".join(p for p in [zel_nome, zel_tel] if p))
    if wifi_rede or wifi_senha:
        _set("q86", "\n".join(p for p in [f"Rede: {wifi_rede}" if wifi_rede else "", f"Senha: {wifi_senha}" if wifi_senha else ""] if p))
    if dados.get("endereco") or im.get("endereco"):
        _set("q9", dados.get("endereco") or im.get("endereco"))

    if isinstance(dados.get("formRascunho"), dict):
        for k, v in dados["formRascunho"].items():
            if not conf.get(k):
                im["formRascunho"][k] = v

    im["jarvisPreenchidoEm"] = datetime.now(timezone.utc).isoformat()
    state.put_state(db, data)
    db.commit()
    return {"ok": True, "imovel": {"id": im["id"], "nome": im.get("nome"), "status": im.get("status")}}
