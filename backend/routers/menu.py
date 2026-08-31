from typing import List

from fastapi import APIRouter

from lib.db import db
from models.dining import MenuItem

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


@router.get("/menu/categories", response_model=List[str])
async def list_categories():
    docs = await db.menu_items.find().to_list(500)
    found = {d["category"] for d in docs}
    return [c for c in CATEGORY_ORDER if c in found]
