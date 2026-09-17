"""Testes da lógica anti-sobrescrita (app/merge.py) — a parte mais crítica
deste backend. Cada função aqui corresponde a um incidente real de perda
de dados documentado em docs/ANALISE-MIGRACAO.md e nos comentários do
próprio merge.py (ex: incidente 2026-09-03, bug da pasta do Drive da
Nicole). São funções puras — não precisam de app nem banco."""

from app.merge import (
    contar_comprados,
    has_val,
    merge_array_simples,
    merge_campos_nao_vazios,
    merge_compras,
    merge_item_arrays_by_id,
    merge_ops,
    merge_save,
    merge_status_ativacao,
    reconciliar_sublistas_imoveis,
)


class TestHasVal:
    def test_zero_is_valid(self):
        # "0 lavabos" precisa contar como preenchido, não vazio
        assert has_val(0) is True

    def test_empty_string_is_not_valid(self):
        assert has_val("") is False

    def test_none_is_not_valid(self):
        assert has_val(None) is False

    def test_normal_value_is_valid(self):
        assert has_val("2 lavabos") is True
        assert has_val(False) is True  # só None e "" são inválidos


class TestMergeItemArraysById:
    def test_normal_shrink_is_not_catastrophic(self):
        # de 3 pra 2 itens, tirando 1 de propósito — deve respeitar a exclusão
        old = [{"id": 1}, {"id": 2}, {"id": 3}]
        new = [{"id": 1}, {"id": 2}]
        assert merge_item_arrays_by_id(old, new) == new

    def test_small_list_can_shrink_to_zero(self):
        # Incidente 2026-09-03: listas pequenas (ex: 2 manutenções) que iam a
        # zero eram tratadas como "catastróficas" e a exclusão nunca "pegava".
        old = [{"id": 1}, {"id": 2}]
        new = []
        assert merge_item_arrays_by_id(old, new) == []

    def test_catastrophic_shrink_to_zero_recovers_items(self):
        old = [{"id": i} for i in range(1, 6)]  # 5 itens
        new = []
        result = merge_item_arrays_by_id(old, new)
        assert {r["id"] for r in result} == {1, 2, 3, 4, 5}

    def test_catastrophic_shrink_from_8_to_2_recovers_missing(self):
        old = [{"id": i} for i in range(1, 9)]  # 8 itens
        new = [{"id": 1}, {"id": 2}]
        result = merge_item_arrays_by_id(old, new)
        result_ids = {r["id"] for r in result}
        assert result_ids == {1, 2, 3, 4, 5, 6, 7, 8}

    def test_recovered_items_come_after_new_items(self):
        old = [{"id": i, "tag": "old"} for i in range(1, 6)]
        new = []
        result = merge_item_arrays_by_id(old, new)
        assert [r["id"] for r in result] == [1, 2, 3, 4, 5]

    def test_none_inputs_treated_as_empty(self):
        assert merge_item_arrays_by_id(None, None) == []
        assert merge_item_arrays_by_id(None, [{"id": 1}]) == [{"id": 1}]

    def test_items_without_id_are_not_recovered(self):
        old = [{"nome": "sem id"} for _ in range(6)]
        new = []
        assert merge_item_arrays_by_id(old, new) == []


class TestMergeCompras:
    def test_contar_comprados_ignores_non_dict_and_uncomprado(self):
        compras = {
            "a": {"comprado": True},
            "b": {"comprado": False},
            "c": "não é dict",
            "d": {"comprado": True},
        }
        assert contar_comprados(compras) == 2

    def test_contar_comprados_handles_none(self):
        assert contar_comprados(None) == 0

    def test_small_purchase_list_can_be_unmarked(self):
        # mesmo incidente 2026-09-03: desmarcar os últimos itens comprados de
        # um imóvel pequeno nunca deveria "voltar" sozinho
        old = {"a": {"comprado": True}, "b": {"comprado": True}}
        new = {"a": {"comprado": False}, "b": {"comprado": False}}
        assert merge_compras(old, new) == new

    def test_catastrophic_purchase_drop_keeps_old(self):
        old = {str(i): {"comprado": True} for i in range(5)}
        new = {}
        assert merge_compras(old, new) == old


class TestMergeOps:
    def test_preserves_existing_date_when_new_clears_it(self):
        old = {"fotos": {"data": "2026-01-01"}}
        new = {"fotos": {"data": ""}}
        result = merge_ops(old, new)
        assert result["fotos"]["data"] == "2026-01-01"

    def test_new_date_is_not_overwritten(self):
        old = {"fotos": {"data": "2026-01-01"}}
        new = {"fotos": {"data": "2026-02-01"}}
        result = merge_ops(old, new)
        assert result["fotos"]["data"] == "2026-02-01"

    def test_only_applies_to_known_keys(self):
        old = {"outraCoisa": {"data": "2026-01-01"}}
        new = {"outraCoisa": {"data": ""}}
        result = merge_ops(old, new)
        assert result["outraCoisa"]["data"] == ""

    def test_handles_none_inputs(self):
        assert merge_ops(None, None) == {}
        assert merge_ops(None, {"fotos": {"data": "x"}}) == {"fotos": {"data": "x"}}


