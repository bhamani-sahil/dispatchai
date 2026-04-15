from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.supabase_client import supabase_anon, supabase_service
from app.models.business import BusinessCreate, BusinessPatch, BusinessResponse, ServiceCreate, ServiceResponse

router = APIRouter()
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        user_response = supabase_anon.auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_response.user


async def get_user_business(user_id: str) -> dict:
    result = supabase_service.table("businesses").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No business found for this account")
    return result.data[0]


# --- Business endpoints ---

@router.post("/api/business", response_model=BusinessResponse, status_code=201)
async def create_business(body: BusinessCreate, user=Depends(get_current_user)):
    existing = supabase_service.table("businesses").select("id").eq("user_id", user.id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Business already exists for this account")

    try:
        result = supabase_service.table("businesses").insert({
            "user_id": user.id,
            "name": body.name,
            "agent_type": body.agent_type,
            "phone": body.phone,
            "twilio_phone": body.twilio_phone,
            "emergency_phone": body.emergency_phone,
            "service_area": body.service_area,
            "business_hours": body.business_hours or {},
            "holidays": body.holidays or [],
            "weekend_surcharge": float(body.weekend_surcharge) if body.weekend_surcharge else None,
            "emergency_fee": float(body.emergency_fee) if body.emergency_fee else None,
            "custom_instructions": body.custom_instructions,
            "hours_text": body.hours_text,
            "service_location": body.service_location or "both",
            "etransfer_email": body.etransfer_email,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create business: {str(e)}")

    return result.data[0]


@router.get("/api/business", response_model=BusinessResponse)
async def get_business(user=Depends(get_current_user)):
    return await get_user_business(user.id)


@router.put("/api/business", response_model=BusinessResponse)
async def update_business(body: BusinessPatch, user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    # Only include fields that were explicitly provided
    patch: dict = {}
    if body.name is not None:               patch["name"] = body.name
    if body.agent_name is not None:         patch["agent_name"] = body.agent_name
    if body.agent_type is not None:         patch["agent_type"] = body.agent_type
    if body.phone is not None:              patch["phone"] = body.phone
    if body.twilio_phone is not None:       patch["twilio_phone"] = body.twilio_phone
    if body.emergency_phone is not None:    patch["emergency_phone"] = body.emergency_phone
    if body.service_area is not None:       patch["service_area"] = body.service_area
    if body.business_hours is not None:     patch["business_hours"] = body.business_hours
    if body.holidays is not None:           patch["holidays"] = body.holidays
    if body.weekend_surcharge is not None:  patch["weekend_surcharge"] = float(body.weekend_surcharge)
    if body.emergency_fee is not None:      patch["emergency_fee"] = float(body.emergency_fee)
    if body.hours_text is not None:         patch["hours_text"] = body.hours_text
    if body.service_location is not None:   patch["service_location"] = body.service_location
    if body.etransfer_email is not None:    patch["etransfer_email"] = body.etransfer_email
    # custom_instructions can be set to null explicitly, so always include it when present in body
    if "custom_instructions" in (body.model_fields_set or set()):
        patch["custom_instructions"] = body.custom_instructions

    if not patch:
        return business

    try:
        result = supabase_service.table("businesses").update(patch).eq("id", business["id"]).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update business: {str(e)}")

    return result.data[0]


# --- Service endpoints ---

@router.post("/api/business/services", response_model=ServiceResponse, status_code=201)
async def create_service(body: ServiceCreate, user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    try:
        result = supabase_service.table("services").insert({
            "business_id": business["id"],
            "name": body.name,
            "description": body.description,
            "price_min": float(body.price_min) if body.price_min else None,
            "price_max": float(body.price_max) if body.price_max else None,
            "flat_price": float(body.flat_price) if body.flat_price else None,
            "duration_minutes": body.duration_minutes,
            "is_active": body.is_active,
            "sort_order": body.sort_order,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create service: {str(e)}")

    return result.data[0]


@router.get("/api/business/services", response_model=list[ServiceResponse])
async def get_services(user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    result = supabase_service.table("services").select("*").eq("business_id", business["id"]).eq("is_active", True).order("sort_order").execute()
    return result.data or []


@router.put("/api/business/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, body: ServiceCreate, user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    # Verify service belongs to this business
    existing = supabase_service.table("services").select("id").eq("id", service_id).eq("business_id", business["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Service not found")

    try:
        result = supabase_service.table("services").update({
            "name": body.name,
            "description": body.description,
            "price_min": float(body.price_min) if body.price_min else None,
            "price_max": float(body.price_max) if body.price_max else None,
            "flat_price": float(body.flat_price) if body.flat_price else None,
            "duration_minutes": body.duration_minutes,
            "is_active": body.is_active,
            "sort_order": body.sort_order,
        }).eq("id", service_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update service: {str(e)}")

    return result.data[0]


@router.delete("/api/business/services/{service_id}", status_code=204)
async def delete_service(service_id: str, user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    # Verify service belongs to this business
    existing = supabase_service.table("services").select("id").eq("id", service_id).eq("business_id", business["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Service not found")

    try:
        supabase_service.table("services").update({"is_active": False}).eq("id", service_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete service: {str(e)}")
