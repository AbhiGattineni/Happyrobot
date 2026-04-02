import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    # task_id can come from the URL (e.g. POST /tasks/{task_id}/comments).
    task_id: uuid.UUID | None = None
    content: str
    author: str


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    content: str
    author: str
    created_at: datetime


class CommentListPage(BaseModel):
    """Paginated comments for a task."""

    items: list[CommentRead]
    total: int
    limit: int
    offset: int
