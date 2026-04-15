from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional, Any
from enum import Enum


class AgentType(str, Enum):
    plumbing = "plumbing"
    hvac = "hvac"
    auto_detailing = "auto_detailing"
    junk_removal = "junk_removal"
    garage_door_repair = "garage_door_repair"
    pet_grooming = "pet_grooming"
    general_handyman = "general_handyman"
    car_repair = "car_repair"
    door_repair = "door_repair"
    carpet_cleaning = "carpet_cleaning"
    pressure_washing = "pressure_washing"
    landscaping = "landscaping"
    electrical = "electrical"
    locksmith = "locksmith"
    appliance_repair = "appliance_repair"


class BusinessCreate(BaseModel):
    name: str
    agent_type: str   # accepts both business categories (plumbing, hvac) and personalities (concierge, dispatcher, closer)
    phone: Optional[str] = None
    twilio_phone: Optional[str] = None
    emergency_phone: Optional[str] = None
    service_area: Optional[str] = None
    business_hours: Optional[dict[str, Any]] = {}
    holidays: Optional[list[Any]] = []
    weekend_surcharge: Optional[Decimal] = None
    emergency_fee: Optional[Decimal] = None
    custom_instructions: Optional[str] = None
    hours_text: Optional[str] = None   # plain-text hours string from mobile onboarding
    service_location: Optional[str] = "both"  # "onsite" | "mobile" | "both"
    etransfer_email: Optional[str] = None


class BusinessPatch(BaseModel):
    """Partial update — only fields present in the request body are written."""
    name: Optional[str] = None
    agent_name: Optional[str] = None
    agent_type: Optional[str] = None
    phone: Optional[str] = None
    twilio_phone: Optional[str] = None
    emergency_phone: Optional[str] = None
    service_area: Optional[str] = None
    business_hours: Optional[dict[str, Any]] = None
    holidays: Optional[list[Any]] = None
    weekend_surcharge: Optional[Decimal] = None
    emergency_fee: Optional[Decimal] = None
    custom_instructions: Optional[str] = None
    hours_text: Optional[str] = None
    service_location: Optional[str] = None  # "onsite" | "mobile" | "both"
    etransfer_email: Optional[str] = None


class BusinessResponse(BaseModel):
    id: str
    user_id: str
    name: str
    agent_type: str
    phone: Optional[str] = None
    twilio_phone: Optional[str] = None
    emergency_phone: Optional[str] = None
    service_area: Optional[str] = None
    business_hours: dict[str, Any] = {}
    holidays: list[Any] = []
    weekend_surcharge: Optional[Decimal] = None
    emergency_fee: Optional[Decimal] = None
    custom_instructions: Optional[str] = None
    hours_text: Optional[str] = None
    logo_url: Optional[str] = None
    agent_active: bool = True
    service_location: Optional[str] = "both"
    etransfer_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    flat_price: Optional[Decimal] = None
    duration_minutes: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0


class ServiceResponse(BaseModel):
    id: str
    business_id: str
    name: str
    description: Optional[str] = None
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    flat_price: Optional[Decimal] = None
    duration_minutes: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime
