import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentRead


def create_comment(db: Session, payload: CommentCreate) -> CommentRead:
    row = Comment(
        task_id=payload.task_id,
        content=payload.content,
        author=payload.author,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return CommentRead.model_validate(row)


def list_comments_by_task_id(
    db: Session,
    task_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> tuple[list[CommentRead], int]:
    count_stmt = select(func.count()).select_from(Comment).where(
        Comment.task_id == task_id,
    )
    total = int(db.scalar(count_stmt) or 0)
    stmt = (
        select(Comment)
        .where(Comment.task_id == task_id)
        .order_by(Comment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list(db.scalars(stmt).all())
    return [CommentRead.model_validate(r) for r in rows], total

