from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import merge, merge_campos, models, state
from ..auth import require_auth
from ..database import get_db

router = APIRouter()


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@router.get("/load")
def load(request: Request, db: Session = Depends(get_db), token: str = Depends(require_auth)):
    data = state.get_state(db, _base_url(request), token)
    data["_revs"] = state.get_revs(db)
    return {"ok": True, "data": data}


@router.post("/save")
async def save(request: Request, db: Session = Depends(get_db), token: str = Depends(require_auth)):
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}

    current = state.get_state(db, _base_url(request), token)

    # Backup horário (7 dias de retenção) — antes do merge, igual ao worker.js
    bucket = state.hourly_backup_bucket()
    if db.get(models.Backup, bucket) is None:
        db.add(models.Backup(hora_bucket=bucket, snapshot=current, criado_em=str(time.time())))
        db.execute(delete(models.Backup).where(models.Backup.hora_bucket < bucket - 24 * 7))

    revs = state.get_revs(db)
    patch = body.pop("_imoveisPatch", None)
    proto_ok = merge.protocolo_ok(body)
    body, conflitos = merge.filtrar_conflitos(body, revs)
    # wc_imoveis: patch por campo (ver app/merge_campos.py) — conflito é por unidade, não pela
    # coleção inteira; o resto do patch é aplicado.
    conflitos_imoveis: list[dict] = []
    if isinstance(patch, dict) and proto_ok:
        body["wc_imoveis"], conflitos_imoveis = merge_campos.aplicar_patch(
            current.get("wc_imoveis") or [], patch, state.get_field_revs(db)
        )
    elif patch is not None:
        conflitos.append("wc_imoveis")
    merged = merge.merge_save(current, body, imoveis_por_patch="wc_imoveis" in body)
    revs_antes = revs
    revs = state.put_state_versionado(db, merged)
    db.commit()
    # revsAntes: se a revisão de antes deste save era a base do cliente, ninguém gravou no meio
    # e o estado do servidor = base + o patch dele (o cliente não precisa puxar de novo)
    return {"ok": True, "revs": revs, "revsAntes": revs_antes, "conflitos": conflitos,
            "conflitosImoveis": conflitos_imoveis}


@router.post("/stats")
async def save_stats(request: Request, db: Session = Depends(get_db), token: str = Depends(require_auth)):
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}
    from datetime import datetime, timezone

    payload = {
        "stats": body.get("stats") or [],
        "prestadores": body.get("prestadores") or [],
        "atualizadoEm": datetime.now(timezone.utc).isoformat(),
    }
    row = db.get(models.Stats, 1)
    if row is None:
        db.add(models.Stats(id=1, payload=payload, atualizado_em=payload["atualizadoEm"]))
    else:
        row.payload = payload
        row.atualizado_em = payload["atualizadoEm"]
    db.commit()
    return {"ok": True}


@router.get("/onboarding-stats")
def onboarding_stats(db: Session = Depends(get_db)):
    """Sem auth — a Claire lê aqui (comportamento idêntico ao worker.js)."""
    row = db.get(models.Stats, 1)
    data = row.payload if row else {}
    stats_list = data.get("stats") or []
    prestadores = data.get("prestadores") or []
    atualizado_em = data.get("atualizadoEm")

    todos_imoveis = [
        {
            "nome": im.nome,
            "status": im.status,
            "dataCriacao": im.data_criacao,
            "dataAtivacao": im.data_ativacao,
            "dataContratoAssinado": im.data_contrato_assinado,
            "contratoAssinado": im.contrato_assinado,
            "incluirKpiClaire": im.incluir_kpi_claire,
            "mesReferenciaKpi": im.mes_referencia_kpi,
            "valorSetupCobrado": float(im.valor_setup_cobrado) if im.valor_setup_cobrado is not None else 0,
            "incluirSetupClaire": im.incluir_setup_claire,
            "eventosExtras": (im.extra or {}).get("eventosExtras") or [],
            "ops": (im.extra or {}).get("ops") or {},
        }
        for im in db.scalars(select(models.Imovel))
    ]

    imoveis = [
        {
            "nome": im["nome"],
            "status": im["status"],
            "dataCriacao": im["dataCriacao"],
            "dataContratoAssinado": im["dataContratoAssinado"],
            "dataAtivacao": im["dataAtivacao"],
            "incluirKpiClaire": bool(im["incluirKpiClaire"]),
            "mesReferenciaKpi": im["mesReferenciaKpi"],
        }
        for im in todos_imoveis
        if im["status"] != "perdido" and (im["contratoAssinado"] is True or im["status"] != "contrato")
    ]

    ativos = [s for s in stats_list if s.get("status") == "ativo" and s.get("diasOnboarding") is not None]
    media_onboarding = round(sum(x["diasOnboarding"] for x in ativos) / len(ativos)) if ativos else None
    em_onboarding = sum(1 for s in stats_list if s.get("status") and s["status"] not in ("ativo", "perdido"))

    from datetime import datetime

    kpi_por_mes: dict[str, dict] = {}
    for im in todos_imoveis:
        if im["incluirKpiClaire"] is True and im["mesReferenciaKpi"] and im["dataContratoAssinado"] and im["dataAtivacao"]:
            mes = im["mesReferenciaKpi"]
            dias = (
                datetime.fromisoformat(im["dataAtivacao"].replace("Z", "+00:00"))
                - datetime.fromisoformat(im["dataContratoAssinado"].replace("Z", "+00:00"))
            ).total_seconds() / 86400
            bucket = kpi_por_mes.setdefault(mes, {"somaDias": 0.0, "count": 0})
            bucket["somaDias"] += dias
            bucket["count"] += 1
    for mes, b in kpi_por_mes.items():
        b["mediaOnboardingDias"] = round(b["somaDias"] / b["count"], 1)
        del b["somaDias"]

    setup_por_mes: dict[str, dict] = {}
    for im in todos_imoveis:
        if im["incluirSetupClaire"] is True and im["mesReferenciaKpi"]:
            mes = im["mesReferenciaKpi"]
            previsto = im["valorSetupCobrado"] or 0
            gastos_extras = sum(
                float(e.get("custo") or 0) for e in (im["eventosExtras"] or []) if e.get("gastoSetup")
            )
            ops = im["ops"] or {}
            gasto = (
                float((ops.get("fotos") or {}).get("custo") or 0)
                + float((ops.get("limpeza") or {}).get("custo") or 0)
                + float((ops.get("vistoria") or {}).get("custo") or 0)
                + gastos_extras
            )
            bucket = setup_por_mes.setdefault(mes, {"previsto": 0.0, "gasto": 0.0, "count": 0})
            bucket["previsto"] += previsto
            bucket["gasto"] += gasto
            bucket["count"] += 1

    return {
        "ok": True,
        "stats": stats_list,
        "imoveis": imoveis,
        "prestadores": prestadores,
        "kpi": {
            "mediaOnboardingDias": media_onboarding,
            "totalAtivos": len(ativos),
            "emOnboarding": em_onboarding,
        },
        "kpiPorMes": kpi_por_mes,
        "setupPorMes": setup_por_mes,
        "atualizadoEm": atualizado_em,
    }
