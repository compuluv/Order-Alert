import os

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PinAttempt(BaseModel):
    pin: str


class PinResult(BaseModel):
    ok: bool


@router.post("/staff/verify-pin", response_model=PinResult)
async def verify_pin(payload: PinAttempt):
    expected = os.environ.get("STAFF_PIN", "2006")
    return PinResult(ok=payload.pin.strip() == expected)
