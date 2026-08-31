"""
Outbound SMS for order-ready alerts.

Degrades gracefully: with no Twilio credentials in backend/.env the message is
logged instead of sent, so the app works in demo mode and starts sending the
moment real keys are pasted in.
"""
import logging
import os
import re

logger = logging.getLogger("sms")

DEFAULT_REGION_CODE = "+1"  # Canada / US


def normalize_phone(raw: str | None) -> str | None:
    """Best-effort E.164 normalisation (Canadian/US numbers)."""
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith("+"):
        digits = re.sub(r"\D", "", cleaned)
        return f"+{digits}" if len(digits) >= 8 else None
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) == 10:
        return f"{DEFAULT_REGION_CODE}{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return None


def sms_configured() -> bool:
    return all(
        os.environ.get(k)
        for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER")
    )


def send_sms(to: str | None, body: str) -> dict:
    """
    Sends an SMS. Never raises — a failed text must not fail the staff's
    "ping guest" action.
    """
    number = normalize_phone(to)
    if not number:
        logger.info("SMS skipped — no usable phone number (%r)", to)
        return {"sent": False, "reason": "no_phone"}

    if not sms_configured():
        logger.info("SMS (DEMO MODE, not sent) -> %s: %s", number, body)
        return {"sent": False, "reason": "not_configured", "to": number, "body": body}

    try:
        from twilio.rest import Client

        client = Client(
            os.environ["TWILIO_ACCOUNT_SID"],
            os.environ["TWILIO_AUTH_TOKEN"],
        )
        msg = client.messages.create(
            to=number,
            from_=os.environ["TWILIO_FROM_NUMBER"],
            body=body,
        )
        logger.info("SMS sent to %s (sid=%s)", number, msg.sid)
        return {"sent": True, "sid": msg.sid, "to": number}
    except Exception as exc:  # noqa: BLE001 - never break the caller
        logger.warning("SMS to %s failed: %s", number, exc)
        return {"sent": False, "reason": "error", "error": str(exc), "to": number}


def ready_message(code: str, name: str, total: float) -> str:
    return (
        f"Central Bar & Grill: {name}, your order {code} is READY! "
        f"Come to the counter to pay & collect (${total:.2f} due)."
    )
