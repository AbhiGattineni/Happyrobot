import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services import comment_service as comment_svc
from app.services import task_service as task_svc

router = APIRouter(tags=["tasks"])


@router.get(
    "/projects/{project_id}/tasks",
    response_model=list[TaskRead],
)
def list_tasks(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return task_svc.list_tasks_by_project_id(db, project_id)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskRead,
    status_code=201,
)
def create_task(
    project_id: uuid.UUID,
    payload: TaskCreate,
    db: Session = Depends(get_db),
):
    merged = payload.model_copy(update={"project_id": project_id})
    return task_svc.create_task(db, merged)


@router.patch(
    "/tasks/{task_id}",
    response_model=TaskRead,
)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
):
    updated = task_svc.update_task_by_id(db, task_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.delete(
    "/tasks/{task_id}",
    status_code=204,
)
def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    if not task_svc.delete_task_by_id(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found")


@router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentRead,
    status_code=201,
)
def create_comment(
    task_id: uuid.UUID,
    payload: CommentCreate,
    db: Session = Depends(get_db),
):
    merged = payload.model_copy(update={"task_id": task_id})
    return comment_svc.create_comment(db, merged)
