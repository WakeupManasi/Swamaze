import random
from agents.base_agent import BaseAgent

class ScoutAgent(BaseAgent):
    def __init__(self, agent_id: int, grid, memory: dict, spawn: tuple, target_region: tuple):
        super().__init__(agent_id, "scout", grid, memory)
        self.x, self.y = spawn
        self.target_x, self.target_y = target_region
        self._steps = 0
        self._max_steps = 40
        self._expired = False

    async def perceive(self) -> dict:
        if self._expired:
            return {}
        costs = {}
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                nx, ny = self.x+dx, self.y+dy
                if 0<=nx<self.grid.size and 0<=ny<self.grid.size and self.grid.cells[ny][nx]==1:
                    trig = self.grid.get_trigger_at(nx, ny)
                    costs[(nx,ny)] = trig["intensity"]*(5 if trig["type"]=="congestion" else 2) if trig else 0
        return {"region_costs": costs}

    async def reason(self, percept: dict) -> dict:
        return {"target": (self.target_x, self.target_y)}

    async def plan(self, decision: dict) -> list:
        # Direct fast movement toward target
        dx = 1 if self.x < self.target_x else (-1 if self.x > self.target_x else 0)
        dy = 1 if self.y < self.target_y else (-1 if self.y > self.target_y else 0)
        steps = []
        if dx and 0<=self.x+dx<self.grid.size and self.grid.cells[self.y][self.x+dx]==1:
            steps.append({"x":self.x+dx,"y":self.y})
        if dy and 0<=self.y+dy<self.grid.size and self.grid.cells[self.y+dy][self.x]==1:
            steps.append({"x":self.x,"y":self.y+dy})
        return steps

    async def act(self, path: list):
        if self._expired: return
        self._steps += 1
        if path:
            step = path[0]
            self.x, self.y = step["x"], step["y"]
            self.grid.update_heatmap(self.x, self.y)
        # Write region report
        reports = self.memory.setdefault("scout_reports", [])
        reports.append({"x": self.x, "y": self.y, "scout_id": self.id, "tick": self._steps})
        if len(reports) > 100: self.memory["scout_reports"] = reports[-100:]
        self.reasoning_summary = f"Scout exploring [{self.x},{self.y}] → target [{self.target_x},{self.target_y}]"
        # Self-destruct after mission
        if self._steps >= self._max_steps or (self.x==self.target_x and self.y==self.target_y):
            self._expired = True
            self.status = "expired"
            self.reasoning_summary = f"Scout mission complete. Region report written. Expiring."
            # Reassign new target
            rc = self.grid.get_road_cells()
            if rc:
                t = random.choice(rc)
                self.target_x, self.target_y = t
                self._steps = 0
                self._expired = False
                self.status = "active"
