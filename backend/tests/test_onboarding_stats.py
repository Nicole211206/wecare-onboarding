"""/onboarding-stats (lido pela Claire) e o round-trip das chaves novas do estado:
etapas por Definição Operacional e post-its de Anotações."""

from app import state
from app.database import SessionLocal


def _imovel(id_, **campos):
    base = {
        "id": id_, "nome": id_, "status": "ativo", "contratoAssinado": True,
        "incluirKpiClaire": True, "mesReferenciaKpi": "2026-09",
    }
    base.update(campos)
    return base


def _stats(client):
    r = client.get("/onboarding-stats")
    assert r.status_code == 200
    return r.json()


def _por_nome(resp, nome):
    return next(i for i in resp["imoveis"] if i["nome"] == nome)


def test_sem_check_a_liberacao_e_a_assinatura(client, semear_imoveis):
    semear_imoveis([_imovel("a", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-11")])
    im = _por_nome(_stats(client), "a")
    assert im["dataLiberacao"] == "2026-09-01"
    assert im["diasOnboarding"] == 10
    assert im["baseCalculo"] == "liberacao"
    assert im["diasEsperaProprietario"] == 0
    assert im["semDataLiberacao"] is False


def test_liberacao_diferente_conta_a_partir_da_data_de_liberacao(client, semear_imoveis):
    semear_imoveis([_imovel(
        "b", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-21",
        liberacaoDiferente=True, dataLiberacao="2026-09-11",
    )])
    im = _por_nome(_stats(client), "b")
    assert im["dataLiberacao"] == "2026-09-11"
    assert im["diasOnboarding"] == 10
    assert im["diasContratoAteAtivo"] == 20
    assert im["diasEsperaProprietario"] == 10


def test_liberacao_diferente_sem_data_cai_pro_contrato_e_sinaliza(client, semear_imoveis):
    semear_imoveis([_imovel(
        "c", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-21",
        liberacaoDiferente=True, dataLiberacao="",
    )])
    im = _por_nome(_stats(client), "c")
    assert im["dataLiberacao"] is None
    assert im["baseCalculo"] == "contrato"
    assert im["diasOnboarding"] == 20
    assert im["semDataLiberacao"] is True


def test_imovel_antigo_com_data_liberacao_sem_o_check_conta_como_diferente(client, semear_imoveis):
    semear_imoveis([_imovel(
        "d", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-21", dataLiberacao="2026-09-16",
    )])
    im = _por_nome(_stats(client), "d")
    assert im["dataLiberacao"] == "2026-09-16"
    assert im["diasOnboarding"] == 5


def test_check_desmarcado_ignora_data_liberacao_guardada(client, semear_imoveis):
    semear_imoveis([_imovel(
        "e", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-11",
        liberacaoDiferente=False, dataLiberacao="2026-09-06",
    )])
    im = _por_nome(_stats(client), "e")
    assert im["dataLiberacao"] == "2026-09-01"
    assert im["diasOnboarding"] == 10


def test_sem_data_de_ativacao_nao_tem_dias(client, semear_imoveis):
    semear_imoveis([_imovel("f", status="onboarding", dataContratoAssinado="2026-09-01")])
    im = _por_nome(_stats(client), "f")
    assert im["diasOnboarding"] is None
    assert im["diasContratoAteAtivo"] is None


def test_data_invalida_nao_derruba_o_endpoint(client, semear_imoveis):
    semear_imoveis([_imovel("g", dataContratoAssinado="lixo", dataAtivacao="2026-09-11")])
    assert _por_nome(_stats(client), "g")["diasOnboarding"] is None


def test_reativacao_fica_fora_do_kpi_por_mes(client, semear_imoveis):
    semear_imoveis([
        _imovel("novo1", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-11"),
        _imovel("novo2", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-21"),
        _imovel("reat", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-02", tipoOnboarding="reativacao"),
    ])
    resp = _stats(client)
    assert _por_nome(resp, "reat")["tipoOnboarding"] == "Reativação"
    assert _por_nome(resp, "novo1")["tipoOnboarding"] == "Novo"
    mes = resp["kpiPorMes"]["2026-09"]
    assert mes["count"] == 2
    assert mes["mediaOnboardingDias"] == 15.0
    assert resp["baseCalculo"] == "liberacao"


def test_kpi_por_mes_conta_semdataliberacao(client, semear_imoveis):
    semear_imoveis([
        _imovel("h1", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-11"),
        _imovel("h2", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-21",
                liberacaoDiferente=True, dataLiberacao=""),
    ])
    mes = _stats(client)["kpiPorMes"]["2026-09"]
    assert mes["count"] == 2
    assert mes["semDataLiberacao"] == 1
    assert mes["mediaOnboardingDias"] == 15.0


def test_imovel_fora_do_kpi_ou_sem_mes_nao_entra(client, semear_imoveis):
    semear_imoveis([
        _imovel("i1", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-11", incluirKpiClaire=False),
        _imovel("i2", dataContratoAssinado="2026-09-01", dataAtivacao="2026-09-11", mesReferenciaKpi=None),
    ])
    assert _stats(client)["kpiPorMes"] == {}


def test_perdido_e_contrato_nao_assinado_nao_aparecem_na_lista(client, semear_imoveis):
    semear_imoveis([
        _imovel("j1", status="perdido"),
        _imovel("j2", status="contrato", contratoAssinado=False),
        _imovel("j3", status="onboarding"),
    ])
    nomes = {i["nome"] for i in _stats(client)["imoveis"]}
    assert nomes == {"j3"}


def test_def_operacional_guarda_etapas_e_devolve(client):
    defs = [
        {"id": "do1", "nome": "Fotos", "etapas": [{"id": "e1", "nome": "Agendar fotógrafo"}]},
        {"id": "do2", "nome": "Limpeza"},
    ]
    with SessionLocal() as s:
        st = state.get_state(s, "", "")
        st["wc_def_operacionais"] = defs
        state.put_state_versionado(s, st)
        s.commit()
    got = client.get("/load", params={"token": "test-token"}).json()["data"]["wc_def_operacionais"]
    assert got[0]["etapas"] == [{"id": "e1", "nome": "Agendar fotógrafo"}]
    assert got[1]["etapas"] == []


def test_anotacoes_notas_round_trip_e_revisao(client):
    notas = [{"id": "n1", "texto": "primeiro", "cor": "amarelo"}, {"id": "n2", "texto": "segundo — ç"}]
    with SessionLocal() as s:
        st = state.get_state(s, "", "")
        antes = state.get_revs(s).get("wc_anotacoes_notas")
        st["wc_anotacoes_notas"] = notas
        revs = state.put_state_versionado(s, st)
        s.commit()
    assert revs["wc_anotacoes_notas"] == antes + 1
    data = client.get("/load", params={"token": "test-token"}).json()["data"]
    assert data["wc_anotacoes_notas"] == notas


def test_anotacoes_notas_corrompida_vira_lista_vazia(client):
    with SessionLocal() as s:
        state._set_texto(s, "anotacoes_notas", "{não é json")
        s.commit()
    data = client.get("/load", params={"token": "test-token"}).json()["data"]
    assert data["wc_anotacoes_notas"] == []
