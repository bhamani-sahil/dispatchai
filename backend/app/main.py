from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, auth, webhooks, conversations, business, brain, documents, dashboard, voice_tools

app = FastAPI(title="DispatchAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(webhooks.router)
app.include_router(conversations.router)
app.include_router(business.router)
app.include_router(brain.router)
app.include_router(documents.router)
app.include_router(dashboard.router)
app.include_router(voice_tools.router)
