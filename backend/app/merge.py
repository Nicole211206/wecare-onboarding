"""Lógica de merge anti-sobrescrita — porte 1:1 de worker.js (seção 3 do
ANALISE-MIGRACAO.md). Não simplificar: cada função aqui corresponde a um
incidente real de perda de dados por sync de cliente desatualizado.

Opera sobre os mesmos dicts/lists que o JSON de wc_state usava — a única
mudança é a linguagem, não a regra.
"""

from __future__ import annotations

from typing import Any


def has_val(v: Any) -> bool:
    """Diferente de `if v:` — aceita 0 como valor válido (ex: '0 lavabos')."""
    return v is not None and v != ""


def merge_item_arrays_by_id(old_arr: list | None, new_arr: list | None) -> list:
    """Recupera itens de array que sumiram numa sincronização catastrófica
    (encolhida brusca), casando por `id`. Respeita exclusão de propósito
    quando a encolhida NÃO é catastrófica."""
    old_a = old_arr if isinstance(old_arr, list) else []
    new_a = new_arr if isinstance(new_arr, list) else []
    catastrofica = (len(new_a) == 0 and len(old_a) > 0) or (len(old_a) >= 8 and len(new_a) <= 2)
    if not catastrofica:
        return new_a
    new_ids = {x["id"] for x in new_a if isinstance(x, dict) and x.get("id")}
    recuperados = [x for x in old_a if isinstance(x, dict) and x.get("id") and x["id"] not in new_ids]
    return [*new_a, *recuperados]


def contar_comprados(compras: dict | None) -> int:
    return sum(1 for c in (compras or {}).values() if isinstance(c, dict) and c.get("comprado"))


def merge_compras(old_compras: dict | None, new_compras: dict | None) -> dict:
    """compras não é array (é objeto solto por imóvel) — mede quantos itens
    do catálogo estão marcados como comprado; se despencar catastroficamente,
    o 'novo' compras é provavelmente uma versão antiga do cliente."""
    old_count = contar_comprados(old_compras)
    new_count = contar_comprados(new_compras)
    catastrofica = (new_count == 0 and old_count > 0) or (old_count >= 8 and new_count <= 2)
    return (old_compras or {}) if catastrofica else (new_compras or {})


def merge_ops(old_ops: dict | None, new_ops: dict | None) -> dict:
    """Se um campo de data (fotos/limpeza/vistoria) que já estava preenchido
    some (vira ''), é sobrescrita de cliente desatualizado — datas marcadas
    não costumam ser apagadas de propósito, só substituídas por outra data."""
    o = old_ops or {}
    n = dict(new_ops or {})
    for k in ("fotos", "limpeza", "vistoria"):
        if not o.get(k):
            continue
        nk = dict(n.get(k) or {})
        if o[k].get("data") and not nk.get("data"):
            nk["data"] = o[k]["data"]
        n[k] = nk
    return n


def merge_status_ativacao(old: dict | None, novo: dict) -> dict:
    """'ativo' é estado terminal — regressão pra fora de 'ativo' com perda de
    dataAtivacao é sinal de sobrescrita obsoleta, não reversão proposital."""
    if (
        old
        and old.get("status") == "ativo"
        and novo.get("status") != "ativo"
        and old.get("dataAtivacao")
        and not novo.get("dataAtivacao")
    ):
        return {
            "status": old["status"],
            "dataAtivacao": old["dataAtivacao"],
            "statusAnterior": old.get("statusAnterior"),
        }
    return {
        "status": novo.get("status"),
        "dataAtivacao": novo.get("dataAtivacao"),
        "statusAnterior": novo.get("statusAnterior"),
    }


def merge_array_simples(old_arr: list | None, new_arr: list | None) -> list:
    """plataformas/camas — listas curtas reescritas por inteiro, sem id nos
    itens. Mesma regra de encolhida catastrófica, sem recuperação item-a-item
    (não dá pra casar por id)."""
    old_a = old_arr if isinstance(old_arr, list) else []
    new_a = new_arr if isinstance(new_arr, list) else []
    catastrofica = (len(new_a) == 0 and len(old_a) > 0) or (len(old_a) >= 8 and len(new_a) <= 2)
    return old_a if catastrofica else new_a


def merge_campos_nao_vazios(old: dict | None, novo: dict | None) -> dict:
    """defLimpeza/defEnxoval — se um campo já preenchido chega vazio num save
    mais novo, é sobrescrita por cliente desatualizado, não limpeza proposital."""
    o = old or {}
    n = dict(novo or {})
    for k, v in o.items():
        if has_val(v) and not has_val(n.get(k)):
            n[k] = v
    return n


