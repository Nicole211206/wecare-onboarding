from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy.orm import Session
from fastapi import Depends

from .. import state
from ..database import get_db

router = APIRouter()


def _find_imovel(data: dict, imovel_id: str) -> dict | None:
    for im in data.get("wc_imoveis") or []:
        if str(im.get("id")) == imovel_id or str(im.get("uuid")) == imovel_id:
            return im
    return None


def _find_vistoria(im: dict, vistoria_id: str) -> dict | None:
    for v in im.get("vistorias") or []:
        if v.get("id") == vistoria_id:
            return v
    return None


@router.get("/vistoria-load")
def vistoria_load(id: str = "", vid: str = "", t: str = "", request: Request = None, db: Session = Depends(get_db)):
    if not id or not vid or not t:
        return {"ok": False, "error": "Link incompleto"}
    data = state.get_state(db, str(request.base_url).rstrip("/"), "")
    im = _find_imovel(data, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    v = _find_vistoria(im, vid)
    if not v:
        return {"ok": False, "error": "Vistoria não encontrada"}
    if v.get("token") != t:
        return {"ok": False, "error": "Token inválido"}
    return {
        "ok": True,
        "imovelNome": im.get("nome") or im.get("id"),
        "comodos": v.get("comodosSnapshot") or [],
        "camposVistoria": data.get("wc_vistoria_campos") or [],
        "dados": v.get("dados") or {},
        "status": v.get("status") or "rascunho",
    }


@router.post("/vistoria-save")
async def vistoria_save(id: str = "", vid: str = "", t: str = "", request: Request = None, db: Session = Depends(get_db)):
    if not id or not vid or not t:
        return {"ok": False, "error": "Link incompleto"}
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}

    data = state.get_state(db, str(request.base_url).rstrip("/"), "")
    im = _find_imovel(data, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    v = _find_vistoria(im, vid)
    if not v:
        return {"ok": False, "error": "Vistoria não encontrada"}
    if v.get("token") != t:
        return {"ok": False, "error": "Token inválido"}

    # Preserva midiaFrames por cômodo — enviados à parte via /vistoria-midia,
    # não pelo autosave (evita retransmitir os frames inteiros a cada 30s).
    dados_antigos = v.get("dados") or {}
    dados_novos = body.get("dados") or {}
    if isinstance(dados_antigos.get("comodos"), list) and isinstance(dados_novos.get("comodos"), list):
        for idx, c in enumerate(dados_novos["comodos"]):
            antigo = dados_antigos["comodos"][idx] if idx < len(dados_antigos["comodos"]) else None
            if antigo and isinstance(antigo.get("midiaFrames"), list) and not isinstance((c or {}).get("midiaFrames"), list):
                c["midiaFrames"] = antigo["midiaFrames"]

    agora = datetime.now(timezone.utc).isoformat()
    v["dados"] = dados_novos
    v["atualizadoEm"] = agora

    if body.get("enviado") is True and v.get("status") != "enviado":
        v["status"] = "enviado"
        v["enviadoEm"] = agora
        pendencias = (v["dados"].get("pendencias") or []) if isinstance(v["dados"].get("pendencias"), list) else []
        if pendencias:
            if not isinstance(im.get("manutencoes"), list):
                im["manutencoes"] = []
            for p in pendencias:
                im["manutencoes"].append(
                    {
                        "id": f"man_{uuid.uuid4().hex[:16]}",
                        "comodo": p.get("comodo"),
                        "descricao": p.get("descricao"),
                        "status": "pendente",
                        "custo": 0,
                        "criadoEm": v["enviadoEm"],
                        "origem": "vistoria",
                        "vistoriaId": v["id"],
                    }
                )

    data["lastSaved"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    state.put_state(db, data)
    db.commit()
    return {"ok": True}


@router.post("/vistoria-midia")
async def vistoria_midia(id: str = "", vid: str = "", t: str = "", request: Request = None, db: Session = Depends(get_db)):
    if not id or not vid or not t:
        return {"ok": False, "error": "Link incompleto"}
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "JSON inválido"}

    comodo_idx = body.get("comodoIdx")
    frames = [f for f in (body.get("frames") or []) if isinstance(f, str)][:4]
    if not isinstance(comodo_idx, int) or comodo_idx < 0 or not frames:
        return {"ok": False, "error": "Dados inválidos"}

    data = state.get_state(db, str(request.base_url).rstrip("/"), "")
    im = _find_imovel(data, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    v = _find_vistoria(im, vid)
    if not v:
        return {"ok": False, "error": "Vistoria não encontrada"}
    if v.get("token") != t:
        return {"ok": False, "error": "Token inválido"}
    if v.get("status") == "enviado":
        return {"ok": False, "error": "Vistoria já enviada"}

    if not isinstance(v.get("dados"), dict):
        v["dados"] = {}
    if not isinstance(v["dados"].get("comodos"), list):
        v["dados"]["comodos"] = []
    comodos = v["dados"]["comodos"]
    while len(comodos) <= comodo_idx:
        comodos.append({})
    if not isinstance(comodos[comodo_idx].get("midiaFrames"), list):
        comodos[comodo_idx]["midiaFrames"] = []

    # Trava de segurança: 60 frames por vistoria (mesmo limite do worker.js).
    total_atual = sum(len(c.get("midiaFrames") or []) for c in comodos if isinstance(c, dict))
    espaco = max(0, 60 - total_atual)
    a_adicionar = frames[:espaco]
    comodos[comodo_idx]["midiaFrames"].extend(a_adicionar)

    data["lastSaved"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    state.put_state(db, data)
    db.commit()
    return {
        "ok": True,
        "adicionados": len(a_adicionar),
        "total": len(comodos[comodo_idx]["midiaFrames"]),
        "limiteAtingido": len(a_adicionar) < len(frames),
    }
