export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type TaskRead = {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  assigned_to_json: unknown | null;
  priority: string;
  description: string | null;
  tags_json: unknown | null;
  custom_fields_json: unknown | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type TaskCreateInput = {
  title: string;
  status: TaskStatus;
  priority: string;
  assigned_to_json?: unknown | null;
  description?: string | null;
  tags_json?: unknown | null;
  custom_fields_json?: unknown | null;
};

export type TaskUpdateInput = Partial<{
  title: string;
  status: TaskStatus;
  priority: string;
  assigned_to_json: unknown | null;
  description: string | null;
  tags_json: unknown | null;
  custom_fields_json: unknown | null;
  version: number;
}>;

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL environment variable (required for API calls).",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // FastAPI errors typically look like: {"detail":"..."}.
    let detailMessage: string | null = null;

    try {
      const parsed = JSON.parse(text) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "detail" in parsed &&
        typeof (parsed as { detail: unknown }).detail === "string"
      ) {
        detailMessage = (parsed as { detail: string }).detail;
      }
    } catch {
      // ignore JSON parsing errors; we fall back to the generic message below
    }

    if (detailMessage) {
      if (detailMessage.includes("IN_PROGRESS -> TODO")) {
        throw new Error("You can't move a task from IN PROGRESS back to TODO.");
      }
      throw new Error(detailMessage);
    }

    throw new Error(`API request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}

export async function getTasksByProject(projectId: string) {
  return apiJson<TaskRead[]>(`/projects/${projectId}/tasks`, { method: "GET" });
}

export async function createTask(projectId: string, payload: TaskCreateInput) {
  return apiJson<TaskRead>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(taskId: string, payload: TaskUpdateInput) {
  return apiJson<TaskRead>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(taskId: string) {
  const res = await fetch(`${getApiBaseUrl()}/tasks/${taskId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API request failed (${res.status}): ${text}`);
  }
}

