import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket
from datetime import datetime


class WebSocketManager:
    """Manages active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_to_client(self, client_id: str, event: str, data: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(
                    json.dumps({"event": event, "data": data, "timestamp": datetime.utcnow().isoformat()})
                )
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, event: str, data: dict):
        """Send event to all connected clients."""
        message = json.dumps({
            "event": event,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        })
        dead_clients = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception:
                dead_clients.append(client_id)
        for client_id in dead_clients:
            self.disconnect(client_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Singleton instance
ws_manager = WebSocketManager()
