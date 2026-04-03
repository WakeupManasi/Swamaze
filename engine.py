import asyncio
import json
from typing import List, Optional
from simulation.grid import Grid
from simulation.event_bus import EventBus

class SimulationEngine:
    def __init__(self, agents: list, grid: Grid, event_bus: EventBus):
        self.agents = agents
        self.grid = grid
        self.event_bus = event_bus
        self.running = False
        self.tick_count = 0
        self.speed_ms = 200
        self.replay_frames = []

    async def run(self, speed_ms: int = 200):
        self.speed_ms = speed_ms
        self.running = True
        while self.running:
            await self._tick()
            await asyncio.sleep(speed_ms / 1000)

    def pause(self):
        self.running = False

    def reset(self):
        self.running = False
        self.tick_count = 0
        self.replay_frames = []
        for agent in self.agents:
            agent.reset()
        self.grid.reset()

    async def step(self):
        """Advance exactly one tick."""
        await self._tick()

    async def _tick(self):
        # Run all agents concurrently
        await asyncio.gather(*[agent.tick() for agent in self.agents])
        # Update grid triggers (decay, cascade)
        self.grid.update_triggers()
        # Build snapshot
        snapshot = self._snapshot()
        # Store for replay
        self.replay_frames.append({
            "tick": self.tick_count,
            "state": snapshot
        })
        # Broadcast to all WebSocket clients
        await self.event_bus.broadcast(snapshot)
        self.tick_count += 1

    def _snapshot(self) -> dict:
        return {
            "tick": self.tick_count,
            "agents": [a.state() for a in self.agents],
            "grid": self.grid.serialize(),
            "triggers": self.grid.get_triggers(),
            "signals": self.grid.get_signals(),
        }

    def get_state(self) -> dict:
        return self._snapshot()

    def get_replay_frame(self, tick_n: int) -> Optional[dict]:
        for frame in self.replay_frames:
            if frame["tick"] == tick_n:
                return frame
        return None
