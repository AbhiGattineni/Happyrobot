"""Minimal WebSocket task events (project-scoped)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.schemas.comment import CommentRead
from app.schemas.task import TaskRead
from app.websocket.connection_manager import manager


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _status_str(task: TaskRead) -> str:
    st = task.status
    return st.value if hasattr(st, "value") else str(st)


def _minimal_snapshot(task: TaskRead) -> dict[str, Any]:
    return {
        "title": task.title,
        "status": _status_str(task),
        "priority": task.priority,
    }


def _envelope(
    event_type: str,
    project_id: str,
    entity_id: str,
    payload: dict[str, Any],
) -> str:
    return json.dumps(
        {
            "type": event_type,
            "project_id": project_id,
            "entity_id": entity_id,
            "payload": payload,
            "timestamp": _utc_iso(),
        },
    )


async def broadcast_task_created(project_id: str, task: TaskRead) -> None:
    body = _envelope(
        "TASK_CREATED",
        project_id,
        str(task.id),
        _minimal_snapshot(task),
    )
    await manager.broadcast_to_project(project_id, body)


async def broadcast_task_updated(
    project_id: str,
    task: TaskRead,
    changed_fields: set[str],
) -> None:
    payload: dict[str, Any] = {
        "changed_fields": sorted(changed_fields),
    }
    snap = _minimal_snapshot(task)
    for key in ("title", "status", "priority"):
        if key in changed_fields:
            payload[key] = snap[key]
    body = _envelope("TASK_UPDATED", project_id, str(task.id), payload)
    await manager.broadcast_to_project(project_id, body)


async def broadcast_task_deleted(project_id: str, task_id: str) -> None:
    body = _envelope("TASK_DELETED", project_id, task_id, {})
    await manager.broadcast_to_project(project_id, body)


async def broadcast_comment_created(
    project_id: str,
    comment: CommentRead,
    task_id: str,
) -> None:
    payload = {
        "task_id": task_id,
        "author": comment.author,
        "content": comment.content,
        "created_at": comment.created_at.isoformat(),
    }
    body = _envelope("COMMENT_CREATED", project_id, str(comment.id), payload)
    await manager.broadcast_to_project(project_id, body)
