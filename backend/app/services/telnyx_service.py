import httpx
from app.config import settings


async def send_sms(to: str, body: str) -> str:
    """Send SMS via Telnyx REST API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.telnyx.com/v2/messages",
            headers={
                "Authorization": f"Bearer {settings.telnyx_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.telnyx_phone_number,
                "to": to,
                "text": body,
            },
        )
        data = response.json()
        return data.get("data", {}).get("id", "")
