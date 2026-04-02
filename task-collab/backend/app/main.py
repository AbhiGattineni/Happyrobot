from fastapi import FastAPI

from app.api.router import api_router

app = FastAPI(title="task-collab API")
app.include_router(api_router)
