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

export async function getProjects() {
  return apiJson<ProjectRead[]>("/projects", { method: "GET" });
}

export async function createProject(payload: ProjectCreateInput) {
  return apiJson<ProjectRead>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

