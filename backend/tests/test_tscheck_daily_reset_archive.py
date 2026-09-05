"""Covers acceptance criteria:
  - Daily auto-reset archives pre-today tickets
  - Open yesterday tickets are cancelled, not left hanging
  - Archived tickets still count in sales history

Fixtures are created via the real API (POST /api/orders), then their created_at/status
are backdated directly in Mongo to simulate "yesterday" tickets. _daily_reset(force=True)
is invoked in-process (as instructed by the briefing) to run the reset logic, and the
live server's own HTTP endpoints are used to assert the observable effects.
"""
import os
import subprocess
import sys
import uuid
from datetime import datetime, timedelta

import pytest
from pymongo import MongoClient
from zoneinfo import ZoneInfo

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _mongo_db():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "app")
    # Load from backend/.env explicitly in case env vars aren't inherited.
    env_path = os.path.join(BACKEND_DIR, ".env")
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip().strip('"')
            if line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip().strip('"')
    return MongoClient(mongo_url)[db_name]


def _app_tz():
    env_path = os.path.join(BACKEND_DIR, ".env")
    tz = "UTC"
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line.startswith("APP_TZ="):
                tz = line.split("=", 1)[1].strip().strip('"')
    return tz


def _run_daily_reset_force():
    """Invoke _daily_reset(force=True) in-process, cwd=/app/backend, per briefing."""
    code = (
        "import asyncio\n"
        "from routers.cron import _daily_reset\n"
        "print(asyncio.run(_daily_reset(force=True)))\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, f"_daily_reset failed: {result.stderr}"
    return result.stdout.strip()


def _create_order(client, name_suffix: str, price: float):
    resp = client.post(
        "/orders",
        json={
            "customer_name": f"tscheck-reset-{name_suffix}",
            "lines": [
                {
                    "item_id": "tscheck-item",
                    "name": "TscheckTestItem",
                    "price": price,
                    "qty": 1,
                    "category": "Food",
                }
            ],
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture(scope="module")
def suffix():
    return uuid.uuid4().hex[:8]


def test_daily_reset_archives_and_cancels_open_ticket_and_report_still_counts(client, suffix):
    mdb = _mongo_db()
    zone = ZoneInfo(_app_tz())
    now_local = datetime.now(zone)
    day_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_local_date = (day_start_local - timedelta(hours=1)).strftime("%Y-%m-%d")
    # A timestamp safely before local midnight today.
    backdated = (day_start_local - timedelta(hours=2)).astimezone(ZoneInfo("UTC"))

    # --- Fixture 1: an OPEN ticket (pay_now) from "yesterday" ---
    open_order = _create_order(client, f"open-{suffix}", 12.34)
    open_id = open_order["id"]

    # --- Fixture 2: a SERVED ticket from "yesterday" (closed, should still count in reports) ---
    served_order = _create_order(client, f"served-{suffix}", 20.00)
    served_id = served_order["id"]

    # Baseline report for yesterday's local date, taken BEFORE backdating the fixtures
    # (both were just created "now", so they do not affect yesterday's numbers yet).
    baseline = client.get("/reports/daily", params={"date": yesterday_local_date})
    assert baseline.status_code == 200, baseline.text
    baseline_json = baseline.json()

    # Backdate both fixtures to before local midnight, and put the served one straight
    # into a closed status so the reset only needs to archive it, not cancel it.
    mdb.orders.update_one(
        {"id": open_id},
        {"$set": {"created_at": backdated.replace(tzinfo=None), "status": "pay_now"}},
    )
    mdb.orders.update_one(
        {"id": served_id},
        {"$set": {"created_at": backdated.replace(tzinfo=None), "status": "served"}},
    )

    # --- Run the reset ---
    out = _run_daily_reset_force()
    assert "'ran': True" in out or "ran': True" in out, out

    # --- Criterion 1 + 2: open ticket cancelled + archived, dropped off live board ---
    open_doc = mdb.orders.find_one({"id": open_id})
    assert open_doc is not None
    assert open_doc["status"] == "cancelled", f"expected cancelled, got {open_doc['status']}"
    assert open_doc.get("archived") is True

    live = client.get("/orders")
    assert live.status_code == 200
    live_ids = {o["id"] for o in live.json()}
    assert open_id not in live_ids, "archived ticket should no longer appear on the live board"

    # --- Criterion 3: archived (served) ticket still counted in sales history ---
    served_doc = mdb.orders.find_one({"id": served_id})
    assert served_doc is not None
    assert served_doc.get("archived") is True
    assert served_doc["status"] == "served"  # served tickets are not force-cancelled by reset

    after = client.get("/reports/daily", params={"date": yesterday_local_date})
    assert after.status_code == 200, after.text
    after_json = after.json()

    assert after_json["order_count"] >= baseline_json["order_count"] + 1, (
        f"expected order_count to include the archived served ticket: "
        f"baseline={baseline_json['order_count']} after={after_json['order_count']}"
    )
    assert after_json["revenue"] >= baseline_json["revenue"] + served_order["total"] - 0.001, (
        f"expected revenue to include the archived served ticket's total: "
        f"baseline={baseline_json['revenue']} after={after_json['revenue']} "
        f"expected_add={served_order['total']}"
    )
