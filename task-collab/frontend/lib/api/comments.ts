import { apiOrigin } from "@/lib/config";

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

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiOrigin()}${path}`, {
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

export type CommentListPage = {
  items: CommentRead[];
  total: number;
  limit: number;
  offset: number;
};

export async function getCommentsByTask(
  taskId: string,
  params?: { limit?: number; offset?: number },
) {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  const q = sp.toString();
  const path = `/tasks/${taskId}/comments${q ? `?${q}` : ""}`;
  return apiJson<CommentListPage>(path, { method: "GET" });
}

export async function createComment(taskId: string, payload: CommentCreateInput) {
  return apiJson<CommentRead>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

