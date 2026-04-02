"""In-memory WebSocket connection registry with project-scoped rooms."""

from __future__ import annotations

import json
import uuid
from collections.abc import Iterable

from starlette.websockets import WebSocket


class ConnectionManager:
    """Tracks connections by client id and groups them by project_id (in memory)."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._rooms: dict[str, set[str]] = {}
        self._client_project: dict[str, str | None] = {}

    def _add_to_room(self, project_id: str, client_id: str) -> None:
        self._rooms.setdefault(project_id, set()).add(client_id)
        self._client_project[client_id] = project_id

    def _remove_from_room(self, client_id: str) -> None:
        pid = self._client_project.pop(client_id, None)
        if not pid:
            return
        members = self._rooms.get(pid)
        if not members:
            return
        members.discard(client_id)
        if not members:
            self._rooms.pop(pid, None)

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str | None = None,
        project_id: str | None = None,
    ) -> str:
        await websocket.accept()
        cid = client_id or str(uuid.uuid4())
        self._connections[cid] = websocket
        self._client_project[cid] = None
        if project_id:
            self._add_to_room(project_id, cid)
        return cid

    def subscribe(self, client_id: str, project_id: str) -> None:
        self._remove_from_room(client_id)
        self._add_to_room(project_id, client_id)

    def disconnect(self, client_id: str) -> None:
        self._remove_from_room(client_id)
        self._connections.pop(client_id, None)

    def disconnect_websocket(self, websocket: WebSocket) -> None:
        to_remove = [cid for cid, ws in self._connections.items() if ws is websocket]
        for cid in to_remove:
            self.disconnect(cid)

    async def send_personal_message(self, message: str, client_id: str) -> bool:
        ws = self._connections.get(client_id)
        if ws is None:
            return False
        await ws.send_text(message)
        return True

    async def broadcast(self, message: str, *, exclude_client_ids: Iterable[str] | None = None) -> None:
        excluded = set(exclude_client_ids or ())
        for client_id, ws in list(self._connections.items()):
            if client_id in excluded:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(client_id)

    async def broadcast_to_project(
        self,
        project_id: str,
        message: str,
        *,
        exclude_client_ids: Iterable[str] | None = None,
    ) -> None:
        excluded = set(exclude_client_ids or ())
        member_ids = list(self._rooms.get(project_id, set()))
        for client_id in member_ids:
            if client_id in excluded:
                continue
            ws = self._connections.get(client_id)
            if ws is None:
                self.disconnect(client_id)
                continue
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(client_id)

    @staticmethod
    def parse_subscribe_message(text: str) -> str | None:
        """Return project_id from a subscribe payload, or None."""
        raw = text.strip()
        if not raw:
            return None
        if raw.startswith("subscribe:"):
            return raw.split(":", 1)[1].strip() or None
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                pid = data.get("subscribe") or data.get("project_id")
                if isinstance(pid, str) and pid.strip():
                    return pid.strip()
        except json.JSONDecodeError:
            pass
        return None


manager = ConnectionManager()
