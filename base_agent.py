from abc import ABC, abstractmethod
from typing import Optional

class BaseAgent(ABC):
    def __init__(self, agent_id: int, agent_type: str, grid, memory: dict):
        self.id = agent_id
        self.type = agent_type
        self.grid = grid
        self.memory = memory  # shared memory dict ref
        self.x: int = 0
        self.y: int = 0
        self.trust_score: float = 0.8
        self.status: str = "active"
        self.reasoning_summary: str = ""
        self.path_cost: float = 0.0

    @abstractmethod
    async def perceive(self) -> dict:
        """Read from environment: neighbors, triggers, shared memory."""
        ...

    @abstractmethod
    async def reason(self, percept: dict) -> dict:
        """Process perception, decide on plan. May invoke LLM."""
        ...

    @abstractmethod
    async def plan(self, decision: dict) -> list:
        """Convert decision into a path or action sequence."""
        ...

    @abstractmethod
    async def act(self, path: list):
        """Execute one step of the plan."""
        ...

    async def tick(self):
        percept = await self.perceive()
        decision = await self.reason(percept)
        path = await self.plan(decision)
        await self.act(path)

    def state(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "x": self.x,
            "y": self.y,
            "trust_score": round(self.trust_score, 3),
            "status": self.status,
            "reasoning_summary": self.reasoning_summary,
            "path_cost": round(self.path_cost, 2),
        }

    def reset(self):
        self.status = "active"
        self.trust_score = 0.8
        self.path_cost = 0.0
        self.reasoning_summary = ""
