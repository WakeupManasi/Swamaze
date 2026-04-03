import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from simulation.event_bus import EventBus

ws_router = APIRouter()

# Global event bus instance
event_bus = EventBus()

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        print(f"WS connected. Total: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)
        print(f"WS disconnected. Total: {len(self.active)}")

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

manager = ConnectionManager()

@ws_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Subscribe this connection to the event bus
    async def send_to_client(event: dict):
        await websocket.send_text(json.dumps(event))

    event_bus.subscribe(send_to_client)
    try:
        while True:
            # Keep connection alive; listen for client commands
            data = await websocket.receive_text()
            msg = json.loads(data)
            cmd = msg.get("command")
            if cmd == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif cmd == "subscribe_agent":
                agent_id = msg.get("agent_id")
                await websocket.send_text(json.dumps({"type": "subscribed", "agent_id": agent_id}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        event_bus.unsubscribe(send_to_client)
