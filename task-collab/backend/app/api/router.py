from fastapi import APIRouter

from app.api.routes import comments, health, projects, tasks, ws

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(comments.router)
api_router.include_router(ws.router)
