"""Bug 1 (2026-09-25): duas pessoas editando o mesmo imóvel — valia quem salvasse por último,
inclusive nos campos que a 1ª mexeu e a 2ª nem tocou. Agora o cliente manda patch por unidade
(ver app/merge_campos.py) e o servidor só recusa a unidade que outra pessoa mudou depois da
versão-base do cliente."""

from app.merge_campos import aplicar_patch, caminhos_alterados, unidades

BASE_IM = {
    "id": "im1", "nome": "Apto", "endereco": "Rua A", "captacaoLink": "https://drive/x",
    "status": "setup", "statusAnterior": "contrato", "dataAtivacao": None,
    "compras": {"itA": {"comprado": False}, "itB": {"comprado": False}},
    "manutencoes": [{"id": "m1", "titulo": "Pia"}, {"id": "m2", "titulo": "Luz"}],
    "camas": [{"tipo": "Casal", "qtd": 1}],
}


def _load(c):
    return c.get("/load").json()["data"]


def _patch(c, base, ops):
    ops = [{**op, "im": _ID["atual"] if op.get("im") == "im_m" else op.get("im")} for op in ops]
    return c.post("/save", json={"_proto": 3, "_imoveisPatch": {"base": base, "ops": ops}}).json()


_ID = {"atual": "im_m"}


def _imovel(c, imovel_id=None):
    return next(i for i in _load(c)["wc_imoveis"] if i["id"] == (imovel_id or _ID["atual"]))


def _semear(c, im):
    """Cria o imóvel com id único por teste (o banco de teste é compartilhado) e devolve a
    revisão-base. Os ops dos testes usam "im_m", trocado pelo id único em _patch."""
    import uuid
    _ID["atual"] = "im_" + uuid.uuid4().hex[:8]
    rev = _load(c)["_revs"]["wc_imoveis"]
    r = c.post("/save", json={"_proto": 3, "_imoveisPatch": {"base": rev, "ops": [
        {"im": _ID["atual"], "novo": {**im, "id": _ID["atual"]}}]}}).json()
    assert r["ok"] and not r["conflitosImoveis"], r
    return _load(c)["_revs"]["wc_imoveis"]


class TestUnidades:
    def test_granularidade(self):
        u = unidades(BASE_IM)
        assert ("nome",) in u and ("compras", "itA") in u and ("manutencoes", "m2") in u
        assert ("camas",) in u  # lista sem id: atômica
        assert ("_status",) in u and ("status",) not in u  # grupo

    def test_caminhos_alterados(self):
        depois = {**BASE_IM, "compras": {**BASE_IM["compras"], "itB": {"comprado": True}}, "nome": "Apto 2"}
        assert sorted(caminhos_alterados([BASE_IM], [depois])) == sorted(["im1\x1fnome", "im1\x1fcompras\x1fitB"])


class TestAplicarPatch:
    def test_campos_diferentes_os_dois_ficam(self):
        # A já gravou nome (rev 5); B, com base 4, grava endereço
        novos, conf = aplicar_patch([{**BASE_IM, "nome": "Nome da A"}], {"base": 4, "ops": [
            {"im": "im1", "caminho": ["endereco"], "valor": "Rua da B"}]}, {"im1\x1fnome": 5})
        assert not conf and novos[0]["nome"] == "Nome da A" and novos[0]["endereco"] == "Rua da B"

    def test_mesmo_campo_recusa_a_segunda(self):
        novos, conf = aplicar_patch([{**BASE_IM, "nome": "Nome da A"}], {"base": 4, "ops": [
            {"im": "im1", "caminho": ["nome"], "valor": "Nome da B"}]}, {"im1\x1fnome": 5})
        assert novos[0]["nome"] == "Nome da A" and conf[0]["caminho"] == ["nome"]

    def test_mesmo_valor_nao_e_conflito(self):
        _, conf = aplicar_patch([{**BASE_IM, "nome": "Igual"}], {"base": 4, "ops": [
            {"im": "im1", "caminho": ["nome"], "valor": "Igual"}]}, {"im1\x1fnome": 5})
        assert not conf

    def test_camas_lista_inteira_conflita(self):
        _, conf = aplicar_patch([{**BASE_IM, "camas": [{"tipo": "King", "qtd": 1}]}], {"base": 4, "ops": [
            {"im": "im1", "caminho": ["camas"], "valor": [{"tipo": "Casal", "qtd": 2}]}]}, {"im1\x1fcamas": 5})
        assert conf

    def test_grupo_status(self):
        # A mudou status (grupo _status na rev 5); B mexe em dataAtivacao -> mesmo grupo -> conflito
        _, conf = aplicar_patch([{**BASE_IM, "status": "ativo"}], {"base": 4, "ops": [
            {"im": "im1", "caminho": ["_status"], "valor": {"status": "setup", "statusAnterior": "contrato", "dataAtivacao": "2026-09-01"}}]},
            {"im1\x1f_status": 5})
        assert conf


