"""Business-timezone-aware date/time helpers.

Railway runs in UTC. Businesses care about their local calendar day, not UTC.
Use business_today() / business_now() everywhere instead of date.today() / datetime.now().
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

DEFAULT_TZ = "America/Edmonton"


def _zone(tz: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz or DEFAULT_TZ)
    except Exception:
        return ZoneInfo(DEFAULT_TZ)


def business_today(tz: str | None = None) -> date:
    return datetime.now(_zone(tz)).date()


def business_now(tz: str | None = None) -> datetime:
    return datetime.now(_zone(tz))


def business_tz(business: dict | None) -> str:
    if not business:
        return DEFAULT_TZ
    return business.get("timezone") or DEFAULT_TZ
