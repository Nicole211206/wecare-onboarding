from __future__ import annotations

import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, File, Request, UploadFile
from sqlalchemy.orm import Session
from fastapi import Depends, Form

from .. import google_drive, state
from ..config import settings
from ..database import get_db

router = APIRouter()

MAX_MIDIA_POR_COMODO = 30


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


def _resolver_link_pasta_vistoria_sync_check(im: dict) -> tuple[str | None, str | None]:
    """Checagens sem rede — devolve (None, motivo) se já dá pra saber de cara que não vai dar."""
    if not (settings.google_client_id and settings.google_client_secret and settings.google_refresh_token):
        return None, "Integração com Google Drive não configurada neste ambiente."
    folder_id = google_drive.extract_folder_id(im.get("captacaoLink"))
    if not folder_id:
        return None, "Este imóvel não tem link de pasta do Drive configurado (aba Captação)."
    return folder_id, None


async def _resolver_link_pasta_vistoria(im: dict) -> dict:
    """Acha (ou cria) a subpasta "Vistoria" dentro da pasta do imóvel no Drive e
    devolve o link — mesma pasta pra onde /vistoria-upload manda a mídia, exposta
    de antemão (mesmo antes do primeiro upload) pra quem preenche poder abrir e
    conferir/subir arquivo direto lá também, sem depender só do widget de upload.
    Devolve {"link":..., "erro":...} em vez de só None em caso de falha — silenciar
    completamente escondia o motivo até de mim quando alguém reportava "não aparece"."""
    folder_id, motivo = _resolver_link_pasta_vistoria_sync_check(im)
    if not folder_id:
        return {"link": None, "erro": motivo}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            token = await google_drive.get_google_access_token(client)
            vistoria_folder_id = await google_drive.find_or_create_folder(client, token, folder_id, "Vistoria")
        return {"link": f"https://drive.google.com/drive/folders/{vistoria_folder_id}", "erro": None}
    except Exception as e:
        return {"link": None, "erro": f"Falha ao acessar o Drive: {e}"}


@router.get("/vistoria-load")
async def vistoria_load(id: str = "", vid: str = "", t: str = "", request: Request = None, db: Session = Depends(get_db)):
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
        "itensCompras": data.get("wc_itens") or [],
        "modalidadesEnxoval": data.get("wc_modalidades_enxoval") or [],
        "pastaDrive": await _resolver_link_pasta_vistoria(im),
        "imovelDados": {
            "camas": im.get("camas") or [],
            "quartos": im.get("quartos") or 1,
            "andares": im.get("andares") or 1,
            "banheiros": (im.get("banheirosCompletos") or 0) + (im.get("banheirosLavabo") or 0) or im.get("banheiros") or 1,
            "banheirosCompletos": im.get("banheirosCompletos") or im.get("banheiros") or 1,
            "banheirosLavabo": im.get("banheirosLavabo") or 0,
            "maxHospedes": im.get("maxHospedes") or 0,
            "defEnxoval": im.get("defEnxoval") or {},
        },
        "comprasAtual": im.get("compras") or {},
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

        # Liga o checklist de itens obrigatórios preenchido na vistoria direto na aba
        # Compras — sem isso, o "já tem X no imóvel" registrado no local nunca chegaria
        # lá sem alguém digitar tudo de novo manualmente no admin.
        itens_checklist = v["dados"].get("itensChecklist")
        if isinstance(itens_checklist, dict):
            if not isinstance(im.get("compras"), dict):
                im["compras"] = {}
            for sub_key, info in itens_checklist.items():
                if not isinstance(info, dict):
                    continue
                if not isinstance(im["compras"].get(sub_key), dict):
                    im["compras"][sub_key] = {}
                if info.get("qtdTem") is not None:
                    im["compras"][sub_key]["qtdTem"] = info["qtdTem"]
                if info.get("obs"):
                    im["compras"][sub_key]["obsVistoria"] = info["obs"]

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
                        "prioridade": p.get("prioridade"),
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


@router.post("/vistoria-upload")
async def vistoria_upload(
    id: str = Form(...),
    vid: str = Form(...),
    t: str = Form(...),
    comodoIdx: int = Form(...),
    comodoNome: str = Form(""),
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Sobe a foto/vídeo BRUTO da vistoria direto pra pasta do imóvel no Google Drive
    (subpasta "Vistoria"), em vez de guardar frames extraídos em base64 no banco.
    Resolve o bug de perda de dados em celulares fracos, onde a extração de frames
    no navegador (canvas + <video> seeking) podia travar sem nunca completar."""
    if not id or not vid or not t or comodoIdx < 0:
        return {"ok": False, "error": "Dados inválidos"}
    if not settings.google_client_id or not settings.google_client_secret or not settings.google_refresh_token:
        return {"ok": False, "error": "Integração com Google Drive não configurada"}

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
    while len(comodos) <= comodoIdx:
        comodos.append({})
    if not isinstance(comodos[comodoIdx].get("midiaDrive"), list):
        comodos[comodoIdx]["midiaDrive"] = []

    if len(comodos[comodoIdx]["midiaDrive"]) >= MAX_MIDIA_POR_COMODO:
        return {"ok": False, "error": "Limite de mídia deste cômodo atingido"}

    folder_id = google_drive.extract_folder_id(im.get("captacaoLink"))
    if not folder_id:
        return {"ok": False, "error": "Imóvel sem pasta do Drive configurada (link de captação)"}

    content = await file.read()
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            token = await google_drive.get_google_access_token(client)
            vistoria_folder_id = await google_drive.find_or_create_folder(client, token, folder_id, "Vistoria")
            nome_arquivo = f"{comodoNome or ('Comodo_' + str(comodoIdx))} - {datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')} - {file.filename or 'midia'}"
            resultado = await google_drive.upload_file(
                client, token, vistoria_folder_id, nome_arquivo, file.content_type or "application/octet-stream", content
            )
    except Exception as e:
        return {"ok": False, "error": f"Falha ao enviar pro Drive: {e}"}

    comodos[comodoIdx]["midiaDrive"].append(
        {
            "driveFileId": resultado.get("id"),
            "driveLink": resultado.get("webViewLink"),
            "nome": nome_arquivo,
            "tipo": "video" if (file.content_type or "").startswith("video/") else "foto",
            "enviadoEm": datetime.now(timezone.utc).isoformat(),
        }
    )

    data["lastSaved"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    state.put_state(db, data)
    db.commit()
    return {
        "ok": True,
        "total": len(comodos[comodoIdx]["midiaDrive"]),
        "driveLink": resultado.get("webViewLink"),
    }
