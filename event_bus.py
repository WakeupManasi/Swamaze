import json
import asyncio
from typing import Set, Callable, Awaitable

class EventBus:
    def __init__(self):
        self._subscribers: Set[Callable] = set()
        self._event_log: list = []

    def subscribe(self, callback: Callable[[dict], Awaitable[None]]):
        self._subscribers.add(callback)

    def unsubscribe(self, callback: Callable):
        self._subscribers.discard(callback)

    async def broadcast(self, event: dict):
        self._event_log.append(event)
        if len(self._event_log) > 5000:
            self._event_log = self._event_log[-5000:]
        dead = set()
        for cb in self._subscribers:
            try:
                await cb(event)
            except Exception:
                dead.add(cb)
        for cb in dead:
            self._subscribers.discard(cb)

    def emit(self, event_type: str, data: dict):
        """Synchronous emit for non-async contexts."""
        asyncio.create_task(self.broadcast({"type": event_type, **data}))

    def get_log(self) -> list:
        return self._event_log
