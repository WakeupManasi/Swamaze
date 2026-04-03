import random
from typing import List, Dict, Optional, Tuple

CELL_OPEN = 1
CELL_WALL = 0

class Grid:
    def __init__(self, size: int = 22, scenario: str = "city"):
        self.size = size
        self.scenario = scenario
        self.cells: List[List[int]] = []
        self.triggers: List[Dict] = []
        self.signals: List[Dict] = []
        self.heatmap: List[List[float]] = [[0.0]*size for _ in range(size)]
        self.build(scenario)
        self.build_signals()

    def build(self, scenario: str):
        g = [[0]*self.size for _ in range(self.size)]
        if scenario == "city":
            for r in [3,7,11,15,19]:
                for c in range(self.size): g[r][c] = 1
            for c in [2,6,10,14,18,21]:
                for r in range(self.size): g[r][c] = 1
        elif scenario == "sparse":
            for r in [5,11,17]:
                for c in range(self.size): g[r][c] = 1
            for c in [4,10,16]:
                for r in range(self.size): g[r][c] = 1
        elif scenario == "deadend":
            for r in [2,5,8,11,14,17,20]:
                for c in range(self.size):
                    if c % 4 != 0 or r % 6 == 2: g[r][c] = 1
            for c in [2,6,10,14,18]:
                for r in range(self.size): g[r][c] = 1
        self.cells = g

    def build_signals(self):
        self.signals = []
        road_rows = [r for r in range(self.size) if any(self.cells[r][c]==1 for c in range(self.size))]
        road_cols = [c for c in range(self.size) if any(self.cells[r][c]==1 for r in range(self.size))]
        for r in road_rows:
            for c in road_cols:
                if self.cells[r][c]==1 and random.random()>0.5:
                    self.signals.append({
                        "x": c, "y": r,
                        "phase": random.randint(0,2),
                        "timer": random.randint(5,20)
                    })

    def update_triggers(self):
        # Decay
        for t in self.triggers:
            t["decay"] -= 1
            t["intensity"] -= 0.02
        # Cascade: congestion spreads to adjacent cells
        new_triggers = []
        for t in self.triggers:
            if t["type"] == "congestion" and t["intensity"] > 0.7:
                for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
                    nx, ny = t["x"]+dx, t["y"]+dy
                    if 0<=nx<self.size and 0<=ny<self.size and self.cells[ny][nx]==1:
                        if not any(e["x"]==nx and e["y"]==ny for e in self.triggers):
                            if random.random() < 0.15:
                                new_triggers.append({"x":nx,"y":ny,"type":"congestion","intensity":0.4,"decay":10})
        self.triggers.extend(new_triggers)
        self.triggers = [t for t in self.triggers if t["decay"]>0 and t["intensity"]>0]
        # Update signals
        for s in self.signals:
            s["timer"] -= 1
            if s["timer"] <= 0:
                s["phase"] = (s["phase"]+1) % 3
                s["timer"] = random.randint(10,20)

    def add_trigger(self, x: int, y: int, ttype: str, intensity: float = 0.7):
        existing = next((t for t in self.triggers if t["x"]==x and t["y"]==y), None)
        if existing:
            existing["intensity"] = min(1.0, existing["intensity"]+0.2)
            existing["decay"] = max(existing["decay"], 30)
        else:
            self.triggers.append({"x":x,"y":y,"type":ttype,"intensity":intensity,"decay":30})

    def get_road_cells(self) -> List[Tuple[int,int]]:
        return [(x,y) for y in range(self.size) for x in range(self.size) if self.cells[y][x]==1]

    def get_trigger_at(self, x: int, y: int) -> Optional[Dict]:
        return next((t for t in self.triggers if t["x"]==x and t["y"]==y), None)

    def get_signal_at(self, x: int, y: int) -> Optional[Dict]:
        return next((s for s in self.signals if s["x"]==x and s["y"]==y), None)

    def update_heatmap(self, x: int, y: int):
        self.heatmap[y][x] = min(1.0, self.heatmap[y][x]+0.05)

    def reset(self):
        self.triggers = []
        self.heatmap = [[0.0]*self.size for _ in range(self.size)]
        self.build(self.scenario)
        self.build_signals()

    def serialize(self) -> dict:
        return {
            "size": self.size,
            "cells": self.cells,
            "heatmap": self.heatmap
        }

    def get_triggers(self) -> list:
        return self.triggers

    def get_signals(self) -> list:
        return self.signals