class TestSaveNoServidor:
    def test_duas_pessoas_campos_diferentes_do_mesmo_imovel(self, auth_client):
        """O incidente: A e B abrem o mesmo imóvel; A muda o nome, B muda o endereço. Antes o
        save da B (imóvel inteiro) desfazia o nome da A."""
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        ra = _patch(auth_client, base, [{"im": "im_m", "caminho": ["nome"], "valor": "Nome da A"}])
        rb = _patch(auth_client, base, [{"im": "im_m", "caminho": ["endereco"], "valor": "Rua da B"}])
        assert not ra["conflitosImoveis"] and not rb["conflitosImoveis"]
        im = _imovel(auth_client)
        assert im["nome"] == "Nome da A" and im["endereco"] == "Rua da B"

    def test_mesmo_campo_segunda_recebe_conflito(self, auth_client):
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        _patch(auth_client, base, [{"im": "im_m", "caminho": ["nome"], "valor": "Nome da A"}])
        rb = _patch(auth_client, base, [{"im": "im_m", "caminho": ["nome"], "valor": "Nome da B"}])
        assert rb["conflitosImoveis"][0]["caminho"] == ["nome"]
        assert _imovel(auth_client)["nome"] == "Nome da A"

    def test_compras_de_itens_diferentes(self, auth_client):
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        _patch(auth_client, base, [{"im": "im_m", "caminho": ["compras", "itA"], "valor": {"comprado": True}}])
        rb = _patch(auth_client, base, [{"im": "im_m", "caminho": ["compras", "itB"], "valor": {"comprado": True}}])
        assert not rb["conflitosImoveis"]
        c = _imovel(auth_client)["compras"]
        assert c["itA"]["comprado"] and c["itB"]["comprado"]

    def test_manutencoes_por_item(self, auth_client):
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        _patch(auth_client, base, [{"im": "im_m", "caminho": ["manutencoes", "m3"], "valor": {"id": "m3", "titulo": "Nova da A"}}])
        rb = _patch(auth_client, base, [{"im": "im_m", "caminho": ["manutencoes", "m1"], "valor": {"id": "m1", "titulo": "Pia (B)"}}])
        assert not rb["conflitosImoveis"]
        assert [m["titulo"] for m in _imovel(auth_client)["manutencoes"]] == ["Pia (B)", "Luz", "Nova da A"]
        # A editou m2; B (base antiga) apaga m2 -> conflito, m2 fica
        base2 = _load(auth_client)["_revs"]["wc_imoveis"]
        _patch(auth_client, base2, [{"im": "im_m", "caminho": ["manutencoes", "m2"], "valor": {"id": "m2", "titulo": "Luz (A)"}}])
        rb2 = _patch(auth_client, base2, [{"im": "im_m", "caminho": ["manutencoes", "m2"], "apagar": True}])
        assert rb2["conflitosImoveis"]
        assert any(m["id"] == "m2" for m in _imovel(auth_client)["manutencoes"])

    def test_limpar_campo_de_proposito_funciona(self, auth_client):
        """Efeito colateral antigo: merge_campos_nao_vazios impedia apagar o link do Drive."""
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        r = _patch(auth_client, base, [{"im": "im_m", "caminho": ["captacaoLink"], "valor": ""}])
        assert not r["conflitosImoveis"] and _imovel(auth_client)["captacaoLink"] == ""

    def test_edicao_de_outra_rota_tambem_conta_pra_conflito(self, auth_client):
        """Escrita que não vem do /save (vistoria, análise do Drive) registra a revisão por campo."""
        from app import state
        from app.database import SessionLocal
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        with SessionLocal() as s:
            st = state.get_state(s, "", "")
            next(i for i in st["wc_imoveis"] if i["id"] == _ID["atual"])["endereco"] = "Rua do formulário"
            state.put_state_versionado(s, st)
            s.commit()
        r = _patch(auth_client, base, [{"im": "im_m", "caminho": ["endereco"], "valor": "Rua da B"}])
        assert r["conflitosImoveis"] and _imovel(auth_client)["endereco"] == "Rua do formulário"

    def test_imovel_apagado_por_outra_pessoa(self, auth_client):
        base = _semear(auth_client, {**BASE_IM, "id": "im_m"})
        _patch(auth_client, base, [{"im": "im_m"}])  # A apaga
        rb = _patch(auth_client, base, [{"im": "im_m", "caminho": ["nome"], "valor": "B edita"}])
        assert rb["conflitosImoveis"][0]["motivo"].startswith("imóvel foi apagado")
        assert not any(i["id"] == _ID["atual"] for i in _load(auth_client)["wc_imoveis"])

    def test_cliente_v2_imovel_inteiro_e_recusado(self, auth_client):
        _semear(auth_client, {**BASE_IM, "id": "im_m"})
        r = auth_client.post("/save", json={"_proto": 2, "wc_imoveis": [{**BASE_IM, "id": _ID["atual"], "nome": "v2"}]}).json()
        assert "wc_imoveis" in r["conflitos"] and _imovel(auth_client)["nome"] == "Apto"
