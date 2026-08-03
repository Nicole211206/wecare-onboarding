"""checkAuth do worker.js: token vem SÓ de query string (?token=...), nunca
de header Authorization — o app.js atual não manda header, só query param.
Preservar esse detalhe é o que faz o front funcionar sem mudança de auth."""

from fastapi import HTTPException, Request

from .config import settings


def get_token(request: Request) -> str:
    return request.query_params.get("token", "")


def require_auth(request: Request) -> str:
    token = get_token(request)
    if not settings.auth_token or token != settings.auth_token:
        raise HTTPException(status_code=401, detail={"ok": False, "error": "Unauthorized"})
    return token
