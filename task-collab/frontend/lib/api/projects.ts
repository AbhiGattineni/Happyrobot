import { apiOrigin } from "@/lib/config";

export type ProjectRead = {
  id: string;
  name: string;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ProjectCreateInput = {
  name: string;
  description?: string | null;
  metadata_json?: Record<string, unknown> | null;
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

export async function getProjects() {
  return apiJson<ProjectRead[]>("/projects", { method: "GET" });
}

export async function createProject(payload: ProjectCreateInput) {
  return apiJson<ProjectRead>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

