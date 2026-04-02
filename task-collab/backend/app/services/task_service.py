import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_dependency import TaskDependency
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate


def _status_to_str(value: object) -> str:
    enum_value = getattr(value, "value", None)
    if enum_value is not None:
        return str(enum_value)
    return str(value)


def _validate_status_transition(current: str, new: str) -> None:
    allowed: dict[str, set[str]] = {
        "TODO": {"IN_PROGRESS"},
        "IN_PROGRESS": {"BLOCKED", "DONE"},
        "BLOCKED": {"IN_PROGRESS"},
    }

    # Allow no-op updates (e.g. sending the same status again).
    if current == new:
        return

    if new not in allowed.get(current, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task status transition: {current} -> {new}",
        )


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
    updates = payload.model_dump(exclude_unset=True)

    # Validate status transitions only when `status` is being updated.
    if "status" in updates and updates["status"] is not None:
        current_status = _status_to_str(row.status)
        new_status = _status_to_str(updates["status"])
        _validate_status_transition(current_status, new_status)

        # When moving to DONE, ensure all dependencies are already DONE.
        # Dependencies here mean: tasks this task depends on (TaskDependency.task_id == task_id).
        if new_status == "DONE":
            dep_rows = list(
                db.execute(
                    select(TaskDependency.depends_on_task_id, Task.status)
                    .join(
                        Task,
                        Task.id == TaskDependency.depends_on_task_id,
                    )
                    .where(TaskDependency.task_id == task_id)
                )
            )

            not_done = [
                (dep_id, _status_to_str(dep_status))
                for dep_id, dep_status in dep_rows
                if _status_to_str(dep_status) != "DONE"
            ]

            if not_done:
                blocked = next(
                    ((dep_id, dep_status) for dep_id, dep_status in not_done if dep_status == "BLOCKED"),  # noqa: E501
                    None,
                )
                if blocked is not None:
                    dep_id, _dep_status = blocked
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot move task to DONE: dependency {dep_id} is BLOCKED",
                    )

                dep_id, dep_status = not_done[0]
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot move task to DONE: dependency {dep_id} is {dep_status}",
                )

    for key, value in updates.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return TaskRead.model_validate(row)


def delete_task_by_id(db: Session, task_id: uuid.UUID) -> uuid.UUID | None:
    row = db.scalar(select(Task).where(Task.id == task_id))
    if row is None:
        return None
    project_id = row.project_id
    db.delete(row)
    db.commit()
    return project_id
