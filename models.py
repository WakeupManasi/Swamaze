from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Simulation(Base):
    __tablename__ = "simulations"
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="running")  # running, paused, completed
    config_json = Column(JSON, nullable=True)
    agents = relationship("Agent", back_populates="simulation")
    replay_frames = relationship("ReplayFrame", back_populates="simulation")

class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"))
    type = Column(String(20))
    spawn_x = Column(Integer)
    spawn_y = Column(Integer)
    exit_x = Column(Integer)
    exit_y = Column(Integer)
    trust_score = Column(Float, default=0.8)
    status = Column(String(20), default="active")
    simulation = relationship("Simulation", back_populates="agents")
    ticks = relationship("AgentTick", back_populates="agent")

class AgentTick(Base):
    __tablename__ = "agent_ticks"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"))
    tick = Column(Integer)
    x = Column(Integer)
    y = Column(Integer)
    action = Column(String(50))
    reasoning_summary = Column(Text, nullable=True)
    path_cost = Column(Float, default=0.0)
    agent = relationship("Agent", back_populates="ticks")

class Trigger(Base):
    __tablename__ = "triggers"
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"))
    cell_x = Column(Integer)
    cell_y = Column(Integer)
    type = Column(String(30))
    intensity = Column(Float)
    decay_rate = Column(Float, default=0.02)
    created_at = Column(DateTime, default=datetime.utcnow)
    decayed_at = Column(DateTime, nullable=True)

class SharedMemory(Base):
    __tablename__ = "shared_memory"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True)
    value_json = Column(JSON)
    written_by_agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    written_at = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, default=0.5)

class ReplayFrame(Base):
    __tablename__ = "replay_frames"
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"))
    tick = Column(Integer, index=True)
    state_snapshot_json = Column(JSON)
    simulation = relationship("Simulation", back_populates="replay_frames")

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    grid_json = Column(JSON)
    agent_config_json = Column(JSON, nullable=True)
    event_schedule_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
