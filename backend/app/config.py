from pydantic_settings import BaseSettings
from pydantic import field_validator
import json


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    fastapi_host: str = "0.0.0.0"
    fastapi_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:19006"]
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    gemini_api_key: str

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
