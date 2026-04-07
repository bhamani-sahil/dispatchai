from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, auth, webhooks, conversations, test_chat, calendar_ui, telnyx_webhook, business, admin_ui, brain, documents, dashboard, app_ui

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
app.include_router(test_chat.router)
app.include_router(calendar_ui.router)
app.include_router(telnyx_webhook.router)
app.include_router(business.router)
app.include_router(admin_ui.router)
app.include_router(brain.router)
app.include_router(documents.router)
app.include_router(dashboard.router)
app.include_router(app_ui.router)
