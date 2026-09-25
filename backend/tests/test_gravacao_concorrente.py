"""Rotas que fazem `await` (Drive, Claude) entre ler e gravar o estado não podem gravar o
estado lido lá no começo por cima do que outras requisições gravaram nesse meio tempo
(incidente 2026-09-25 — ver state.reler_estado). Drive e Claude são substituídos por fakes,
e o fake simula "outra requisição" gravando no banco enquanto a rota está no `await`."""

import httpx
import pytest

from app import anthropic_client, google_drive, state
from app.config import settings
from app.database import SessionLocal

LINK_A = "https://drive.google.com/drive/folders/PASTA_A_123"
LINK_B_NOVO = "https://drive.google.com/drive/folders/PASTA_B_NOVA"


def _outra_requisicao(mutacao):
    """Grava no banco por outra sessão, como outra requisição concorrente faria."""
    with SessionLocal() as s:
        st = state.get_state(s, "", "")
        mutacao(st)
        state.put_state_versionado(s, st)
        s.commit()


def _imovel(c, imovel_id):
    return next(i for i in c.get("/load").json()["data"]["wc_imoveis"] if i["id"] == imovel_id)


def _por_id(st, imovel_id):
    return next(i for i in st["wc_imoveis"] if i["id"] == imovel_id)


class _FakeResp:
    def json(self):
        return {}


class _FakeAsyncClient:
    def __init__(self, *a, **kw):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, *a, **kw):
        return _FakeResp()


@pytest.fixture()
def drive_fake(monkeypatch):
    for campo in ("anthropic_api_key", "google_client_id", "google_client_secret", "google_refresh_token"):
        monkeypatch.setattr(settings, campo, "fake")
    monkeypatch.setattr(httpx, "AsyncClient", _FakeAsyncClient)

    async def token(client):
        return "tok"

    async def listar(client, folder_id, tok):
        return [{"id": "doc1", "name": "Contrato", "mimeType": "application/vnd.google-apps.document"}]

    async def exportar(client, file_id, tok):
        return "Apartamento com 2 quartos"

    async def pasta(client, tok, parent_id, nome):
        return "pasta_vistoria"

    monkeypatch.setattr(google_drive, "get_google_access_token", token)
    monkeypatch.setattr(google_drive, "list_drive_folder", listar)
    monkeypatch.setattr(google_drive, "export_google_doc", exportar)
    monkeypatch.setattr(google_drive, "find_or_create_folder", pasta)
    return monkeypatch


def _semear(c, imoveis):
    assert c.post("/save", json={"wc_imoveis": imoveis}).json()["ok"]


def test_analise_do_drive_nao_desfaz_edicao_feita_durante_a_analise(auth_client, drive_fake):
    _semear(auth_client, [
        {"id": "im_a", "nome": "Imóvel A", "captacaoLink": LINK_A},
        {"id": "im_b", "nome": "Imóvel B", "captacaoLink": ""},
    ])

    async def claude(user_content, perguntas=None):
        # enquanto o Claude "pensa", a Nicole cola o link do Drive no imóvel B
        _outra_requisicao(lambda st: _por_id(st, "im_b").update(captacaoLink=LINK_B_NOVO))
        return {}

    drive_fake.setattr(anthropic_client, "analisar_drive", claude)
    r = auth_client.post("/analisar-drive", json={"id": "im_a", "captacaoLink": LINK_A}).json()
    assert r["ok"], r

    assert _imovel(auth_client, "im_b")["captacaoLink"] == LINK_B_NOVO  # antes: voltava a ""
    assert _imovel(auth_client, "im_a")["claudeAnalisadoEm"]


def test_analise_do_drive_nao_ressuscita_imovel_apagado_durante_a_analise(auth_client, drive_fake):
    _semear(auth_client, [{"id": "im_c", "nome": "Imóvel C", "captacaoLink": LINK_A}, {"id": "im_d", "nome": "D"}])

    async def claude(user_content, perguntas=None):
        _outra_requisicao(lambda st: st.update(wc_imoveis=[i for i in st["wc_imoveis"] if i["id"] != "im_c"]))
        return {}

    drive_fake.setattr(anthropic_client, "analisar_drive", claude)
    r = auth_client.post("/analisar-drive", json={"id": "im_c", "captacaoLink": LINK_A}).json()
    assert not r["ok"]
    ids = [i["id"] for i in auth_client.get("/load").json()["data"]["wc_imoveis"]]
    assert "im_c" not in ids


def test_uploads_paralelos_da_vistoria_nao_se_apagam(auth_client, drive_fake):
    _semear(auth_client, [{
        "id": "im_v", "nome": "Imóvel V", "captacaoLink": LINK_A,
        "vistorias": [{"id": "v1", "token": "tk", "status": "pendente", "dados": {"comodos": [{"nome": "Sala"}]}}],
    }])

    async def upload(client, tok, pasta_id, nome, mime, conteudo):
        # outro upload (de outro arquivo, em paralelo) termina antes deste
        def registrar_outro(st):
            v = _por_id(st, "im_v")["vistorias"][0]
            v["dados"]["comodos"][0].setdefault("midiaDrive", []).append({"driveFileId": "outro", "nome": "outro.jpg"})
        _outra_requisicao(registrar_outro)
        return {"id": "este", "webViewLink": "https://drive.google.com/file/d/este"}

    drive_fake.setattr(google_drive, "upload_file", upload)
    r = auth_client.post(
        "/vistoria-upload",
        data={"id": "im_v", "vid": "v1", "t": "tk", "comodoIdx": "0", "comodoNome": "Sala"},
        files={"file": ("foto.jpg", b"123", "image/jpeg")},
    ).json()
    assert r["ok"], r
    assert r["total"] == 2

    midia = _imovel(auth_client, "im_v")["vistorias"][0]["dados"]["comodos"][0]["midiaDrive"]
    assert sorted(m["driveFileId"] for m in midia) == ["este", "outro"]  # antes: só "este"
