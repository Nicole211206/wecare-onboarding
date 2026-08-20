from __future__ import annotations

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import anthropic_client, google_drive, state
from ..auth import require_auth
from ..config import settings
from ..database import get_db

router = APIRouter()


@router.post("/extrair-formulario")
async def extrair_formulario(request: Request, token: str = Depends(require_auth)):
    if not settings.anthropic_api_key:
        return {"ok": False, "error": "ANTHROPIC_API_KEY não configurada"}
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}

    transcript = str(body.get("transcript") or "")[:45000]
    perguntas = body.get("perguntas") if isinstance(body.get("perguntas"), list) else []
    if not transcript:
        return {"ok": False, "error": "Transcrição vazia"}
    if not perguntas:
        return {"ok": False, "error": "Sem perguntas"}

    try:
        resultado = await anthropic_client.extrair_formulario(transcript, perguntas)
        return {"ok": True, **resultado}
    except Exception as e:
        return {"ok": False, "error": f"Falha na IA: {e}"}


@router.get("/drive-debug")
async def drive_debug(folderId: str = "1Z5Vh_u3ssklp1Aq3KX9bVuMag7G08EVz", token: str = Depends(require_auth)):
    shared_drive_id = "0ALYveJNZWSbmUk9PVA"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            at = await google_drive.get_google_access_token(client)
            about = await client.get(
                "https://www.googleapis.com/drive/v3/about",
                params={"fields": "user"},
                headers={"Authorization": f"Bearer {at}"},
            )
            list_res = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                params={
                    "q": f"'{folderId}' in parents and trashed=false",
                    "fields": "files(id,name,mimeType)",
                    "pageSize": 50,
                    "supportsAllDrives": "true",
                    "includeItemsFromAllDrives": "true",
                    "corpora": "drive",
                    "driveId": shared_drive_id,
                },
                headers={"Authorization": f"Bearer {at}"},
            )
            return {"ok": True, "user": about.json().get("user"), "listData": list_res.json()}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/analisar-drive")
