import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead


def create_project(db: Session, payload: ProjectCreate) -> ProjectRead:
    row = Project(
        name=payload.name,
        description=payload.description,
        metadata_json=payload.metadata_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ProjectRead.model_validate(row)


def list_projects(db: Session) -> list[ProjectRead]:
    stmt = select(Project).order_by(Project.created_at.desc())
    rows = list(db.scalars(stmt).all())
    return [ProjectRead.model_validate(r) for r in rows]


def get_project_by_id(db: Session, project_id: uuid.UUID) -> ProjectRead | None:
    row = db.scalar(select(Project).where(Project.id == project_id))
    if row is None:
        return None
    return ProjectRead.model_validate(row)
