"""Covers acceptance criterion: Cron endpoint auth.

POST /api/cron/daily-reset without Authorization -> 401.
With 'Authorization: Bearer <WEBHOOK_CRON_SECRET>' -> 200 {"accepted": true}.
"""
import os


def _cron_secret():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    secret = ""
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line.startswith("WEBHOOK_CRON_SECRET="):
                secret = line.split("=", 1)[1].strip().strip('"')
    return secret


def test_cron_daily_reset_requires_auth(client):
    resp = client.post("/cron/daily-reset")
    assert resp.status_code == 401, resp.text


def test_cron_daily_reset_accepts_valid_secret(client):
    secret = _cron_secret()
    assert secret, "WEBHOOK_CRON_SECRET missing from backend/.env"
    resp = client.post(
        "/cron/daily-reset",
        headers={"Authorization": f"Bearer {secret}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("accepted") is True, body
