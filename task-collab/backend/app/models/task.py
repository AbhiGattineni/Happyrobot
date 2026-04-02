import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(512), nullable=False)
    status = Column(String(64), nullable=False)
    assigned_to_json = Column(JSONB, nullable=True)
    priority = Column(String(32), nullable=False)
    description = Column(Text, nullable=True)
    tags_json = Column(JSONB, nullable=True)
    custom_fields_json = Column(JSONB, nullable=True)
    version = Column(
        Integer,
        nullable=False,
        server_default=text("1"),
        default=1,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    project = relationship("Project", back_populates="tasks")
