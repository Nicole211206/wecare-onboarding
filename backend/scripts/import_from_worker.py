"""Migração única: busca o wc_state real do Cloudflare Worker (GET /load) e
envia pro /save do backend novo — passa pela mesma lógica de merge/fotos-pro-
disco que qualquer sync normal do app.js usaria.

Uso:
    uv run python scripts/import_from_worker.py \\
        --worker-url https://wecare-onboarding.nicole-0e7.workers.dev \\
        --worker-token wecare_sync_7k2p9m \\
        --backend-url http://127.0.0.1:18791 \\
        --backend-token wecare_sync_7k2p9m

Não é idempotente por natureza: como o /save do backend faz merge contra o
estado atual (proteção anti-sobrescrita), rodar de novo é seguro — só não
vai "desfazer" dados legítimos criados no backend novo depois da 1ª importação.
Pra migração inicial (backend novo ainda vazio), current={} e o merge não
tem efeito prático — o body do Worker entra como está.
"""

from __future__ import annotations

import argparse
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--worker-url", default="https://wecare-onboarding.nicole-0e7.workers.dev")
    parser.add_argument("--worker-token", required=True)
    parser.add_argument("--backend-url", default="http://127.0.0.1:18791")
    parser.add_argument("--backend-token", required=True)
    parser.add_argument("--dry-run", action="store_true", help="Só busca e resume, não grava no backend novo.")
    args = parser.parse_args()

    print(f"Buscando estado real em {args.worker_url}/load ...")
    with httpx.Client(timeout=60) as client:
        r = client.get(f"{args.worker_url}/load", params={"token": args.worker_token})
        r.raise_for_status()
        payload = r.json()
        if not payload.get("ok"):
            print(f"ERRO: Worker respondeu ok=false: {payload}", file=sys.stderr)
            return 1
        data = payload["data"]

        _resumo("Worker (origem)", data)

        if args.dry_run:
            print("\n--dry-run: nada foi enviado pro backend novo.")
            return 0

        print(f"\nEnviando pro backend novo em {args.backend_url}/save ...")
        save_res = client.post(f"{args.backend_url}/save", params={"token": args.backend_token}, json=data)
        save_res.raise_for_status()
        save_payload = save_res.json()
        if not save_payload.get("ok"):
            print(f"ERRO: backend novo respondeu ok=false: {save_payload}", file=sys.stderr)
            return 1
        print("Import concluído (ok=true).")

        load_res = client.get(f"{args.backend_url}/load", params={"token": args.backend_token})
        load_res.raise_for_status()
        depois = load_res.json()["data"]
        _resumo("Backend novo (destino, pós-import)", depois)

    return 0


def _resumo(titulo: str, data: dict) -> None:
    imoveis = data.get("wc_imoveis") or []
    total_fotos = sum(len(im.get("fotos") or []) for im in imoveis)
    import json

    tamanho_kb = len(json.dumps(data)) / 1024
    print(f"\n=== {titulo} ===")
    print(f"  wc_imoveis:      {len(imoveis)}")
    print(f"  wc_users:        {len(data.get('wc_users') or [])}")
    print(f"  wc_prestadores:  {len(data.get('wc_prestadores') or [])}")
    print(f"  wc_itens:        {len(data.get('wc_itens') or [])}")
    print(f"  fotos (total):   {total_fotos}")
    print(f"  tamanho do JSON: {tamanho_kb:.1f} KB")


if __name__ == "__main__":
    raise SystemExit(main())
