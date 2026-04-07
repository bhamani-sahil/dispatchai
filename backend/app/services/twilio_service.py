from twilio.rest import Client
from app.config import settings

client = Client(settings.twilio_account_sid, settings.twilio_auth_token)


def send_sms(to: str, body: str) -> str:
    message = client.messages.create(
        from_=settings.twilio_phone_number,
        to=to,
        body=body,
    )
    return message.sid


def validate_webhook(url: str, params: dict, signature: str) -> bool:
    from twilio.request_validator import RequestValidator
    validator = RequestValidator(settings.twilio_auth_token)
    return validator.validate(url, params, signature)
