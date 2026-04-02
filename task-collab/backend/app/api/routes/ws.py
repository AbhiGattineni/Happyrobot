import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.websocket.connection_manager import ConnectionManager, manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str | None = Query(None),
    project_id: str | None = Query(None),
) -> None:
    cid = await manager.connect(websocket, client_id, project_id)
    room = project_id or "(none)"
    logger.info("WebSocket connected client_id=%s project_id=%s", cid, room)
    try:
        while True:
            text = await websocket.receive_text()
            new_room = ConnectionManager.parse_subscribe_message(text)
            if new_room:
                manager.subscribe(cid, new_room)
                logger.info("WebSocket subscribed client_id=%s project_id=%s", cid, new_room)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(cid)
        logger.info("WebSocket disconnected client_id=%s", cid)
