# task-collab

Full-stack task collaboration app: **Next.js** (App Router) frontend, **FastAPI** API, **PostgreSQL** for persistence, and **WebSockets** for project-scoped realtime updates.

---

## Setup (Docker + minimal local run)

**Docker is used only for PostgreSQL** so you avoid a local Postgres install. The API and Next.js app run on the host with Python and Node (minimal footprint).

### Prerequisites

- **Docker** and **Docker Compose** (for Postgres)
- **Node.js 20+** and **npm** (frontend)
- **Python 3.12+** (backend)

### 1. Start the database

From the **project root** (`task-collab/`):

```bash
docker compose up -d
```

This starts Postgres **16** on port **5432** (`taskcollab` / `taskcollab` / DB `taskcollab`).

### 2. Backend

```bash
cd backend
python -m venv .venv
```

Activate the venv:

- **Windows (cmd):** `.venv\Scripts\activate`
- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source .venv/bin/activate`

```bash
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
```

Optional seed data (from `backend/`):

```bash
python scripts/seed_from_json.py
```

### 3. Frontend

```bash
cd frontend
npm install
```

The browser talks to the API using **`frontend/lib/config.ts`** (`API_BASE_URL`, default `http://localhost:8000`). Adjust that file if your API host or port differs.

### 4. Run

**Terminal 1 — Postgres (if not already up):** `docker compose up -d` (from project root)

**Terminal 2 — API** (run from `backend/`):

```bash
cd backend
# activate .venv first
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 3 — web:**

```bash
cd frontend
npm run dev
```

| URL | Purpose |
| --- | ------- |
| [http://localhost:3000](http://localhost:3000) | Next.js app |
| [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI (Swagger) |
| [http://localhost:8000/health](http://localhost:8000/health) | Health check |

### Migrations

After model changes (from `backend/`):

```bash
alembic revision --autogenerate -m "short_description"
alembic upgrade head
```

### Reset DB + reseed (quick reference)

In `psql` against `taskcollab`: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` and re-grant to `taskcollab`, then `alembic upgrade head`, then `python scripts/seed_from_json.py`.

---

## Architecture decisions

- **Split frontend / backend**: Clear API boundary, independent deploys, and OpenAPI as the contract. The UI stays a thin client over HTTP + WS.
- **PostgreSQL as source of truth**: Tasks, comments, and projects are normalized relational data with Alembic migrations for reproducible schema history.
- **REST for CRUD, WebSockets for push**: Reads and writes go through REST (simple caching, pagination, validation). Cross-user updates use a single WS connection per project detail view to avoid polling.
- **In-process WebSocket registry**: A module-level `ConnectionManager` maps clients to **project rooms** in memory. No extra broker for local/demo scope; see scaling notes below.
- **Fire-and-forget broadcast after commit**: Task/comment mutations persist in the DB first; `BackgroundTasks` enqueue WebSocket broadcasts so the HTTP response is not blocked on fan-out.

---

## How we handle sync (realtime)

1. **Authoritative state** lives in Postgres. Every create/update/delete completes via REST and returns (or implies) the persisted row.
2. **Clients** open a WebSocket to `/ws` with a `project_id` query param (or subscribe via a message) to join a **project room**.
3. **Server** publishes JSON envelopes (`TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `COMMENT_CREATED`) to all sockets in that project after successful writes.
4. **UI** applies events to local React state (prepend/update/remove tasks and comments) without refetching the whole project, keeping the implementation simple and snappy for the interview scope.

**Caveat:** This is **best-effort realtime**: if a client misses an event (disconnect, race), the next navigation or pagination fetch still reconciles with the DB.

---

## Data flow and synchronization strategy

```
Browser                    FastAPI                     PostgreSQL
   |                          |                             |
   |-- REST POST/PATCH/DELETE |                             |
   |------------------------>|-- SQL commit -------------->|
   |<-------- 200 + body -----|                             |
   |                          |-- BackgroundTasks -------->|
   |                          |   broadcast_to_project      |
   |<-------- WS JSON --------|   (same process)            |
   |   (other tabs/users)     |                             |
```

- **Write path**: HTTP → service layer → DB commit → background broadcast to room.
- **Read path**: HTTP with pagination (`limit` / `offset`) for tasks and comments; WS does not replace list loading for initial or paged data.
- **Sync strategy**: Optimistic consistency via events; **no CRDT/OT**—last write wins on the server for task fields, as typical for this class of app.

---

## Scaling the system over time

| Area | Today | Next steps |
| --- | --- | --- |
| **WebSocket fan-out** | In-memory rooms in one process | **Redis Pub/Sub** or **NATS** so any API instance can publish; sticky sessions or shared connection store |
| **API throughput** | Single uvicorn process | Multiple workers / **Gunicorn + Uvicorn**, horizontal replicas behind a load balancer |
| **Database** | Single Postgres | Read replicas for heavy reporting; connection pooling (**PgBouncer**); partition large tables if comment volume explodes |
| **Background work** | FastAPI `BackgroundTasks` | **Celery** / **RQ** / cloud queues for email, webhooks, heavy fan-out |
| **Caching** | None | Redis cache for hot project metadata; optional CDN for static assets |

---

## Tradeoffs

- **In-memory WebSocket manager**: Simple and fast to ship; **does not survive multi-instance deploy** or restarts without reconnect churn. Acceptable for demo/single-node.
- **Broadcast payload size**: Task/comment events carry a **minimal snapshot** (not full row history) to keep messages small; clients merge into existing state.
- **No offline / conflict UI**: Conflicts surface as last-winner from the API; no merge UI.
- **Hardcoded API URL in frontend** (`lib/config.ts`): Reduces env friction for reviewers; production would use env-based config or runtime injection.
- **Pagination vs realtime**: New items on page 1 are pushed via WS; other pages rely on counts and navigation—by design to avoid huge client lists.

---

## Technology choices and justifications

| Layer | Choice | Why |
| --- | --- | --- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind | Modern defaults, SSR/SSG option for marketing later, strong typing for API contracts |
| **Backend** | FastAPI, Pydantic, SQLAlchemy 2, Alembic | Fast iteration, automatic OpenAPI, mature ORM + migrations |
| **Database** | PostgreSQL 16 | JSONB for metadata, reliable transactions, good fit for relational tasks/comments |
| **Realtime** | Starlette/FastAPI WebSockets | Same stack as HTTP, no separate Node socket server for this scope |
| **Container** | Docker Compose (Postgres only) | Minimal install for contributors; API/Next stay easy to debug on the host |

---

## Project layout

```
task-collab/
├── docker-compose.yml      # Postgres only
├── backend/                # FastAPI app (app.main:app)
│   ├── alembic/            # Migrations
│   ├── scripts/            # e.g. seed_from_json.py
│   └── seed-data.json      # Optional bulk seed spec
└── frontend/               # Next.js app
    └── lib/
        ├── api/            # REST clients
        ├── websocket/      # WS client helper
        └── config.ts       # API_BASE_URL for browser
```

---

## Ports

| Service | Port |
| ------- | ---- |
| Next.js | 3000 |
| FastAPI | 8000 |
| PostgreSQL | 5432 |
