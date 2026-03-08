from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import ALLOWED_ORIGINS
from .database import Base, SessionLocal, engine
from .routers import auth, card_templates, usage, user_cards, users
from .seed import seed_data

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title="CCBenefits", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(card_templates.router)
app.include_router(user_cards.router)
app.include_router(usage.router)
app.include_router(users.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# Serve frontend static files if built
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    # Serve index.html for SPA routes
    # Note: Using explicit routes instead of catch-all /{path:path} because
    # FastAPI's catch-all conflicts with API route matching, causing 404s on /api/* paths.
    @app.get("/")
    @app.get("/credits")
    @app.get("/add-card")
    @app.get("/card/{card_id:path}")
    @app.get("/login")
    @app.get("/register")
    @app.get("/profile")
    async def serve_frontend(card_id: str = ""):
        return FileResponse(FRONTEND_DIR / "index.html")
