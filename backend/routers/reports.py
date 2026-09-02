"""Live wait estimates and the end-of-night sales report."""
import math
import os
from collections import defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from lib.dates import today_iso
from models.dining import DailyReport, HourBucket, TopItem, WaitEstimate

router = APIRouter()

# Kitchen throughput assumptions, tuned for a busy bar & grill.
BASE_MINUTES = 9  # a single order with an empty kitchen
MINUTES_PER_ORDER = 3  # each ticket already in the queue
PARALLEL_TICKETS = 2  # roughly how many the line works at once
MAX_MINUTES = 45


def _tz() -> str:
    return os.environ.get("APP_TZ", "UTC")


def _day_bounds(day: str) -> tuple[datetime, datetime]:
    """UTC bounds for a local calendar day (Mongo stores tz-aware UTC)."""
    zone = ZoneInfo(_tz())
    try:
        start_local = datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=zone)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD") from exc
    return start_local, start_local + timedelta(days=1)


@router.get("/wait-estimate", response_model=WaitEstimate)
async def wait_estimate():
    """How long a NEW order would take, based on what's already in the kitchen."""
    queue = await db.orders.count_documents(
        {"status": {"$in": ["received", "pay_now", "preparing"]}}
    )
    minutes = BASE_MINUTES + MINUTES_PER_ORDER * math.ceil(queue / PARALLEL_TICKETS)
    minutes = min(minutes, MAX_MINUTES)
    # Round to the nearest 5 so it reads like a human estimate.
    minutes = max(5, int(round(minutes / 5.0) * 5))

    if queue == 0:
        level, msg = "quiet", "Kitchen's clear — you'll be eating soon"
    elif queue <= 3:
        level, msg = "steady", "Kitchen's moving nicely"
    elif queue <= 8:
        level, msg = "busy", "It's busy right now — worth the wait"
    else:
        level, msg = "slammed", "We're slammed — thanks for your patience"

    return WaitEstimate(minutes=minutes, queue_size=queue, busy_level=level, message=msg)


@router.get("/reports/daily", response_model=DailyReport)
async def daily_report(date: str | None = Query(default=None)):
    """End-of-night numbers for a local calendar day (defaults to today)."""
    day = date or today_iso()
    start, end = _day_bounds(day)
    docs = await db.orders.find(
        {"created_at": {"$gte": start, "$lt": end}, "status": {"$ne": "cancelled"}}
    ).to_list(5000)

    revenue = 0.0
    items_sold = 0
    collected = 0
    item_qty: dict[str, int] = defaultdict(int)
    item_rev: dict[str, float] = defaultdict(float)
    hour_orders: dict[int, int] = defaultdict(int)
    hour_rev: dict[int, float] = defaultdict(float)

    # Map item name -> category for the category breakdown.
    menu_docs = await db.menu_items.find({}, {"name": 1, "category": 1}).to_list(1000)
    category_of = {m["name"]: m.get("category", "Other") for m in menu_docs}
    cat_qty: dict[str, int] = defaultdict(int)
    cat_rev: dict[str, float] = defaultdict(float)

    zone = ZoneInfo(_tz())
    for d in docs:
        total = float(d.get("total", 0.0))
        revenue += total
        if d.get("status") == "served":
            collected += 1

        created = d.get("created_at")
        if isinstance(created, datetime):
            if created.tzinfo is None:
                created = created.replace(tzinfo=ZoneInfo("UTC"))
            hour = created.astimezone(zone).hour
            hour_orders[hour] += 1
            hour_rev[hour] += total

        for line in d.get("lines", []):
            qty = int(line.get("qty", 0))
            line_rev = float(line.get("price", 0.0)) * qty
            name = line.get("name", "Unknown")
            items_sold += qty
            item_qty[name] += qty
            item_rev[name] += line_rev
            cat = category_of.get(name, "Other")
            cat_qty[cat] += qty
            cat_rev[cat] += line_rev

    top_items = [
        TopItem(name=n, qty=q, revenue=round(item_rev[n], 2))
        for n, q in sorted(item_qty.items(), key=lambda kv: (-kv[1], kv[0]))[:8]
    ]
    by_category = [
        TopItem(name=c, qty=q, revenue=round(cat_rev[c], 2))
        for c, q in sorted(cat_qty.items(), key=lambda kv: -kv[1])
    ]
    by_hour = [
        HourBucket(
            hour=f"{h:02d}:00",
            orders=hour_orders[h],
            revenue=round(hour_rev[h], 2),
        )
        for h in sorted(hour_orders)
    ]

    count = len(docs)
    return DailyReport(
        date=day,
        timezone=_tz(),
        order_count=count,
        revenue=round(revenue, 2),
        items_sold=items_sold,
        average_order=round(revenue / count, 2) if count else 0.0,
        collected_count=collected,
        outstanding_count=count - collected,
        top_items=top_items,
        by_category=by_category,
        by_hour=by_hour,
    )
