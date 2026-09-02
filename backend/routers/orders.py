import io
import random
from datetime import datetime, timezone
from typing import List

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import Response

from lib.db import db
from lib.sms import pay_message, ready_message, send_sms, sms_configured
from models.dining import ORDER_STATUSES, Order, OrderCreate, StatusUpdate

router = APIRouter()


def _aware(o: dict) -> dict:
    for key in ("created_at", "updated_at"):
        dt = o.get(key)
        if isinstance(dt, datetime) and dt.tzinfo is None:
            o[key] = dt.replace(tzinfo=timezone.utc)
    return o


async def _new_code() -> str:
    for _ in range(50):
        code = f"CB-{random.randint(1000, 9999)}"
        if not await db.orders.find_one({"code": code}):
            return code
    return f"CB-{random.randint(10000, 99999)}"


@router.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate):
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    if not payload.customer_name.strip():
        raise HTTPException(status_code=400, detail="A name is required so we can call the order")
    total = round(sum(line.price * line.qty for line in payload.lines), 2)
    order = Order(code=await _new_code(), total=total, **payload.model_dump())
    await db.orders.insert_one(order.model_dump())
    return order


@router.get("/orders", response_model=List[Order])
async def list_orders():
    docs = await db.orders.find({}).sort("created_at", -1).to_list(300)
    return [Order(**_aware(d)) for d in docs]


@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    doc = await db.orders.find_one({"$or": [{"id": order_id}, {"code": order_id.upper()}]})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**_aware(doc))


@router.patch("/orders/{order_id}/status", response_model=Order)
async def update_status(order_id: str, payload: StatusUpdate, background: BackgroundTasks):
    if payload.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {ORDER_STATUSES}")
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": payload.status, "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.orders.find_one({"id": order_id})
    order = Order(**_aware(doc or {}))

    # Text the guest when we need payment, and again when it's ready to collect.
    if payload.status == "pay_now":
        background.add_task(
            send_sms,
            order.phone,
            pay_message(order.code, order.customer_name, order.total),
        )
    elif payload.status == "ready":
        background.add_task(
            send_sms,
            order.phone,
            ready_message(order.code, order.customer_name, order.total),
        )
    return order


@router.get("/sms/status")
async def sms_status():
    """Lets the UI show whether real texts are going out or demo-mode logging."""
    return {"configured": sms_configured()}


@router.get("/qr")
async def qr_svg(data: str = Query(..., min_length=1, max_length=400)):
    img = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, box_size=12, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return Response(content=buf.getvalue(), media_type="image/svg+xml")
