import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


ORDER_STATUSES = ["received", "preparing", "ready", "served"]


class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float
    category: str
    image_url: Optional[str] = None
    options: List[str] = []
    signature: bool = False


class OrderLine(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    option: Optional[str] = None


class OrderCreate(BaseModel):
    order_type: str = "dine_in"  # dine_in | takeout
    table_number: Optional[int] = None
    customer_name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    lines: List[OrderLine]


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    order_type: str = "dine_in"
    table_number: Optional[int] = None
    customer_name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    lines: List[OrderLine]
    total: float
    status: str = "received"
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class StatusUpdate(BaseModel):
    status: str
