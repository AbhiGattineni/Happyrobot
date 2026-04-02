import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.schemas.task_dependency import TaskDependencyCreate, TaskDependencyRead
from app.services import comment_service as comment_svc
from app.services import task_service as task_svc
from app.services import task_dependency_service as task_dep_svc
from app.websocket import task_events as task_ws

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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    merged = payload.model_copy(update={"project_id": project_id})
    created = task_svc.create_task(db, merged)
    pid = str(project_id)
    background_tasks.add_task(task_ws.broadcast_task_created, pid, created)
    return created


@router.patch(
    "/tasks/{task_id}",
    response_model=TaskRead,
)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    changed = set(payload.model_dump(exclude_unset=True).keys())
    updated = task_svc.update_task_by_id(db, task_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    background_tasks.add_task(
        task_ws.broadcast_task_updated,
        str(updated.project_id),
        updated,
        changed,
    )
    return updated


@router.delete(
    "/tasks/{task_id}",
    status_code=204,
)
def delete_task(
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    deleted_project_id = task_svc.delete_task_by_id(db, task_id)
    if deleted_project_id is None:
        raise HTTPException(status_code=404, detail="Task not found")
    background_tasks.add_task(
        task_ws.broadcast_task_deleted,
        str(deleted_project_id),
        str(task_id),
    )


@router.post(
    "/tasks/{task_id}/dependencies",
    response_model=TaskDependencyRead,
    status_code=201,
)
def create_task_dependency(
    task_id: uuid.UUID,
    payload: TaskDependencyCreate,
    db: Session = Depends(get_db),
):
    try:
        return task_dep_svc.add_dependency(
            db,
            task_id=task_id,
            depends_on_task_id=payload.depends_on_task_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError:
        raise HTTPException(status_code=404, detail="Task not found")


@router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentRead,
    status_code=201,
)
def create_comment(
    task_id: uuid.UUID,
    payload: CommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    task = task_svc.get_task_by_id(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    merged = payload.model_copy(update={"task_id": task_id})
    created = comment_svc.create_comment(db, merged)
    tid = str(task_id)
    background_tasks.add_task(
        task_ws.broadcast_comment_created,
        str(task.project_id),
        created,
        tid,
    )
    return created
