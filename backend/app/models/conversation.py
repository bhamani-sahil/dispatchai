from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MessageResponse(BaseModel):
    id: str
    sender_type: str
    direction: str = 'inbound'   # derived in route: customer=inbound, ai_agent/business_owner=outbound
    body: str
    ai_confidence: Optional[float] = None
    created_at: datetime


class ConversationResponse(BaseModel):
    id: str
    customer_phone: str
    customer_name: Optional[str] = None
    status: str
    last_message_at: datetime
    created_at: datetime
    last_message: Optional[str] = None
    ai_confidence: Optional[float] = None
