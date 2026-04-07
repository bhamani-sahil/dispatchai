from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.auth import SignupRequest, LoginRequest, AuthResponse, UserResponse
from app.utils.supabase_client import supabase_anon, supabase_service

router = APIRouter()
security = HTTPBearer()


@router.post("/api/auth/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest):
    try:
        auth_response = supabase_anon.auth.sign_up({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Signup failed")

    user_id = auth_response.user.id

    try:
        supabase_service.table("users").insert({
            "id": user_id,
            "email": body.email,
            "name": body.name,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user record: {str(e)}")

    result = supabase_service.table("users").select("*").eq("id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to fetch user record")
    user_record = result.data[0]

    access_token = auth_response.session.access_token if auth_response.session else ""

    return AuthResponse(
        user=UserResponse(
            id=user_record["id"],
            email=user_record["email"],
            name=user_record["name"],
            created_at=user_record["created_at"],
        ),
        access_token=access_token,
    )


@router.post("/api/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    try:
        auth_response = supabase_anon.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {str(e)}")

    if not auth_response.user or not auth_response.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = auth_response.user.id

    # Upsert user row — self-heals if the row was deleted after auth user still exists
    try:
        supabase_service.table("users").upsert({
            "id": user_id,
            "email": auth_response.user.email,
            "name": auth_response.user.email.split("@")[0],
        }, on_conflict="id").execute()
    except Exception:
        pass  # best-effort; row may already exist

    result = supabase_service.table("users").select("*").eq("id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to fetch user record")
    user_record = result.data[0]

    return AuthResponse(
        user=UserResponse(
            id=user_record["id"],
            email=user_record["email"],
            name=user_record["name"],
            created_at=user_record["created_at"],
        ),
        access_token=auth_response.session.access_token,
    )


@router.get("/api/auth/me", response_model=UserResponse)
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        user_response = supabase_anon.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = user_response.user.id

    result = supabase_service.table("users").select("*").eq("id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User record not found")
    user_record = result.data[0]

    return UserResponse(
        id=user_record["id"],
        email=user_record["email"],
        name=user_record["name"],
        created_at=user_record["created_at"],
    )
