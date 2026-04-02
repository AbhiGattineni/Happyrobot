import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.comment import CommentRead
from app.services import comment_service as comment_svc

router = APIRouter(tags=["comments"])


@router.get(
    "/tasks/{task_id}/comments",
    response_model=list[CommentRead],
)
def list_comments(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return comment_svc.list_comments_by_task_id(db, task_id)

