import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


ORDER_STATUSES = ["received", "pay_now", "preparing", "ready", "served", "cancelled"]


class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float
    category: str
    image_url: Optional[str] = None
    options: List[str] = []
    signature: bool = False
    sold_out: bool = False


class SoldOutUpdate(BaseModel):
    sold_out: bool


class OrderLine(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    option: Optional[str] = None
    category: Optional[str] = None


class OrderCreate(BaseModel):
    customer_name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    lines: List[OrderLine]


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    customer_name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    lines: List[OrderLine]
    total: float
    status: str = "received"
    drinks_done: bool = False
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class StatusUpdate(BaseModel):
    status: str


class WaitEstimate(BaseModel):
    minutes: int
    queue_size: int
    busy_level: str  # quiet | steady | busy | slammed
    message: str


class TopItem(BaseModel):
    name: str
    qty: int
    revenue: float


class HourBucket(BaseModel):
    hour: str
    orders: int
    revenue: float


class DailyReport(BaseModel):
    date: str
    timezone: str
    order_count: int
    revenue: float
    items_sold: int
    average_order: float
    collected_count: int
    outstanding_count: int
    top_items: List[TopItem]
    by_category: List[TopItem]
    by_hour: List[HourBucket]
