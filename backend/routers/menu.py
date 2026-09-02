from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.dining import MenuItem, SoldOutUpdate

router = APIRouter()

CATEGORY_ORDER = [
    "Appetizers",
    "Entrees",
    "Seafood",
    "Sides",
    "Drinks",
]


@router.get("/menu", response_model=List[MenuItem])
async def list_menu():
    docs = await db.menu_items.find().to_list(500)
    items = [MenuItem(**d) for d in docs]
    items.sort(key=lambda i: (CATEGORY_ORDER.index(i.category) if i.category in CATEGORY_ORDER else 99, i.name))
    return items


@router.patch("/menu/{item_id}/sold-out", response_model=MenuItem)
async def set_sold_out(item_id: str, payload: SoldOutUpdate):
    """Kitchen marks a dish sold out (or back on) — greys it out for guests instantly."""
    doc = await db.menu_items.find_one({"id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await db.menu_items.update_one({"id": item_id}, {"$set": {"sold_out": payload.sold_out}})
    updated = await db.menu_items.find_one({"id": item_id})
    return MenuItem(**(updated or {}))


@router.get("/menu/categories", response_model=List[str])
async def list_categories():
    docs = await db.menu_items.find().to_list(500)
    found = {d["category"] for d in docs}
    return [c for c in CATEGORY_ORDER if c in found]
