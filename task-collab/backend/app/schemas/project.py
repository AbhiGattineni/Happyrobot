import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    """Payload for creating a project."""

    name: str = Field(..., max_length=255)
    description: str | None = None
    metadata_json: dict[str, Any] | None = None


class ProjectRead(BaseModel):
    """Project returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    metadata_json: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
