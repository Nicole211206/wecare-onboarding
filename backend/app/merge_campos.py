"""Merge por campo de wc_imoveis (2026-09-25): duas pessoas editando o mesmo imóvel.

Antes o navegador mandava o wc_imoveis inteiro e valia quem salvasse por último — inclusive
nos campos que a primeira pessoa mexeu e a segunda nem tocou. Agora o app.js manda um PATCH:
só as "unidades" que ele mudou em relação à versão-base que leu (revisão `base` de
wc_imoveis). O servidor guarda em que revisão cada unidade mudou por último (field revs) e
aplica cada unidade separadamente:
  - unidade que ninguém mais mexeu desde a base → aplica;
  - unidade que outra pessoa mudou depois da base → conflito: fica a versão do servidor
    (a de quem salvou primeiro) e o cliente é avisado. Mesmo valor dos dois lados não é conflito.

Unidade (granularidade) de cada campo do imóvel — espelhada em _imUnidades no app.js:
  - campos simples (nome, endereço, link do Drive...)       → o campo
  - objetos (compras, ops, formRascunho, defLimpeza...)       → cada chave do objeto
  - listas com id (vistorias, manutenções, eventos...)        → cada item, pelo id
  - camas, plataformas (listas sem id)                        → a lista inteira: juntar por
    posição misturaria camas de duas edições; conflito recusa a 2ª em vez de tentar juntar
  - status + statusAnterior + dataAtivacao                    → um grupo só (dependem entre si)
"""

from __future__ import annotations

import copy
import json

LISTAS_POR_ID = {"vistorias", "manutencoes", "eventosExtras", "itensExtras", "comprasLotes",
                 "gastosAvulsos", "atualizacoes", "fotos"}
GRUPO_STATUS = ("status", "statusAnterior", "dataAtivacao")
_STATUS = "_status"
SEP = "\x1f"
APAGAR = object()


def _lista_por_id(campo: str, valor) -> bool:
    return campo in LISTAS_POR_ID and isinstance(valor, list) and all(isinstance(x, dict) and x.get("id") for x in valor)


def unidades(im: dict) -> dict[tuple, object]:
    """Achata o imóvel em {caminho: valor}. Caminho: (campo,), (campo, chave) ou (campo, id)."""
    out: dict[tuple, object] = {}
    for campo, valor in im.items():
        if campo == "id" or campo in GRUPO_STATUS:
            continue
        if _lista_por_id(campo, valor):
            for x in valor:
                out[(campo, x["id"])] = x
        elif isinstance(valor, dict):
            for k, x in valor.items():
                out[(campo, k)] = x
        else:
            out[(campo,)] = valor
    if any(k in im for k in GRUPO_STATUS):
        out[(_STATUS,)] = {k: im.get(k) for k in GRUPO_STATUS}
    return out


def ler(im: dict, caminho: tuple):
    if caminho == (_STATUS,):
        return {k: im.get(k) for k in GRUPO_STATUS}
    campo = caminho[0]
    valor = im.get(campo)
    if len(caminho) == 1:
        return valor
    if isinstance(valor, list):
        return next((x for x in valor if isinstance(x, dict) and x.get("id") == caminho[1]), None)
    if isinstance(valor, dict):
        return valor.get(caminho[1])
    return None


def escrever(im: dict, caminho: tuple, valor) -> None:
    if caminho == (_STATUS,):
        for k in GRUPO_STATUS:
            im[k] = (valor or {}).get(k) if valor is not APAGAR else None
        return
    campo = caminho[0]
    if len(caminho) == 1:
        if valor is APAGAR:
            im.pop(campo, None)
        else:
            im[campo] = valor
        return
    sub = caminho[1]
    if campo in LISTAS_POR_ID:
        lista = im.get(campo) if isinstance(im.get(campo), list) else []
        i = next((n for n, x in enumerate(lista) if isinstance(x, dict) and x.get("id") == sub), None)
        if valor is APAGAR:
            if i is not None:
                lista.pop(i)
        elif i is not None:
            lista[i] = valor
        else:
            lista.append(valor)  # item novo entra no fim (ordem do servidor preservada)
        im[campo] = lista
        return
    obj = im.get(campo) if isinstance(im.get(campo), dict) else {}
    if valor is APAGAR:
        obj.pop(sub, None)
    else:
        obj[sub] = valor
    im[campo] = obj


