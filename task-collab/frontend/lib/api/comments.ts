export type CommentRead = {
  id: string;
  task_id: string;
  content: string;
  author: string;
  created_at: string;
};

export type CommentCreateInput = {
  content: string;
  author: string;
};

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
    throw new Error(`API request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as T;
}

export async function getCommentsByTask(taskId: string) {
  return apiJson<CommentRead[]>(`/tasks/${taskId}/comments`, { method: "GET" });
}

export async function createComment(taskId: string, payload: CommentCreateInput) {
  return apiJson<CommentRead>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

