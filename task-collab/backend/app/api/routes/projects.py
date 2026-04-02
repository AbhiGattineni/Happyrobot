from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectRead
from app.services import project_service as project_svc

router = APIRouter(tags=["projects"])


@router.get(
    "/projects",
    response_model=list[ProjectRead],
)
def list_projects(db: Session = Depends(get_db)):
    return project_svc.list_projects(db)


@router.post(
    "/projects",
    response_model=ProjectRead,
    status_code=201,
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
):
    return project_svc.create_project(db, payload)
