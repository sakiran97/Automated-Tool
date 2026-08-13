import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.auth import create_default_admin, get_current_user
from app.scheduler import start_scheduler, stop_scheduler, load_all_target_jobs
from app.websocket_manager import ws_manager
from app.routers import auth_router, targets, findings, scans, reports, notifications, dashboard

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Bug Bounty Tracker...")

    # Initialize database
    await init_db()

    # Create default admin user and seed targets from config
    async with AsyncSessionLocal() as db:
        await create_default_admin(db)
        from app.config_loader import seed_targets_from_config
        await seed_targets_from_config(db)

    # Start the background job scheduler
    start_scheduler()
    await load_all_target_jobs()

    logger.info(f"Bug Bounty Tracker v{settings.APP_VERSION} ready!")
    yield

    # Shutdown
    stop_scheduler()
    logger.info("Bug Bounty Tracker shut down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-time automated bug bounty vulnerability tracker",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router.router)
app.include_router(targets.router)
app.include_router(findings.router)
app.include_router(scans.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = str(uuid.uuid4())
    await ws_manager.connect(websocket, client_id)
    logger.info(f"WebSocket connected: {client_id} (total: {ws_manager.connection_count})")
    try:
        while True:
            # Keep connection alive — wait for any message from client (ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"WebSocket disconnected: {client_id}")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "ws_connections": ws_manager.connection_count,
    }


# Mount production frontend build if present
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API and WS routes to pass through
        if full_path.startswith("api/") or full_path.startswith("ws") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = frontend_dist / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
