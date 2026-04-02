import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate


def create_task(db: Session, payload: TaskCreate) -> TaskRead:
    row = Task(
        project_id=payload.project_id,
        title=payload.title,
        status=payload.status,
        priority=payload.priority,
        assigned_to_json=payload.assigned_to_json,
        description=payload.description,
        tags_json=payload.tags_json,
        custom_fields_json=payload.custom_fields_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TaskRead.model_validate(row)


def list_tasks_by_project_id(
    db: Session,
    project_id: uuid.UUID,
) -> list[TaskRead]:
    stmt = (
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
    )
    rows = list(db.scalars(stmt).all())
    return [TaskRead.model_validate(r) for r in rows]


def get_task_by_id(db: Session, task_id: uuid.UUID) -> TaskRead | None:
    row = db.scalar(select(Task).where(Task.id == task_id))
    if row is None:
        return None
    return TaskRead.model_validate(row)


def update_task_by_id(
    db: Session,
    task_id: uuid.UUID,
    payload: TaskUpdate,
) -> TaskRead | None:
    row = db.scalar(select(Task).where(Task.id == task_id))
    if row is None:
        return None
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return TaskRead.model_validate(row)


def delete_task_by_id(db: Session, task_id: uuid.UUID) -> bool:
    row = db.scalar(select(Task).where(Task.id == task_id))
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
