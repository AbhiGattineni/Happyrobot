from fastapi import FastAPI

app = FastAPI(title="task-collab API")


@app.get("/health")
def health():
    return {"status": "ok"}
