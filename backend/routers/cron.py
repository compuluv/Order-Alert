"""Platform cron endpoints. Must ack 2xx immediately and background the work."""
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from lib.db import db

router = APIRouter()
logger = logging.getLogger("cron")

# Idempotency: remember run ids we've already accepted.
_seen_runs: set[str] = set()


def _authorized(auth: str | None) -> bool:
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    if not secret or not auth or not auth.startswith("Bearer "):
        return False
    return hmac.compare_digest(auth.removeprefix("Bearer ").strip(), secret)


async def _cancel_stale_unpaid() -> int:
    """Cancel orders that were pinged to pay but never paid."""
    minutes = int(os.environ.get("AUTO_CANCEL_MINUTES", "15"))
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    result = await db.orders.update_many(
        {"status": "pay_now", "updated_at": {"$lt": cutoff}},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}},
    )
    logger.info("auto-cancel: cancelled %s unpaid order(s) older than %sm", result.modified_count, minutes)
    return result.modified_count


@router.post("/cron/auto-cancel-unpaid")
async def auto_cancel_unpaid(
    request: Request,
    background: BackgroundTasks,
    authorization: str | None = Header(default=None),
    x_webhook_id: str | None = Header(default=None),
):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    if not _authorized(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        envelope = await request.json()
    except Exception:
        envelope = {}
    if envelope is not None and not isinstance(envelope, dict):
        raise HTTPException(status_code=400, detail="Invalid request body")

    run_id = x_webhook_id or (envelope or {}).get("run_id")
    if run_id and run_id in _seen_runs:
        return {"accepted": True, "duplicate": True}
    if run_id:
        _seen_runs.add(run_id)

    background.add_task(_cancel_stale_unpaid)
    return {"accepted": True}
