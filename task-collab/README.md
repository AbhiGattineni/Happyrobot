# task-collab

Full-stack scaffold: Next.js (App Router) frontend, FastAPI backend, PostgreSQL via Docker.

## Prerequisites

- Node.js 20+ and npm
- Python 3.12
- Docker and Docker Compose

## Setup

### PostgreSQL

From the project root:

```bash
docker compose up -d
```

### Backend

```bash
cd backend
python -m venv .venv
```

**Windows (cmd):** `\.venv\Scripts\activate`  
**Windows (PowerShell):** `\.venv\Scripts\Activate.ps1`  
**macOS / Linux:** `source .venv/bin/activate`

```bash
pip install -r requirements.txt
cp .env.example .env
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

## Run

**Terminal 1 — database (if not already running):**

```bash
docker compose up -d
```

**Terminal 2 — API (from project root):**

```bash
cd backend
source .venv/bin/activate   # or Windows activate script above
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 3 — web (from project root):**

```bash
cd frontend
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

## Ports

| Service    | Port |
| ---------- | ---- |
| Next.js    | 3000 |
| FastAPI    | 8000 |
| PostgreSQL | 5432 |