class TestMergeStatusAtivacao:
    def test_regression_from_ativo_with_lost_date_is_reverted(self):
        old = {"status": "ativo", "dataAtivacao": "2026-01-01", "statusAnterior": "pendente"}
        novo = {"status": "pausado", "dataAtivacao": None}
        result = merge_status_ativacao(old, novo)
        assert result["status"] == "ativo"
        assert result["dataAtivacao"] == "2026-01-01"

    def test_legitimate_status_change_is_accepted(self):
        old = {"status": "ativo", "dataAtivacao": "2026-01-01"}
        novo = {"status": "pausado", "dataAtivacao": "2026-01-01", "statusAnterior": "ativo"}
        result = merge_status_ativacao(old, novo)
        assert result["status"] == "pausado"

    def test_no_old_state_just_passes_through(self):
        novo = {"status": "novo", "dataAtivacao": None, "statusAnterior": None}
        assert merge_status_ativacao(None, novo) == novo


class TestMergeArraySimples:
    def test_small_list_can_shrink_to_zero(self):
        old = ["Airbnb", "Booking"]
        assert merge_array_simples(old, []) == []

    def test_catastrophic_shrink_keeps_old(self):
        old = [f"cama{i}" for i in range(5)]
        assert merge_array_simples(old, []) == old


class TestMergeCamposNaoVazios:
    def test_keeps_old_value_when_new_is_empty(self):
        old = {"linkDrive": "https://drive.google.com/pasta-x"}
        novo = {"linkDrive": ""}
        result = merge_campos_nao_vazios(old, novo)
        assert result["linkDrive"] == "https://drive.google.com/pasta-x"

    def test_uses_new_value_when_present(self):
        old = {"linkDrive": "old"}
        novo = {"linkDrive": "new"}
        assert merge_campos_nao_vazios(old, novo)["linkDrive"] == "new"

    def test_zero_counts_as_present_in_new(self):
        old = {"lavabos": 2}
        novo = {"lavabos": 0}
        assert merge_campos_nao_vazios(old, novo)["lavabos"] == 0


class TestReconciliarSublistasImoveis:
    def test_recovers_drive_link_lost_on_outdated_sync(self):
        # Bug reportado pela Nicole: pasta do Drive adicionada em outro lugar
        # sumia quando um dispositivo desatualizado sincronizava por cima.
        old = [{"id": "im1", "nome": "Casa X", "captacaoLink": "https://drive/pasta"}]
        new = [{"id": "im1", "nome": "Casa X", "captacaoLink": ""}]
        result = reconciliar_sublistas_imoveis(old, new)
        assert result[0]["captacaoLink"] == "https://drive/pasta"

    def test_recovers_sublists_lost_on_shrink(self):
        old = [{"id": "im1", "manutencoes": [{"id": m} for m in range(1, 6)]}]
        new = [{"id": "im1", "manutencoes": []}]
        result = reconciliar_sublistas_imoveis(old, new)
        assert {m["id"] for m in result[0]["manutencoes"]} == {1, 2, 3, 4, 5}

    def test_new_imovel_without_match_passes_through(self):
        old = [{"id": "im1"}]
        new = [{"id": "im1"}, {"id": "im2", "nome": "Novo"}]
        result = reconciliar_sublistas_imoveis(old, new)
        assert any(r["id"] == "im2" and r["nome"] == "Novo" for r in result)

    def test_non_list_inputs_return_new_or_empty(self):
        assert reconciliar_sublistas_imoveis(None, [{"id": "x"}]) == [{"id": "x"}]
        assert reconciliar_sublistas_imoveis([{"id": "x"}], None) == []


class TestMergeSave:
    def test_incoming_overwrites_current_by_default(self):
        current = {"algumCampo": "antigo"}
        body = {"algumCampo": "novo"}
        result = merge_save(current, body)
        assert result["algumCampo"] == "novo"

    def test_catastrophic_list_shrink_is_rejected(self):
        current = {"wc_prestadores": [{"id": i} for i in range(6)]}
        body = {"wc_prestadores": []}
        result = merge_save(current, body)
        assert result["wc_prestadores"] == current["wc_prestadores"]

    def test_non_catastrophic_list_shrink_is_accepted(self):
        current = {"wc_prestadores": [{"id": 1}, {"id": 2}]}
        body = {"wc_prestadores": [{"id": 1}]}
        result = merge_save(current, body)
        assert result["wc_prestadores"] == [{"id": 1}]

    def test_reconciles_wc_imoveis(self):
        current = {"wc_imoveis": [{"id": "im1", "nome": "Casa", "captacaoLink": "link"}]}
        body = {"wc_imoveis": [{"id": "im1", "nome": "Casa", "captacaoLink": ""}]}
        result = merge_save(current, body)
        assert result["wc_imoveis"][0]["captacaoLink"] == "link"

    def test_last_saved_only_advances_forward(self):
        current = {"lastSaved": 1000}
        body_older = {"lastSaved": 500}
        body_newer = {"lastSaved": 2000}
        assert merge_save(current, body_older)["lastSaved"] == 1000
        assert merge_save(current, body_newer)["lastSaved"] == 2000

    def test_missing_last_saved_keeps_current(self):
        current = {"lastSaved": 1000}
        body = {}
        assert merge_save(current, body)["lastSaved"] == 1000