async def analisar_drive(request: Request, db: Session = Depends(get_db), token: str = Depends(require_auth)):
    if not settings.anthropic_api_key:
        return {"ok": False, "error": "ANTHROPIC_API_KEY não configurada"}
    if not settings.google_client_id:
        return {"ok": False, "error": "GOOGLE_CLIENT_ID não configurada"}
    if not settings.google_refresh_token:
        return {"ok": False, "error": "GOOGLE_REFRESH_TOKEN não configurada"}

    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}
    imovel_id = body.get("id") or ""
    if not imovel_id:
        return {"ok": False, "error": "id obrigatório"}

    data = state.get_state(db, str(request.base_url).rstrip("/"), token)
    imoveis = data.setdefault("wc_imoveis", [])
    im = next((i for i in imoveis if str(i.get("id")) == imovel_id), None)
    if im is None:
        im = {"id": imovel_id}
        imoveis.append(im)

    captacao_link = body.get("captacaoLink") or im.get("captacaoLink") or ""
    if captacao_link:
        im["captacaoLink"] = captacao_link

    folder_id = google_drive.extract_folder_id(captacao_link)
    if not folder_id:
        return {"ok": False, "error": "Link da pasta Drive inválido ou não configurado"}

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            access_token = await google_drive.get_google_access_token(client)
        except Exception as e:
            return {"ok": False, "error": f"Erro Google Auth: {e}"}

        about_me = (
            await client.get(
                "https://www.googleapis.com/drive/v3/about",
                params={"fields": "user"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
        ).json()
        folder_meta = (
            await client.get(
                f"https://www.googleapis.com/drive/v3/files/{folder_id}",
                params={"fields": "id,name,driveId,parents,mimeType", "supportsAllDrives": "true"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
        ).json()

        try:
            files = await google_drive.list_drive_folder(client, folder_id, access_token)
        except Exception as e:
            return {"ok": False, "error": f"Erro Drive API: {e}", "folderId": folder_id, "folderMeta": folder_meta}

        image_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        text_parts: list[str] = []
        image_parts: list[dict] = []
        files_seen = [f"{f['name']} ({f.get('mimeType')})" for f in files]
        images_count = 0

        for file in files:
            mime = file.get("mimeType")
            if not mime:
                continue
            if mime.startswith("video/"):
                text_parts.append(f"[Vídeo disponível: {file['name']}]")
                continue
            if mime == "application/vnd.google-apps.document":
                try:
                    text = await google_drive.export_google_doc(client, file["id"], access_token)
                    if text:
                        text_parts.append(f"=== {file['name']} ===\n{text[:8000]}")
                except Exception:
                    pass
                continue
            if mime == "application/vnd.google-apps.spreadsheet":
                try:
                    r2 = await client.get(
                        f"https://www.googleapis.com/drive/v3/files/{file['id']}/export",
                        params={"mimeType": "text/csv"},
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if r2.status_code == 200:
                        text_parts.append(f"=== {file['name']} ===\n{r2.text[:3000]}")
                except Exception:
                    pass
                continue
            if mime == "application/pdf":
                try:
                    img = await google_drive.download_file_base64(client, file["id"], "application/pdf", access_token)
                    if img:
                        image_parts.append(
                            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": img["base64"]}}
                        )
                except Exception:
                    pass
                continue
            if mime in ("text/plain", "text/markdown"):
                try:
                    r2 = await client.get(
                        f"https://www.googleapis.com/drive/v3/files/{file['id']}",
                        params={"alt": "media"},
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if r2.status_code == 200:
                        text_parts.append(f"=== {file['name']} ===\n{r2.text[:4000]}")
                except Exception:
                    pass
                continue
            if mime in image_types and images_count < 20:
                try:
                    img = await google_drive.download_file_base64(client, file["id"], mime, access_token)
                    if img:
                        image_parts.append(
                            {"type": "image", "source": {"type": "base64", "media_type": img["mimeType"], "data": img["base64"]}}
                        )
                        images_count += 1
                except Exception:
                    pass

    vistoria = body.get("vistoriaRecente")
    vistoria_ctx = ""
    if vistoria:
        vistoria_ctx = "\n\n=== DADOS DA VISTORIA RECENTE ===\n"
        if vistoria.get("pendencias"):
            vistoria_ctx += f"Pendências: {vistoria['pendencias']}\n"
        if vistoria.get("comodos"):
            import json as _json

            vistoria_ctx += f"Cômodos: {_json.dumps(vistoria['comodos'])}\n"
        if vistoria.get("aptoPara"):
            vistoria_ctx += f"Apto para: {vistoria['aptoPara']}\n"

    texto_contexto = "\n\n".join(text_parts) + vistoria_ctx

    user_content = []
    if texto_contexto.strip():
        user_content.append({"type": "text", "text": f"Contexto extraído dos documentos:\n{texto_contexto[:20000]}"})
    user_content.extend(image_parts)
    if not user_content:
        return {
            "ok": False,
            "error": (
                "Nenhum conteúdo analisável. Arquivos: "
                + (", ".join(files_seen) if files_seen else "nenhum")
                + f" | Conta: {about_me.get('user', {}).get('emailAddress', '?')} | Pasta: {folder_meta}"
            ),
            "filesFound": files_seen,
        }
    user_content.append({"type": "text", "text": f'Nome deste imóvel no sistema: "{im.get("nome") or ""}". Extraia os dados deste imóvel específico e retorne o JSON.'})

    perguntas = body.get("perguntas") if isinstance(body.get("perguntas"), list) else []

    try:
        resultado = await anthropic_client.analisar_drive(user_content, perguntas)
    except Exception as e:
        return {"ok": False, "error": f"Erro Claude: {e}"}

    _aplicar_resultado_drive(im, resultado)
    im["claudeAnalisadoEm"] = datetime.now(timezone.utc).isoformat()
    im["arquivosAnalisados"] = len(files)
    data["lastSaved"] = int(datetime.now(timezone.utc).timestamp() * 1000)

    state.put_state(db, data)
    db.commit()
    return {"ok": True, "arquivos": len(files), "resultado": resultado}


def _has_val(v):
    return v is not None and v != ""


def _aplicar_resultado_drive(im: dict, resultado: dict) -> None:
    """Só preenche campos vazios — exceção pros que nascem com default
    não-vazio (quartos/salas/banheiros=1, comissão=20/'liquida'), que só são
    sobrescritos na primeira análise. Idêntico ao worker.js."""
    primeira_analise = not im.get("claudeAnalisadoEm")

    mapa_dir = {
        "proprietarioNome": "proprietarioNome",
        "proprietarioTel": "proprietarioTel",
        "proprietarioEmail": "proprietarioEmail",
        "endereco": "endereco",
        "observacoes": "observacoes",
        "acesso": "acesso",
        "senha_porta": "senhaPorta",
        "vaga": "vaga",
        "zelador_nome": "zeladorNome",
        "zelador_tel": "zeladorTel",
    }
    for rk, ik in mapa_dir.items():
        if resultado.get(rk) and not im.get(ik):
            im[ik] = resultado[rk]

    num_campos = ["quartos", "salas", "banheirosCompletos", "banheirosLavabo", "cozinha", "lavanderia", "areaExterna", "varanda"]
    num_campos_com_default = {"quartos", "salas", "banheirosCompletos"}
    for k in num_campos:
        if not _has_val(resultado.get(k)):
            continue
        com_default = k in num_campos_com_default
        pode_sobrescrever = (primeira_analise and float(resultado[k]) > 0) if com_default else not im.get(k)
        if pode_sobrescrever:
            im[k] = float(resultado[k])

    if isinstance(resultado.get("camas"), list) and resultado["camas"] and not (isinstance(im.get("camas"), list) and im["camas"]):
        im["camas"] = resultado["camas"]

    if resultado.get("wifi_rede") or resultado.get("wifi_senha"):
        if not isinstance(im.get("wifi"), dict):
            im["wifi"] = {}
        if resultado.get("wifi_rede") and not im["wifi"].get("rede"):
            im["wifi"]["rede"] = resultado["wifi_rede"]
        if resultado.get("wifi_senha") and not im["wifi"].get("senha"):
            im["wifi"]["senha"] = resultado["wifi_senha"]

    if resultado.get("short_stay_permitido") and not im.get("shortStayPermitido"):
        im["shortStayPermitido"] = resultado["short_stay_permitido"]
    if resultado.get("restricoes") and not im.get("restricoes"):
        im["restricoes"] = resultado["restricoes"]

    if resultado.get("comissao_base") in ("bruta", "liquida") and primeira_analise:
        im["comissaoBase"] = resultado["comissao_base"]
    if _has_val(resultado.get("comissao_pct")) and float(resultado["comissao_pct"]) > 0 and primeira_analise:
        im["comissaoWecare"] = float(resultado["comissao_pct"])
    if _has_val(resultado.get("valor_setup_cobrado")) and float(resultado["valor_setup_cobrado"]) > 0 and not im.get("valorSetupCobrado"):
        im["valorSetupCobrado"] = float(resultado["valor_setup_cobrado"])

    defs = resultado.get("definicoes") or {}
    def_campos = ["seguroEasyCover", "kitAmenities", "internetClaro", "ecohost", "fechaduraEletronica"]
    if not isinstance(im.get("defOperacionais"), dict):
        im["defOperacionais"] = {}
    for dk in def_campos:
        if defs.get(dk) is True and not im.get(dk):
            im[dk] = True
            im["defOperacionais"][dk] = True

    if not isinstance(im.get("formRascunho"), dict):
        im["formRascunho"] = {}
    conf = im.get("formConfirmados") or {}
    for qid, val in (resultado.get("formRascunho") or {}).items():
        # Só preenche se ainda vazio — mesma regra "só preenche campo vazio" do resto
        # da função. Sem isso, ao expandir a IA pra tentar responder as ~85 perguntas
        # do formulário (antes eram só 5), uma correção manual da equipe no rascunho
        # seria apagada silenciosamente na próxima vez que a pasta fosse reanalisada.
        if not conf.get(qid) and _has_val(val) and not _has_val(im["formRascunho"].get(qid)):
            im["formRascunho"][qid] = str(val)
