from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, appointments, auth, bot, catalog, dashboard, profile
from app.core.config import settings

app = FastAPI(title="Beauty Salon API")

# In production nginx serves the frontend same-origin; FRONTEND_URL covers
# local dev where Next.js runs on a different port.
_origins = [o for o in {settings.FRONTEND_URL, "http://localhost:3000"} if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(bot.router)
app.include_router(appointments.router)
app.include_router(profile.router)
app.include_router(dashboard.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
