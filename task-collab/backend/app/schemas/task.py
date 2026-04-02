import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.task_status import TaskStatus


class TaskCreate(BaseModel):
    """Payload for creating a task."""

    # Optional when provided via URL (e.g. POST /projects/{project_id}/tasks).
    project_id: uuid.UUID | None = None
    title: str = Field(..., max_length=512)
    status: TaskStatus
    priority: str = Field(..., max_length=32)
    assigned_to_json: Any | None = None
    description: str | None = None
    tags_json: Any | None = None
    custom_fields_json: Any | None = None


class TaskUpdate(BaseModel):
    """Payload for partial task updates."""

    project_id: uuid.UUID | None = None
    title: str | None = Field(None, max_length=512)
    status: TaskStatus | None = None
    priority: str | None = Field(None, max_length=32)
    assigned_to_json: Any | None = None
    description: str | None = None
    tags_json: Any | None = None
    custom_fields_json: Any | None = None
    version: int | None = None


class TaskRead(BaseModel):
    """Task returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    status: TaskStatus
    assigned_to_json: Any | None
    priority: str
    description: str | None
    tags_json: Any | None
    custom_fields_json: Any | None
    version: int
    created_at: datetime
    updated_at: datetime


class TaskListPage(BaseModel):
    """Paginated task list for a project."""

    items: list[TaskRead]
    total: int
    limit: int
    offset: int
