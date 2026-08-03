"""Porte 1:1 dos helpers de Google Drive do worker.js (OAuth refresh_token +
listagem recursiva de pasta, inclusive Shared Drives). Usado só por
/analisar-drive e /drive-debug."""

from __future__ import annotations

import base64
import re

import httpx

from .config import settings

FOLDER_RE = re.compile(r"/folders/([a-zA-Z0-9_-]+)")


def extract_folder_id(drive_url: str | None) -> str | None:
    m = FOLDER_RE.search(drive_url or "")
    return m.group(1) if m else None


async def get_google_access_token(client: httpx.AsyncClient) -> str:
    res = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": settings.google_refresh_token,
            "grant_type": "refresh_token",
        },
    )
    data = res.json()
    if not data.get("access_token"):
        raise RuntimeError(f"Google OAuth error: {data}")
    return data["access_token"]


async def _find_shared_drive_id(client: httpx.AsyncClient, folder_id: str, token: str) -> str | None:
    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get(
        f"https://www.googleapis.com/drive/v3/files/{folder_id}",
        params={"fields": "id,name,driveId", "supportsAllDrives": "true"},
        headers=headers,
    )
    data = res.json()
    if "error" not in data:
        return data.get("driveId")
    if data.get("error", {}).get("code") == 404:
        drive_res = await client.get(f"https://www.googleapis.com/drive/v3/drives/{folder_id}", headers=headers)
        drive_data = drive_res.json()
        if "error" not in drive_data:
            return folder_id
    return None


async def list_drive_folder(client: httpx.AsyncClient, folder_id: str, token: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {token}"}
    shared_drive_id = await _find_shared_drive_id(client, folder_id, token)
    extra_params = (
        {"supportsAllDrives": "true", "includeItemsFromAllDrives": "true", "corpora": "drive", "driveId": shared_drive_id}
        if shared_drive_id
        else {"supportsAllDrives": "true", "includeItemsFromAllDrives": "true"}
    )

    async def list_level(fid: str) -> list[dict]:
        res = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            params={
                "q": f"'{fid}' in parents and trashed=false",
                "fields": "files(id,name,mimeType,size)",
                "pageSize": 100,
                **extra_params,
            },
            headers=headers,
        )
        data = res.json()
        if "error" in data:
            raise RuntimeError(f"Drive API: {data['error']}")
        return data.get("files") or []

    level1 = await list_level(folder_id)
    all_files = list(level1)

    folders1 = [f for f in level1 if f.get("mimeType") == "application/vnd.google-apps.folder"]
    for f1 in folders1[:10]:
        try:
            level2 = await list_level(f1["id"])
            all_files.extend(level2)
            folders2 = [f for f in level2 if f.get("mimeType") == "application/vnd.google-apps.folder"]
            for f2 in folders2[:10]:
                try:
                    all_files.extend(await list_level(f2["id"]))
                except Exception:
                    pass
        except Exception:
            pass

    return all_files


async def export_google_doc(client: httpx.AsyncClient, file_id: str, token: str) -> str:
    res = await client.get(
        f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
        params={"mimeType": "text/plain"},
        headers={"Authorization": f"Bearer {token}"},
    )
    if res.status_code != 200:
        return ""
    return res.text


async def download_file_base64(client: httpx.AsyncClient, file_id: str, mime_type: str, token: str) -> dict | None:
    res = await client.get(
        f"https://www.googleapis.com/drive/v3/files/{file_id}",
        params={"alt": "media"},
        headers={"Authorization": f"Bearer {token}"},
    )
    if res.status_code != 200:
        return None
    return {"base64": base64.b64encode(res.content).decode(), "mimeType": mime_type}
