"""Migração única (2026-09-25): chaves de im.compras de POSIÇÃO no catálogo para ID do item.

Até aqui im.compras era chaveado pela posição do item em wc_itens ("7", "0_Casal"...). Quando
um item do meio era apagado, todas as marcações dos itens seguintes passavam a apontar pro
item errado. Não dá pra traduzir as chaves antigas pelo catálogo atual: cada marcação foi
gravada com o catálogo que existia NAQUELE momento (ex.: em 24/09 o catálogo alternou entre
51 e 50 itens várias vezes, e a maioria das marcações é da época dos 51).

Por isso a tradução usa o histórico dos backups horários (tabela `backups`): pra cada chave,
acha em qual intervalo entre snapshots o valor atual dela foi gravado, e traduz a posição pelo
catálogo daquele momento. Se o catálogo mudou no mesmo intervalo em que a marcação mudou e as
duas leituras apontam pra itens diferentes, é ambíguo: se a marcação tem preço digitado, vale
o item de preço de tabela mais próximo; senão, o catálogo do fim do intervalo — e registra no
relatório. Entrada vazia ({"qtdReal": 0, "comprado": False}, gravada sozinha pela aba) é
descartada: aparece igual a ausente. Marcação de item que não existe mais (apagado) não é descartada: vai
pra im.comprasArquivadas, junto com o nome do item. Idempotente: só mexe em chave numérica.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, state

CHAVE_POSICAO_RE = re.compile(r"^(\d+)(_.*)?$")


@dataclass
class Versao:
    rotulo: str
    catalogo: list[str]  # nomes dos itens, na ordem
    compras: dict[str, dict]  # imovel_id -> compras
    precos: list[dict] = field(default_factory=list)  # paralelo a catalogo: {"tipoPreco","preco"}
    enxoval: dict = field(default_factory=dict)  # wc_enxoval: nome -> {Tamanho: preço}

    def preco_tabela(self, idx: int, sufixo: str) -> float | None:
        if idx >= len(self.precos):
            return None
        it = self.precos[idx] or {}
        if it.get("tipoPreco") == "fixo":
            return it.get("preco")
        return (self.enxoval.get(self.catalogo[idx]) or {}).get(sufixo[1:]) if sufixo else None


def vazia(valor) -> bool:
    """Entrada que a aba Compras grava sozinha ao trocar de aba ({"qtdReal": 0, "comprado":
    False}) — sem informação nenhuma, aparece na tela igual a ausente."""
    if not isinstance(valor, dict):
        return False
    if any(valor.get(f) for f in ("comprado", "pago", "loteId", "obsVistoria")):
        return False
    if valor.get("precoOverride") is not None or valor.get("valorPago") is not None:
        return False
    return all(valor.get(f) in (None, 0) for f in ("qtdTem", "qtdReal"))


@dataclass
class Resultado:
    compras: dict[str, dict] = field(default_factory=dict)  # imovel_id -> compras novo (chave por id)
    arquivadas: dict[str, dict] = field(default_factory=dict)  # imovel_id -> {chave antiga: valor + motivo}
    avisos: list[str] = field(default_factory=list)
    deslocadas: int = 0  # chaves cujo item mudou em relação à leitura pelo catálogo atual
    mantidas: int = 0
    convertidas: int = 0
    descartadas_vazias: int = 0


def alinhar(antigo: list[str], atual: list[str]) -> dict[int, int]:
    """posição no catálogo antigo -> posição no atual. Casa trechos iguais; trecho substituído
    com o mesmo tamanho é renomeação (mesma posição relativa); o resto (item apagado) fica sem
    destino. Item só mudado de lugar é casado pelo nome, se o nome for único."""
    mapa: dict[int, int] = {}
    for tag, i1, i2, j1, j2 in SequenceMatcher(a=antigo, b=atual, autojunk=False).get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                mapa[i1 + k] = j1 + k
    usados = set(mapa.values())
    livres = {n: j for j, n in enumerate(atual) if j not in usados and atual.count(n) == 1}
    for i, nome in enumerate(antigo):
        if i not in mapa and nome in livres:
            mapa[i] = livres.pop(nome)
    return mapa


def planejar(historico: list[Versao], ids_atuais: list[str]) -> Resultado:
    """`historico` em ordem cronológica; o último elemento é o estado atual (catálogo atual,
    paralelo a `ids_atuais`). Função pura — não toca no banco."""
    atual = historico[-1]
    alinhamentos: dict[tuple, dict[int, int]] = {}

    def destino(catalogo: list[str], idx: int) -> int | None:
        chave = tuple(catalogo)
        if chave not in alinhamentos:
            alinhamentos[chave] = alinhar(catalogo, atual.catalogo)
        return alinhamentos[chave].get(idx) if idx < len(catalogo) else None

    res = Resultado()
    for imovel_id, compras in atual.compras.items():
        novas: dict[str, dict] = {}
        idade: dict[str, int] = {}  # chave nova -> índice do histórico em que o valor foi gravado
        arquivadas: dict[str, dict] = {}
        for chave, valor in (compras or {}).items():
            m = CHAVE_POSICAO_RE.match(chave)
            if not m:
                novas[chave], idade[chave] = valor, len(historico)
                continue
            idx, sufixo = int(m.group(1)), m.group(2) or ""
            if vazia(valor):
                res.descartadas_vazias += 1
                continue
            # j = 1º snapshot da sequência final em que a chave já tinha o valor atual
            j = len(historico) - 1
            while j > 0 and (historico[j - 1].compras.get(imovel_id) or {}).get(chave) == valor:
                j -= 1
            versoes = [historico[0]] if j == 0 else [historico[j - 1], historico[j]]
            escolhida = versoes[-1]
            if len({destino(v.catalogo, idx) for v in versoes}) > 1:
                # Catálogo e marcação mudaram no mesmo intervalo entre snapshots. Se a marcação
                # tem preço digitado, o item certo é o de preço de tabela mais próximo (em 24/09
                # houve gravação com os dois catálogos no mesmo intervalo — ex.: o mesmo 64,90 das
                # Xícaras em duas chaves vizinhas). Sem preço, fica o catálogo do fim do intervalo.
                po = valor.get("precoOverride") if isinstance(valor, dict) else None
                def distancia(v):
                    pt = v.preco_tabela(idx, sufixo)
                    return abs(po - pt) / max(pt, 1) if po is not None and pt else float("inf")
                por_preco = min(versoes, key=distancia)
                criterio = "fim do intervalo"
                if distancia(por_preco) != float("inf") and distancia(por_preco) < min(distancia(v) for v in versoes if v is not por_preco):
                    escolhida, criterio = por_preco, "preço mais próximo"
                nomes = sorted({(v.catalogo[idx] if idx < len(v.catalogo) else "(fora do catálogo)") for v in versoes})
                res.avisos.append(
                    f"{imovel_id} chave {chave!r}: ambígua entre {nomes} — usado "
                    f"{escolhida.catalogo[idx] if idx < len(escolhida.catalogo) else '(fora)'!r} ({criterio})"
                )
            catalogo_escolhido = escolhida.catalogo
            dest = destino(catalogo_escolhido, idx)
            nome_antigo = catalogo_escolhido[idx] if idx < len(catalogo_escolhido) else None
            if dest is None:
                arquivadas[chave] = {**(valor if isinstance(valor, dict) else {"valor": valor}),
                                     "_itemNome": nome_antigo, "_motivo": "item não existe mais no catálogo"}
                continue
            nova = f"{ids_atuais[dest]}{sufixo}"
            if nova in novas:
                # duas chaves antigas apontam pro mesmo item: vale a gravada por último
                if idade[nova] >= j:
                    arquivadas[chave] = {**valor, "_itemNome": nome_antigo, "_motivo": "duplicada (mais antiga)"}
                    continue
                perdedora = novas[nova]
                arquivadas[f"{nova}@anterior"] = {**perdedora, "_itemNome": nome_antigo, "_motivo": "duplicada (mais antiga)"}
            novas[nova], idade[nova] = valor, j
            res.convertidas += 1
            if dest != idx:
                res.deslocadas += 1
            else:
                res.mantidas += 1
        res.compras[imovel_id] = novas
        if arquivadas:
            res.arquivadas[imovel_id] = arquivadas
    return res


def _tem_chave_de_posicao(compras: dict | None) -> bool:
    return any(CHAVE_POSICAO_RE.match(k) for k in (compras or {}))


def migrar(db: Session, aplicar: bool = True) -> Resultado | None:
    """Converte as chaves de posição de todos os imóveis. None se não há nada a converter.
    Com aplicar=False só calcula (relatório), sem gravar. Pré-requisito: itens com uid
    (state.garantir_uid_itens)."""
    atual_state = state.get_state(db, "", "")
    if not any(_tem_chave_de_posicao(im.get("compras")) for im in atual_state["wc_imoveis"]):
        return None
    itens = atual_state["wc_itens"]
    if not all(i.get("id") for i in itens):
        raise RuntimeError("itens sem uid — rodar state.garantir_uid_itens antes")

    historico = []
    for b in db.scalars(select(models.Backup).order_by(models.Backup.hora_bucket)):
        snap = b.snapshot or {}
        historico.append(Versao(
            rotulo=f"backup {b.hora_bucket}",
            catalogo=[i.get("nome") for i in snap.get("wc_itens") or []],
            compras={im["id"]: im.get("compras") or {} for im in snap.get("wc_imoveis") or [] if im.get("id")},
            precos=snap.get("wc_itens") or [],
            enxoval=snap.get("wc_enxoval") or {},
        ))
    historico.append(Versao(
        rotulo="atual",
        catalogo=[i.get("nome") for i in itens],
        compras={im["id"]: im.get("compras") or {} for im in atual_state["wc_imoveis"]},
        precos=itens,
        enxoval=atual_state.get("wc_enxoval") or {},
    ))
    res = planejar(historico, [i["id"] for i in itens])
    if aplicar:
        for im in atual_state["wc_imoveis"]:
            if im["id"] in res.compras:
                im["compras"] = res.compras[im["id"]]
            if im["id"] in res.arquivadas:
                im["comprasArquivadas"] = {**(im.get("comprasArquivadas") or {}), **res.arquivadas[im["id"]]}
        state.put_state_versionado(db, atual_state)
    return res
