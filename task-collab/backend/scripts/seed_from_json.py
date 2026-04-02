"""
Load backend/seed-data.json into PostgreSQL.

Run from the backend directory (so .env is found):

    python scripts/seed_from_json.py

Optional:

    python scripts/seed_from_json.py --file path/to/custom.json

Requires: migrations applied (`alembic upgrade head`) and DATABASE_URL set (or default in config).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Repo root: backend/
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal  # noqa: E402
from app.models.comment import Comment  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.task import Task  # noqa: E402

DEFAULT_JSON = BACKEND_ROOT / "seed-data.json"
COMMIT_EVERY_TASKS = 100


def expand_template(tpl: str | None, n: int) -> str | None:
    if tpl is None:
        return None
    return tpl.replace("{n}", str(n))


def load_spec(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def seed(path: Path) -> None:
    spec = load_spec(path)
    projects = spec.get("projects")
    if not isinstance(projects, list):
        raise SystemExit("seed-data.json: missing or invalid 'projects' array")

    db = SessionLocal()
    try:
        for p in projects:
            if not isinstance(p, dict):
                continue
            name = p.get("name")
            if not isinstance(name, str) or not name.strip():
                continue

            tasks_spec = p.get("tasks") or {}
            comments_spec = p.get("comments") or {}
            count = int(tasks_spec.get("count") or 0)
            count_per_task = int(comments_spec.get("countPerTask") or 0)
            title_tpl = tasks_spec.get("titleTemplate") or "Task {n}"
            desc_tpl = tasks_spec.get("descriptionTemplate")
            status_pattern = tasks_spec.get("statusPattern") or ["TODO"]
            priority_pattern = tasks_spec.get("priorityPattern") or ["P2"]
            if not isinstance(status_pattern, list) or not status_pattern:
                status_pattern = ["TODO"]
            if not isinstance(priority_pattern, list) or not priority_pattern:
                priority_pattern = ["P2"]
            content_tpl = comments_spec.get("contentTemplate") or "Comment {n}"
            author = (
                comments_spec.get("author")
                if isinstance(comments_spec.get("author"), str)
                else "Seed"
            )

            project = Project(
                name=name.strip(),
                description=p.get("description")
                if isinstance(p.get("description"), str)
                else None,
                metadata_json=p.get("metadata_json"),
            )
            db.add(project)
            db.flush()
            pid = project.id

            for n in range(1, count + 1):
                status = str(status_pattern[(n - 1) % len(status_pattern)])
                priority = str(priority_pattern[(n - 1) % len(priority_pattern)])
                task = Task(
                    project_id=pid,
                    title=expand_template(title_tpl, n) or f"Task {n}",
                    status=status,
                    priority=priority,
                    description=expand_template(desc_tpl, n)
                    if desc_tpl is not None
                    else None,
                    assigned_to_json=tasks_spec.get("assigned_to_json"),
                    tags_json=tasks_spec.get("tags_json"),
                    custom_fields_json=tasks_spec.get("custom_fields_json"),
                )
                db.add(task)
                db.flush()

                for _ in range(count_per_task):
                    db.add(
                        Comment(
                            task_id=task.id,
                            content=expand_template(content_tpl, n) or "",
                            author=author,
                        )
                    )

                if n % COMMIT_EVERY_TASKS == 0:
                    db.commit()

            db.commit()
            print(f"Seeded project {name!r}: {count} tasks, ~{count * count_per_task} comments")

        print("Done.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Load seed-data.json into the database.")
    parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_JSON,
        help=f"Path to JSON seed spec (default: {DEFAULT_JSON})",
    )
    args = parser.parse_args()
    path = args.file.resolve()
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")
    seed(path)


if __name__ == "__main__":
    main()