def chave(imovel_id: str, caminho: tuple) -> str:
    return SEP.join((imovel_id, *map(str, caminho)))


def _igual(a, b) -> bool:
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def caminhos_alterados(antes: list, depois: list) -> list[str]:
    """Chaves (imovel_id + caminho) que mudaram entre dois wc_imoveis — pra registrar a revisão
    de cada unidade (ver state.put_state_versionado). Imóvel criado/apagado registra "_existe"."""
    a = {i["id"]: i for i in antes or [] if isinstance(i, dict) and i.get("id")}
    d = {i["id"]: i for i in depois or [] if isinstance(i, dict) and i.get("id")}
    out = []
    for imovel_id in set(a) | set(d):
        if (imovel_id in a) != (imovel_id in d):
            out.append(chave(imovel_id, ("_existe",)))
        ua, ud = unidades(a.get(imovel_id) or {}), unidades(d.get(imovel_id) or {})
        for caminho in set(ua) | set(ud):
            if not _igual(ua.get(caminho), ud.get(caminho)):
                out.append(chave(imovel_id, caminho))
    return out


def aplicar_patch(atuais: list, patch: dict, field_revs: dict[str, int]) -> tuple[list, list[dict]]:
    """Aplica o patch do cliente sobre o wc_imoveis atual do servidor. Retorna (novo
    wc_imoveis, conflitos). `patch` = {"base": rev, "ops": [...]}, com ops:
      {"im": id, "novo": {...imóvel}}             imóvel criado no cliente
      {"im": id, "apagar": true}                  imóvel apagado no cliente
      {"im": id, "caminho": [...], "valor": x}    unidade alterada
      {"im": id, "caminho": [...], "apagar": true} unidade removida"""
    base = int(patch.get("base") or 0)
    por_id = {i["id"]: copy.deepcopy(i) for i in atuais or [] if isinstance(i, dict) and i.get("id")}
    ordem = [i["id"] for i in atuais or [] if isinstance(i, dict) and i.get("id")]
    conflitos: list[dict] = []

    def rev(k: str) -> int:
        return int(field_revs.get(k, 0))

    for op in patch.get("ops") or []:
        imovel_id = op.get("im")
        if not imovel_id:
            continue
        if "novo" in op:
            if imovel_id not in por_id and isinstance(op["novo"], dict):
                por_id[imovel_id] = {**op["novo"], "id": imovel_id}
                ordem.append(imovel_id)
            continue
        caminho = tuple(op.get("caminho") or ())
        if not caminho:  # apagar o imóvel inteiro
            if imovel_id not in por_id:
                continue
            prefixo = imovel_id + SEP
            if any(v > base for k, v in field_revs.items() if k.startswith(prefixo)):
                conflitos.append({"im": imovel_id, "motivo": "imóvel foi editado por outra pessoa — não apagado"})
                continue
            del por_id[imovel_id]
            ordem.remove(imovel_id)
            continue
        if imovel_id not in por_id:
            conflitos.append({"im": imovel_id, "caminho": list(caminho), "motivo": "imóvel foi apagado por outra pessoa"})
            continue
        if caminho[0] == "compras" and len(caminho) > 1 and str(caminho[1]).partition("_")[0].isdigit():
            continue  # chave de posição (pré-migração) — ver merge.descartar_compras_por_posicao
        novo = APAGAR if op.get("apagar") else op.get("valor")
        atual = ler(por_id[imovel_id], caminho)
        mudou_depois = max(rev(chave(imovel_id, caminho)), rev(chave(imovel_id, caminho[:1]))) > base
        if mudou_depois and not _igual(atual, None if novo is APAGAR else novo):
            conflitos.append({"im": imovel_id, "caminho": list(caminho),
                              "motivo": "alterado por outra pessoa depois que você abriu"})
            continue
        escrever(por_id[imovel_id], caminho, novo)
    return [por_id[i] for i in ordem], conflitos
