import { apiOrigin } from "@/lib/config";

export type RealtimeEnvelope = {
  type: string;
  project_id: string;
  entity_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

/** Builds `ws://` / `wss://` URL to backend `/ws` with optional initial project room. */
export function buildWebSocketUrl(projectId?: string) {
  const u = new URL(apiOrigin());
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws";
  u.search = "";
  if (projectId) {
    u.searchParams.set("project_id", projectId);
  }
  return u.toString();
}

/** Message to join/switch project room (matches backend `parse_subscribe_message`). */
export function subscribeProjectMessage(projectId: string) {
  return JSON.stringify({ subscribe: projectId });
}

export type ProjectRealtimeHandlers = {
  onEvent: (event: RealtimeEnvelope) => void;
  onConnectionError?: (event: Event) => void;
};

/**
 * Opens a WebSocket to `/ws`, optionally scoped to `projectId` via query string.
 * Returns a disconnect function (call on unmount).
 */
export function connectProjectRealtime(
  projectId: string,
  handlers: ProjectRealtimeHandlers,
): () => void {
  const ws = new WebSocket(buildWebSocketUrl(projectId));

  ws.onmessage = (ev: MessageEvent<string>) => {
    try {
      const raw = JSON.parse(ev.data) as unknown;
      if (!raw || typeof raw !== "object") return;
      const o = raw as Record<string, unknown>;
      if (typeof o.type !== "string") return;
      if (typeof o.project_id !== "string" || typeof o.entity_id !== "string") return;
      const payload = o.payload;
      if (!payload || typeof payload !== "object") return;
      const timestamp =
        typeof o.timestamp === "string" ? o.timestamp : new Date().toISOString();
      handlers.onEvent({
        type: o.type,
        project_id: o.project_id,
        entity_id: o.entity_id,
        payload: payload as Record<string, unknown>,
        timestamp,
      });
    } catch {
      // ignore parse errors / heartbeats
    }
  };

  if (handlers.onConnectionError) {
    ws.onerror = handlers.onConnectionError;
  }

  return () => {
    ws.close();
  };
}
