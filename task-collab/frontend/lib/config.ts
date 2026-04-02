/**
 * Backend API origin (REST + WebSocket). Hardcoded for local demo / interview review;
 * change this if your API runs on another host or port.
 */
export const API_BASE_URL = "http://localhost:8000";

export function apiOrigin(): string {
  return API_BASE_URL.replace(/\/+$/, "");
}
