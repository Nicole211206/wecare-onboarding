from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import state
from ..database import get_db

router = APIRouter()


def _find_imovel(data: dict, imovel_id: str) -> dict | None:
    for im in data.get("wc_imoveis") or []:
        if str(im.get("id")) == imovel_id or str(im.get("uuid")) == imovel_id:
            return im
    return None


@router.get("/form-load")
def form_load(id: str = "", t: str = "", request: Request = None, db: Session = Depends(get_db)):
    if not id or not t:
        return {"ok": False, "error": "Missing id or t"}
    data = state.get_state(db, str(request.base_url).rstrip("/"), "")
    im = _find_imovel(data, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    if im.get("formToken") != t:
        return {"ok": False, "error": "Token inválido"}
    return {
        "ok": True,
        "imovelNome": im.get("nome") or im.get("name") or id,
        "rascunho": im.get("formRascunho") or {},
        "respostas": im.get("formRespostas") or {},
        "confirmados": im.get("formConfirmados") or {},
    }


@router.post("/form-save")
async def form_save(id: str = "", t: str = "", request: Request = None, db: Session = Depends(get_db)):
    if not id or not t:
        return {"ok": False, "error": "Missing id or t"}
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}

    data = state.get_state(db, str(request.base_url).rstrip("/"), "")
    im = _find_imovel(data, id)
    if not im:
        return {"ok": False, "error": "Imóvel não encontrado"}
    if im.get("formToken") != t:
        return {"ok": False, "error": "Token inválido"}

    im["formRespostas"] = body.get("respostas") or {}
    im["formConfirmados"] = body.get("confirmados") or {}
    im["formPreenchidoEm"] = datetime.now(timezone.utc).isoformat()
    if body.get("enviado") is True:
        im["formEnviadoEm"] = datetime.now(timezone.utc).isoformat()
    data["lastSaved"] = int(datetime.now(timezone.utc).timestamp() * 1000)

    state.put_state(db, data)
    db.commit()
    return {"ok": True}
