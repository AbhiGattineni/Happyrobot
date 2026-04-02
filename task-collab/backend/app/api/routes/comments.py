import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.comment import CommentListPage, CommentRead
from app.services import comment_service as comment_svc

router = APIRouter(tags=["comments"])


@router.get(
    "/tasks/{task_id}/comments",
    response_model=CommentListPage,
)
def list_comments(
    task_id: uuid.UUID,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = comment_svc.list_comments_by_task_id(
        db, task_id, limit=limit, offset=offset
    )
    return CommentListPage(items=items, total=total, limit=limit, offset=offset)

