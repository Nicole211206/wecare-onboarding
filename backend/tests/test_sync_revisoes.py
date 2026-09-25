"""Controle de versão por coleção no /load e /save (incidente 2026-09-24: edição em
Configurações "voltava no dia seguinte" porque um navegador desatualizado reenviava a versão
antiga de todas as coleções e o servidor aceitava). Ver REV_KEYS em app/merge.py.

O banco de teste é compartilhado entre os testes (conftest.py), então cada teste lê as
revisões atuais antes de agir em vez de assumir valores absolutos."""

from app.merge import filtrar_conflitos

ITENS_A = [{"cat": "Cama", "nome": "Travesseiro Sanomed"}, {"cat": "Cama", "nome": "Travesseiro Toque de Pluma"}]


def _load(c):
    return c.get("/load").json()["data"]


def _save(c, body):
    """/save de um app.js atual (protocolo 2) — ver merge.PROTOCOLO_MINIMO."""
    resp = c.post("/save", json={"_proto": 3, **body})
    assert resp.status_code == 200
    return resp.json()


class TestFiltrarConflitos:
    def test_base_igual_ao_servidor_passa(self):
        body, conflitos = filtrar_conflitos({"wc_itens": [], "_baseRevs": {"wc_itens": 3}, "_proto": 3}, {"wc_itens": 3})
        assert body == {"wc_itens": []}
        assert conflitos == []

    def test_base_desatualizada_e_recusada(self):
        body, conflitos = filtrar_conflitos({"wc_itens": [], "_baseRevs": {"wc_itens": 2}, "_proto": 3}, {"wc_itens": 3})
        assert "wc_itens" not in body
        assert conflitos == ["wc_itens"]

    def test_cliente_antigo_nao_grava_nada(self):
        # aba com app.js antigo em cache (sem _proto, ou v1 com _baseRevs): não grava nenhuma
        # coleção — nem imóveis, que ele regravaria com compras chaveado por posição
        for body_antigo in ({"wc_itens": [], "wc_imoveis": [], "lastSaved": 1},
                            {"wc_itens": [], "wc_imoveis": [], "_baseRevs": {"wc_itens": 0}}):
            body, conflitos = filtrar_conflitos(body_antigo, {"wc_itens": 0})
            assert "wc_itens" not in body and "wc_imoveis" not in body
            assert sorted(conflitos) == ["wc_imoveis", "wc_itens"]

    def test_colecao_nao_enviada_nao_e_conflito(self):
        body, conflitos = filtrar_conflitos({"wc_templates_msg": [], "_baseRevs": {"wc_templates_msg": 0}, "_proto": 3}, {"wc_itens": 9})
        assert conflitos == []


class TestSaveVersionado:
    def test_load_devolve_revisoes(self, auth_client):
        revs = _load(auth_client)["_revs"]
        assert "wc_itens" in revs and "wc_imoveis" in revs

    def test_save_aceito_incrementa_so_a_colecao_alterada(self, auth_client):
        revs = _load(auth_client)["_revs"]
        r = _save(auth_client, {"wc_itens": ITENS_A, "_baseRevs": {"wc_itens": revs["wc_itens"]}})
        assert r["conflitos"] == []
        assert r["revs"]["wc_itens"] == revs["wc_itens"] + 1
        assert r["revs"]["wc_templates_msg"] == revs["wc_templates_msg"]

    def test_save_sem_mudanca_real_nao_incrementa(self, auth_client):
        data = _load(auth_client)
        r = _save(auth_client, {"wc_itens": data["wc_itens"], "_baseRevs": {"wc_itens": data["_revs"]["wc_itens"]}})
        assert r["revs"]["wc_itens"] == data["_revs"]["wc_itens"]

    def test_navegador_desatualizado_nao_desfaz_edicao(self, auth_client):
        """Reprodução do incidente: A e B leem a mesma versão; A apaga um item; B, sem ter
        puxado, salva a lista antiga dele. Antes, B vencia e o item "voltava"."""
        _save(auth_client, {"wc_itens": ITENS_A, "_baseRevs": {"wc_itens": _load(auth_client)["_revs"]["wc_itens"]}})
        lido = _load(auth_client)
        base_b = lido["_revs"]["wc_itens"]
        itens_antigos_b = lido["wc_itens"]

        # A apaga "Travesseiro Toque de Pluma"
        r_a = _save(auth_client, {"wc_itens": itens_antigos_b[:1], "_baseRevs": {"wc_itens": base_b}})
        assert r_a["conflitos"] == []

        # B (desatualizado) reenvia a versão antiga com a revisão que tinha lido
        r_b = _save(auth_client, {"wc_itens": itens_antigos_b, "_baseRevs": {"wc_itens": base_b}})
        assert r_b["conflitos"] == ["wc_itens"]

        nomes = [i["nome"] for i in _load(auth_client)["wc_itens"]]
        assert nomes == ["Travesseiro Sanomed"]

    def test_cliente_antigo_nao_sobrescreve_configuracoes(self, auth_client):
        antes = _load(auth_client)
        r = auth_client.post("/save", json={"wc_itens": [{"cat": "X", "nome": "versao velha"}], "lastSaved": 1}).json()
        assert "wc_itens" in r["conflitos"]
        assert _load(auth_client)["wc_itens"] == antes["wc_itens"]

    def test_escrita_de_imovel_incrementa_revisao(self, auth_client):
        revs = _load(auth_client)["_revs"]
        r = _save(auth_client, {"_imoveisPatch": {"base": revs["wc_imoveis"], "ops": [
            {"im": "im_rev_teste", "novo": {"nome": "Apto Teste"}}]}})
        assert r["revs"]["wc_imoveis"] == revs["wc_imoveis"] + 1


def test_item_sem_modalidades_volta_como_none_e_nao_lista_vazia(auth_client):
    # no app.js, modalidades ausente = aparece em todas; [] = não aparece em nenhuma
    data = _load(auth_client)
    itens = [{"cat": "Cozinha", "nome": "Air Fryer"}, {"cat": "Cama", "nome": "Edredom", "modalidades": ["flashee"]}]
    _save(auth_client, {"wc_itens": itens, "_baseRevs": {"wc_itens": data["_revs"]["wc_itens"]}})
    por_nome = {i["nome"]: i for i in _load(auth_client)["wc_itens"]}
    assert por_nome["Air Fryer"]["modalidades"] is None
    assert por_nome["Edredom"]["modalidades"] == ["flashee"]