def reconciliar_sublistas_imoveis(old_imoveis: list | None, new_imoveis: list | None) -> list:
    """Casa imóveis por id entre estado antigo e novo e recupera sublistas
    (itensExtras, eventosExtras, vistorias, manutencoes, comprasLotes,
    gastosAvulsos, atualizacoes, fotos) que sumiram no imóvel novo mas
    existiam no antigo, além de compras/ops/status."""
    if not isinstance(old_imoveis, list) or not isinstance(new_imoveis, list):
        return new_imoveis if isinstance(new_imoveis, list) else []

    old_by_id = {i["id"]: i for i in old_imoveis if isinstance(i, dict) and i.get("id")}

    result = []
    for im in new_imoveis:
        if not isinstance(im, dict) or not im.get("id") or im["id"] not in old_by_id:
            result.append(im)
            continue
        old = old_by_id[im["id"]]
        merged = {
            **im,
            "itensExtras": merge_item_arrays_by_id(old.get("itensExtras"), im.get("itensExtras")),
            "eventosExtras": merge_item_arrays_by_id(old.get("eventosExtras"), im.get("eventosExtras")),
            "vistorias": merge_item_arrays_by_id(old.get("vistorias"), im.get("vistorias")),
            "manutencoes": merge_item_arrays_by_id(old.get("manutencoes"), im.get("manutencoes")),
            "comprasLotes": merge_item_arrays_by_id(old.get("comprasLotes"), im.get("comprasLotes")),
            "gastosAvulsos": merge_item_arrays_by_id(old.get("gastosAvulsos"), im.get("gastosAvulsos")),
            "atualizacoes": merge_item_arrays_by_id(old.get("atualizacoes"), im.get("atualizacoes")),
            "fotos": merge_item_arrays_by_id(old.get("fotos"), im.get("fotos")),
            "plataformas": merge_array_simples(old.get("plataformas"), im.get("plataformas")),
            "camas": merge_array_simples(old.get("camas"), im.get("camas")),
            "compras": merge_compras(old.get("compras"), im.get("compras")),
            "ops": merge_ops(old.get("ops"), im.get("ops")),
            "defLimpeza": merge_campos_nao_vazios(old.get("defLimpeza"), im.get("defLimpeza")),
            "defEnxoval": merge_campos_nao_vazios(old.get("defEnxoval"), im.get("defEnxoval")),
            **merge_status_ativacao(old, im),
        }
        result.append(merged)
    return result


# Chaves protegidas por "encolhida catastrófica" no nível da lista inteira (POST /save) —
# espelha listKeys/listKeysEstritas do worker.js. Sem recuperação item-a-item (sem id
# estável nesses catálogos); se encolher catastroficamente, mantém a versão do servidor.
LIST_KEYS = ["wc_imoveis", "wc_prestadores", "wc_users", "wc_membros", "wc_itens"]
LIST_KEYS_ESTRITAS = [
    "wc_def_operacionais",
    "wc_limpeza_checkout",
    "wc_vistoria_campos",
    "wc_templates_msg",
    "wc_orcamentos",
    "wc_estoque_itens",
    "wc_camas_custom",
    "wc_modelos_negocio",
]


def _encolhida_catastrofica(sv: list, iv: list) -> bool:
    return (len(iv) == 0 and len(sv) > 0) or (len(sv) >= 8 and len(iv) <= 2)


def merge_save(current: dict, body: dict) -> dict:
    """Porte de POST /save: incoming sobrescreve current, exceto listas que
    encolheriam catastroficamente, e reconcilia sublistas de wc_imoveis."""
    merged = {**current, **body}

    for k in (*LIST_KEYS, *LIST_KEYS_ESTRITAS):
        sv = current.get(k) if isinstance(current.get(k), list) else []
        iv = body.get(k) if isinstance(body.get(k), list) else []
        if _encolhida_catastrofica(sv, iv):
            merged[k] = sv

    merged["wc_imoveis"] = reconciliar_sublistas_imoveis(current.get("wc_imoveis"), merged.get("wc_imoveis"))

    # lastSaved: aceita o do cliente se for mais novo
    if body.get("lastSaved") and float(body["lastSaved"]) > float(current.get("lastSaved") or 0):
        merged["lastSaved"] = body["lastSaved"]

    return merged
