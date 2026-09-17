"""Testes de fumaça — confirmam que a autenticação por token e as rotas
básicas respondem como esperado. Não cobre toda a superfície da API (isso
fica pra uma próxima rodada); o objetivo aqui é ter uma rede de segurança
mínima que pega uma regressão óbvia (ex: endpoint parando de exigir auth,
ou o app não subindo)."""


def test_root_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200


def test_load_without_token_is_unauthorized(client):
    resp = client.get("/load")
    assert resp.status_code == 401


def test_load_with_wrong_token_is_unauthorized(client):
    resp = client.get("/load", params={"token": "token-errado"})
    assert resp.status_code == 401


def test_load_with_valid_token_succeeds(client):
    resp = client.get("/load", params={"token": "test-token"})
    assert resp.status_code == 200


def test_load_with_auth_override_succeeds(auth_client):
    resp = auth_client.get("/load")
    assert resp.status_code == 200


def test_onboarding_stats_has_no_auth_by_design(client):
    # Rota deliberadamente sem auth (espelha worker.js) — não é regressão,
    # só documentando o comportamento esperado.
    resp = client.get("/onboarding-stats")
    assert resp.status_code == 200
