import random
import math
from agents.base_agent import BaseAgent
from llm.client import reason as llm_reason

class NavigationAgent(BaseAgent):
    def __init__(self, agent_id: int, grid, memory: dict, spawn: tuple, exit_pos: tuple):
        super().__init__(agent_id, "nav", grid, memory)
        self.x, self.y = spawn
        self.exit_x, self.exit_y = exit_pos
        self._path: list = []
        self._path_idx: int = 0
        self._llm_calls: int = 0
        self._total_ticks: int = 0

    async def perceive(self) -> dict:
        neighbors = []
        for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
            nx, ny = self.x+dx, self.y+dy
            if 0<=nx<self.grid.size and 0<=ny<self.grid.size:
                trig = self.grid.get_trigger_at(nx, ny)
                sig = self.grid.get_signal_at(nx, ny)
                neighbors.append({
                    "x": nx, "y": ny,
                    "passable": self.grid.cells[ny][nx] == 1,
                    "trigger": trig,
                    "signal": sig,
                })
        mentor_hints = self.memory.get("mentor_hints", [])
        scout_reports = [r for r in self.memory.get("scout_reports", []) if abs(r["x"]-self.x)<5 and abs(r["y"]-self.y)<5]
        return {
            "pos": (self.x, self.y),
            "exit": (self.exit_x, self.exit_y),
            "neighbors": neighbors,
            "mentor_hints": mentor_hints[-3:],
            "scout_reports": scout_reports,
        }

    async def reason(self, percept: dict) -> dict:
        self._total_ticks += 1
        # Compute top-2 routes to check ambiguity
        path1 = self._astar(self.x, self.y, self.exit_x, self.exit_y)
        alt_exit = self._get_intermediate_waypoint()
        path2 = self._astar(self.x, self.y, *alt_exit) if alt_exit else path1

        cost1 = len(path1)
        cost2 = len(path2)
        delta = abs(cost1-cost2) / max(cost1,1)
        use_llm = delta < 0.15 and random.random() < 0.3  # throttle LLM

        if use_llm:
            self._llm_calls += 1
            context = {"pos": percept["pos"], "exit": percept["exit"], "cost_delta": round(delta,3)}
            try:
                reasoning = await llm_reason("Choose optimal route given ambiguous costs.", context)
            except Exception:
                reasoning = "LLM unavailable — falling back to A*."
            self.reasoning_summary = f"[LLM] {reasoning[:120]}"
        else:
            self.reasoning_summary = f"[A*] Path cost={cost1}. Delta={delta:.2%}. No LLM needed."

        return {"path": path1, "use_llm": use_llm}

    async def plan(self, decision: dict) -> list:
        self._path = decision["path"]
        self._path_idx = 0
        return self._path

    async def act(self, path: list):
        if not path or self._path_idx >= len(path)-1:
            self._reassign_exit()
            return
        self._path_idx += 1
        target = path[self._path_idx]
        # Check red signal
        sig = self.grid.get_signal_at(target["x"] if isinstance(target,dict) else target[0],
                                       target["y"] if isinstance(target,dict) else target[1])
        if sig and sig["phase"] == 0:
            self.reasoning_summary = f"[WAIT] Red signal. Holding position."
            return
        if isinstance(target, dict):
            self.x, self.y = target["x"], target["y"]
        else:
            self.x, self.y = target
        self.grid.update_heatmap(self.x, self.y)
        self.path_cost += 1 + self._trigger_cost()
        # Reached exit?
        if self.x == self.exit_x and self.y == self.exit_y:
            self._write_mentor_hint(path)
            self._reassign_exit()

    def _astar(self, sx, sy, ex, ey) -> list:
        def h(x,y): return abs(x-ex)+abs(y-ey)
        def key(x,y): return (x,y)
        open_list = [{"x":sx,"y":sy,"g":0,"f":h(sx,sy),"parent":None}]
        closed = set()
        g_cost = {key(sx,sy): 0}
        while open_list:
            open_list.sort(key=lambda n: n["f"])
            cur = open_list.pop(0)
            if cur["x"]==ex and cur["y"]==ey:
                path = []
                while cur:
                    path.append({"x":cur["x"],"y":cur["y"]})
                    cur = cur["parent"]
                return list(reversed(path))
            k = key(cur["x"],cur["y"])
            if k in closed: continue
            closed.add(k)
            for dx,dy in [(0,1),(0,-1),(1,0),(-1,0)]:
                nx,ny = cur["x"]+dx, cur["y"]+dy
                if not(0<=nx<self.grid.size and 0<=ny<self.grid.size): continue
                if self.grid.cells[ny][nx] == 0: continue
                nk = key(nx,ny)
                if nk in closed: continue
                trig = self.grid.get_trigger_at(nx,ny)
                tc = (8 if trig["type"]=="congestion" else 3) if trig else 0
                g = g_cost.get(k,0) + 1 + tc
                if g < g_cost.get(nk, math.inf):
                    g_cost[nk] = g
                    open_list.append({"x":nx,"y":ny,"g":g,"f":g+h(nx,ny),"parent":cur})
        return []

    def _trigger_cost(self) -> float:
        trig = self.grid.get_trigger_at(self.x, self.y)
        return trig["intensity"] * (5 if trig["type"]=="congestion" else 2) if trig else 0

    def _get_intermediate_waypoint(self):
        rc = self.grid.get_road_cells()
        if not rc: return None
        return random.choice(rc)

    def _reassign_exit(self):
        rc = self.grid.get_road_cells()
        if rc:
            ne = random.choice(rc)
            self.exit_x, self.exit_y = ne
        self._path = []
        self._path_idx = 0

    def _write_mentor_hint(self, path: list):
        hints = self.memory.setdefault("mentor_hints", [])
        hints.append({"path": path[:10], "agent_id": self.id, "efficiency": 1/(self.path_cost+1)})
        if len(hints) > 20: self.memory["mentor_hints"] = hints[-20:]
