from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import random

router = APIRouter()

# In-memory state (replace with DB queries in production)
_engine = None
_simulations = {}
_scenarios = {
    "1": {"id":"1","name":"Dense City","grid_type":"city","description":"High-density urban grid"},
    "2": {"id":"2","name":"Sparse Grid","grid_type":"sparse","description":"Low-density open roads"},
    "3": {"id":"3","name":"Dead-End Heavy","grid_type":"deadend","description":"Complex dead-end maze"},
}

class SimStartRequest(BaseModel):
    scenario_id: str = "1"
    speed_ms: int = 200
    agent_count: int = 9

class ScenarioCreate(BaseModel):
    name: str
    grid_type: str
    description: str = ""

# ─── SIMULATION CONTROL ─────────────────────────────────────────

@router.post("/simulation/start")
async def start_simulation(req: SimStartRequest):
    sim_id = f"sim_{random.randint(1000,9999)}"
    _simulations[sim_id] = {
        "id": sim_id,
        "scenario_id": req.scenario_id,
        "status": "running",
        "tick": 0,
        "speed_ms": req.speed_ms
    }
    return {"sim_id": sim_id, "status": "running", "message": "Simulation started"}

@router.post("/simulation/pause")
async def pause_simulation():
    if _engine:
        _engine.pause()
    return {"status": "paused"}

@router.post("/simulation/step")
async def step_simulation():
    if _engine:
        await _engine.step()
        return {"tick": _engine.tick_count}
    return {"tick": 0, "message": "No active simulation"}

@router.post("/simulation/reset")
async def reset_simulation():
    if _engine:
        _engine.reset()
    return {"status": "reset"}

@router.get("/simulation/state")
async def get_state():
    if _engine:
        return _engine.get_state()
    return {"tick": 0, "agents": [], "grid": {}, "triggers": [], "signals": []}

# ─── SCENARIOS ──────────────────────────────────────────────────

@router.get("/scenarios")
async def list_scenarios():
    return list(_scenarios.values())

@router.post("/scenarios")
async def create_scenario(s: ScenarioCreate):
    new_id = str(len(_scenarios)+1)
    _scenarios[new_id] = {"id":new_id,"name":s.name,"grid_type":s.grid_type,"description":s.description}
    return _scenarios[new_id]

@router.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    if scenario_id not in _scenarios:
        raise HTTPException(404, "Scenario not found")
    return _scenarios[scenario_id]

# ─── REPLAY ─────────────────────────────────────────────────────

@router.get("/replay/{simulation_id}")
async def get_replay(simulation_id: str):
    if _engine:
        return {"frames": len(_engine.replay_frames), "simulation_id": simulation_id}
    return {"frames": 0}

@router.get("/replay/{simulation_id}/tick/{n}")
async def get_replay_tick(simulation_id: str, n: int):
    if _engine:
        frame = _engine.get_replay_frame(n)
        if frame: return frame
    raise HTTPException(404, f"Tick {n} not found in replay")

# ─── ANALYTICS ──────────────────────────────────────────────────

@router.get("/analytics/{simulation_id}")
async def get_analytics(simulation_id: str):
    if not _engine:
        return {}
    agents = [a.state() for a in _engine.agents]
    return {
        "simulation_id": simulation_id,
        "total_ticks": _engine.tick_count,
        "agent_count": len(agents),
        "avg_trust": round(sum(a["trust_score"] for a in agents)/max(1,len(agents)), 3),
        "avg_path_cost": round(sum(a["path_cost"] for a in agents)/max(1,len(agents)), 2),
        "trigger_count": len(_engine.grid.triggers),
        "agents": agents,
    }

# ─── TRIGGERS (manual injection) ────────────────────────────────

class TriggerRequest(BaseModel):
    x: int
    y: int
    type: str = "congestion"
    intensity: float = 0.8

@router.post("/trigger")
async def add_trigger(req: TriggerRequest):
    if _engine:
        _engine.grid.add_trigger(req.x, req.y, req.type, req.intensity)
        return {"status": "trigger added", "x": req.x, "y": req.y}
    return {"status": "no active simulation"}

@router.post("/storm")
async def trigger_storm():
    if _engine:
        road_cells = _engine.grid.get_road_cells()
        for _ in range(random.randint(5,10)):
            c = random.choice(road_cells)
            _engine.grid.add_trigger(c[0], c[1], "congestion", 0.9)
        return {"status": "storm triggered", "triggers_added": True}
    return {"status": "no active simulation"}
