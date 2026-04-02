import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_dependency import TaskDependency


def add_dependency(
    db: Session,
    *,
    task_id: uuid.UUID,
    depends_on_task_id: uuid.UUID,
) -> TaskDependency:
    # Disallow a task depending on itself.
    if task_id == depends_on_task_id:
        raise ValueError("Self dependency is not allowed")

    # Avoid duplicates (DB has a UNIQUE constraint too, but we check first for a cleaner response).
    existing = db.scalar(
        select(TaskDependency).where(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_task_id == depends_on_task_id,
        )
    )
    if existing is not None:
        return existing

    # Ensure both tasks exist to fail early with a clear error.
    task = db.scalar(select(Task).where(Task.id == task_id))
    depends_on_task = db.scalar(select(Task).where(Task.id == depends_on_task_id))
    if task is None or depends_on_task is None:
        raise LookupError("Task not found")

    row = TaskDependency(task_id=task_id, depends_on_task_id=depends_on_task_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_dependencies_for_task(
    db: Session,
    *,
    task_id: uuid.UUID,
) -> list[TaskDependency]:
    stmt = (
        select(TaskDependency)
        .where(TaskDependency.task_id == task_id)
        .order_by(TaskDependency.id.asc())
    )
    return list(db.scalars(stmt).all())

