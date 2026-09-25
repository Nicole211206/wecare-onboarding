"""Bug 2 (2026-09-25): im.compras chaveado pela posição do item no catálogo — apagar um item
do meio deslocava o "comprado" de todos os seguintes. Agora a chave é o id estável do item
(itens.uid), e a migração (app/migracao_compras.py) traduz as chaves antigas pelo catálogo
que existia quando cada marcação foi gravada (histórico dos backups)."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import migracao_compras, models, state
from app.database import Base
from app.migracao_compras import Versao, alinhar, planejar

A, B, C, D = "Rodo", "Balde", "Pá", "Edredom"
IDS = {A: "itA", B: "itB", C: "itC", D: "itD"}


def ids(catalogo):
    return [IDS.get(n, "it" + n.lower().replace(" ", "")) for n in catalogo]


class TestAlinhar:
    def test_item_apagado_no_meio(self):
        assert alinhar([A, B, C, D], [A, C, D]) == {0: 0, 2: 1, 3: 2}

    def test_renomeado_fica_na_mesma_posicao(self):
        assert alinhar([A, B, C], [A, "Balde grande", C]) == {0: 0, 1: 1, 2: 2}

    def test_movido_de_lugar_casa_pelo_nome(self):
        assert alinhar([A, B, C], [C, A, B]) == {0: 1, 1: 2, 2: 0}


class TestPlanejar:
    def test_marcacao_antiga_segue_o_item_depois_de_apagar_outro_do_meio(self):
        """O caso real: marcações gravadas com 4 itens; depois B é apagado. Pelo catálogo atual
        a chave "2" seria D (errado); pelo catálogo da época é C."""
        compras = {"2": {"comprado": True}, "3_Casal": {"qtdTem": 2}}
        hist = [Versao("v0", [A, B, C, D], {"im": compras}), Versao("atual", [A, C, D], {"im": compras})]
        r = planejar(hist, ids([A, C, D]))
        assert r.compras["im"] == {"itC": {"comprado": True}, "itD_Casal": {"qtdTem": 2}}
        assert r.deslocadas == 2

    def test_marcacao_feita_depois_de_apagar_usa_o_catalogo_novo(self):
        hist = [
            Versao("v0", [A, B, C], {"im": {}}),
            Versao("v1", [A, C], {"im": {}}),
            Versao("atual", [A, C], {"im": {"1": {"comprado": True}}}),
        ]
        assert planejar(hist, ids([A, C])).compras["im"] == {"itC": {"comprado": True}}

    def test_item_apagado_vai_pra_arquivadas_com_o_nome(self):
        compras = {"1": {"comprado": True, "qtdTem": 3}}
        hist = [Versao("v0", [A, B, C], {"im": compras}), Versao("atual", [A, C], {"im": compras})]
        r = planejar(hist, ids([A, C]))
        assert r.compras["im"] == {}
        assert r.arquivadas["im"]["1"]["_itemNome"] == B
        assert r.arquivadas["im"]["1"]["qtdTem"] == 3

    def test_duas_chaves_antigas_pro_mesmo_item_vale_a_mais_recente(self):
        # "2" gravada com o catálogo de 3 itens (= C); "1" gravada depois de apagar B (também C)
        hist = [
            Versao("v0", [A, B, C], {"im": {"2": {"qtdTem": 1}}}),
            Versao("v1", [A, C], {"im": {"2": {"qtdTem": 1}}}),
            Versao("atual", [A, C], {"im": {"2": {"qtdTem": 1}, "1": {"qtdTem": 5}}}),
        ]
        r = planejar(hist, ids([A, C]))
        assert r.compras["im"] == {"itC": {"qtdTem": 5}}
        assert any(v["_motivo"].startswith("duplicada") for v in r.arquivadas["im"].values())

    def test_ambigua_registra_aviso(self):
        # catálogo e marcação mudaram no mesmo intervalo entre snapshots
        hist = [Versao("v0", [A, B, C], {"im": {}}), Versao("atual", [A, C], {"im": {"1": {"comprado": True}}})]
        r = planejar(hist, ids([A, C]))
        assert r.compras["im"] == {"itC": {"comprado": True}}  # catálogo do fim do intervalo
        assert len(r.avisos) == 1

    def test_ambigua_com_preco_digitado_escolhe_o_item_de_preco_mais_proximo(self):
        # mesmo intervalo: catálogo [A,B,C] -> [A,C]; chave "1" com preço 29,90 ~ C (30), não B (20)
        precos3 = [{"tipoPreco": "fixo", "preco": p} for p in (10, 20, 30)]
        precos2 = [{"tipoPreco": "fixo", "preco": p} for p in (10, 30)]
        # a marcação aparece só no "atual" e o catálogo mudou nesse intervalo -> ambígua
        hist = [Versao("v0", [A, B, C], {"im": {}}, precos3),
                Versao("atual", [A, C], {"im": {"1": {"precoOverride": 29.9}}}, precos2)]
        r = planejar(hist, ids([A, C]))
        assert r.compras["im"] == {"itC": {"precoOverride": 29.9}}
        assert "preço mais próximo" in r.avisos[0]
        # com preço perto de B (20) a leitura muda pro catálogo antigo -> B foi apagado -> arquivada
        hist2 = [Versao("v0", [A, B, C], {"im": {}}, precos3),
                 Versao("atual", [A, C], {"im": {"1": {"precoOverride": 19.9}}}, precos2)]
        r2 = planejar(hist2, ids([A, C]))
        assert r2.compras["im"] == {} and r2.arquivadas["im"]["1"]["_itemNome"] == B

    def test_entrada_vazia_e_descartada_sem_gerar_ambiguidade(self):
        hist = [Versao("v0", [A, B, C], {"im": {}}), Versao("atual", [A, C], {"im": {"1": {"qtdReal": 0, "comprado": False}}})]
        r = planejar(hist, ids([A, C]))
        assert r.compras["im"] == {} and not r.avisos and r.descartadas_vazias == 1

    def test_chave_ja_por_id_nao_e_tocada(self):
        hist = [Versao("atual", [A], {"im": {"itA": {"comprado": True}}})]
        assert planejar(hist, ids([A])).compras["im"] == {"itA": {"comprado": True}}


@pytest.fixture()
def db_isolado(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path}/mig.db")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, autoflush=False)() as s:
        yield s


def test_migrar_no_banco_com_historico_e_idempotente(db_isolado):
    s = db_isolado
    compras = {"2": {"comprado": True}}
    s.add(models.Backup(hora_bucket=1, criado_em="0", snapshot={
        "wc_itens": [{"nome": n} for n in (A, B, C)],
        "wc_imoveis": [{"id": "im1", "compras": compras}],
    }))
    for idx, nome in enumerate((A, C)):  # B já apagado
        s.add(models.Item(ordem=idx, nome=nome, modalidades=[]))
    s.add(models.Imovel(id="im1", nome="Apto", extra={"compras": compras}))
    s.commit()

    assert state.garantir_uid_itens(s) == 2
    s.commit()
    r = migracao_compras.migrar(s)
    s.commit()
    uid_c = next(i["id"] for i in state.get_state(s, "", "")["wc_itens"] if i["nome"] == C)
    im = state.get_state(s, "", "")["wc_imoveis"][0]
    assert im["compras"] == {uid_c: {"comprado": True}}
    assert r.deslocadas == 1
    assert migracao_compras.migrar(s) is None  # 2ª vez: nada a fazer


def test_id_do_item_sobrevive_ao_save_do_catalogo(auth_client):
    data = auth_client.get("/load").json()["data"]
    itens = [{"id": "itfixo1", "cat": "X", "nome": "Um"}, {"cat": "X", "nome": "Sem id"}]
    auth_client.post("/save", json={"_proto": 2, "wc_itens": itens, "_baseRevs": {"wc_itens": data["_revs"]["wc_itens"]}})
    volta = auth_client.get("/load").json()["data"]["wc_itens"]
    assert volta[0]["id"] == "itfixo1"
    assert volta[1]["id"] and volta[1]["id"].startswith("it") and "_" not in volta[1]["id"]


def test_vistoria_em_cache_com_chave_de_posicao_grava_pelo_id(auth_client):
    data = auth_client.get("/load").json()["data"]
    itens = [{"id": "itv0", "cat": "X", "nome": "Zero"}, {"id": "itv1", "cat": "X", "nome": "Um"}]
    auth_client.post("/save", json={"_proto": 2, "wc_itens": itens, "_baseRevs": {"wc_itens": data["_revs"]["wc_itens"]}})
    auth_client.post("/save", json={"_proto": 2, "wc_imoveis": [
        {"id": "im_vc", "nome": "V", "compras": {}, "vistorias": [{"id": "v1", "token": "tk", "status": "pendente"}]},
    ]})
    r = auth_client.post("/vistoria-save", params={"id": "im_vc", "vid": "v1", "t": "tk"}, json={
        "enviado": True, "dados": {"itensChecklist": {"1": {"qtdTem": 2}, "itv0": {"qtdTem": 1}, "9": {"qtdTem": 7}}},
    }).json()
    assert r["ok"], r
    im = next(i for i in auth_client.get("/load").json()["data"]["wc_imoveis"] if i["id"] == "im_vc")
    assert im["compras"] == {"itv1": {"qtdTem": 2}, "itv0": {"qtdTem": 1}}


def test_item_sem_id_reaproveita_o_id_do_item_de_mesmo_nome(auth_client):
    data = auth_client.get("/load").json()["data"]
    itens = [{"id": "itreuso1", "cat": "X", "nome": "Escada"}]
    auth_client.post("/save", json={"_proto": 2, "wc_itens": itens, "_baseRevs": {"wc_itens": data["_revs"]["wc_itens"]}})
    data = auth_client.get("/load").json()["data"]
    # cliente que ainda não tinha o id manda o mesmo item sem id
    auth_client.post("/save", json={"_proto": 2, "wc_itens": [{"cat": "X", "nome": "Escada", "preco": 9}],
                                     "_baseRevs": {"wc_itens": data["_revs"]["wc_itens"]}})
    assert auth_client.get("/load").json()["data"]["wc_itens"][0]["id"] == "itreuso1"


def test_imovel_com_compras_por_posicao_nao_desfaz_a_migracao(auth_client):
    auth_client.post("/save", json={"_proto": 2, "wc_imoveis": [{"id": "im_pos", "nome": "P", "compras": {"itX": {"comprado": True}}}]})
    auth_client.post("/save", json={"_proto": 2, "wc_imoveis": [{"id": "im_pos", "nome": "P", "compras": {"3": {"comprado": False}}}]})
    im = next(i for i in auth_client.get("/load").json()["data"]["wc_imoveis"] if i["id"] == "im_pos")
    assert im["compras"] == {"itX": {"comprado": True}}
