# 🐝 SWAMAZE

### Swarm Intelligence + Maze Optimization Platform

> *No single controller should govern any system that must be fast, resilient, and adaptive.*
> *SWAMAZE brings swarm intelligence to urban infrastructure.*

SWAMAZE is a decentralized multi-agent AI platform built to simulate, model, and optimize complex network systems — starting with urban traffic. Forget centralized controllers. SWAMAZE replaces them with autonomous swarm agents governed by emergent intelligence, delivering real-time adaptive optimization, fault-tolerant architecture, and measurable reductions in congestion at scale.

---

## The PROMBLEM

Urban traffic infrastructure is failing — quietly, expensively, and at scale.

- 💸 **$87 billion** lost annually in the US due to traffic congestion
- ⏱️ Urban residents lose an average of **54 hours per year** stuck in traffic
- 🚑 Emergency services delayed by an average of **4.4 minutes** due to poor adaptive routing
- 🚦 Static signal systems cannot respond to real-time demand spikes or incidents

The deeper issue isn't infrastructure — it's architecture. Centralized controllers create a **single point of failure**. One crash cascades into system-wide gridlock. At scale, the controller itself becomes the bottleneck: decision lag grows non-linearly, costs scale exponentially, and rule-based systems repeat failures because they cannot learn from outcomes.

Adding more lanes doesn't solve flow. That's **Braess's Paradox**, and it's been proven over and over again.

**SWAMAZE is the architectural inversion.** No central controller. No single point of failure. No rule-based rigidity. Optimal behavior emerges from the collective interactions of individually simple agents.

---

## 🧠 PROPOSED SOLUTION BY SWAMAZE.

A grid or maze represents any real-world network. Intersections are cells, roads are paths, vehicles are agents. Every agent operates autonomously — no one is in charge, and yet the whole system finds its way.

Each agent runs a continuous 5-phase cognitive loop called **PRPAL**:

- 👁️ **Perception** — reads its immediate neighborhood: neighbor positions, Hive signals, road edge weights, conflict zones, and Digital Twin state updates.
- 🤔 **Reasoning** — evaluates options using an LLM-assisted reasoning module and GNN-derived route scores. LangChain chains provide chain-of-thought processing for complex intersections.
- 📋 **Planning** — computes an action plan: next node, signal to emit, yield decision, merge negotiation. Planning horizon is tunable from greedy to full lookahead.
- ⚡ **Action** — moves to the next node, emits a pheromone signal to the Hive Layer, yields to a higher-priority agent, or triggers a Conflict Agent if deadlock is detected.
- 📚 **Learning** — post-action feedback updates local weights; outcomes are aggregated into Hive Layer memory for population-level adaptation.

No orchestrator. No queue of commands from above. Just 10,000 agents thinking locally, and a city flowing globally.

---

## ✨ Core Innovations

**🐜 Hive Intelligence Layer**
A pheromone-inspired signal broadcast that creates global influence from local agent emissions. Signals decay over time — mimicking ant colony optimization at city scale. No agent needs a global view; the Hive creates one from the bottom up.

**🧬 Neural Pathfinder**
A Graph Neural Network (GNN) trained on traffic graphs that dynamically computes optimal routes. It outperforms Dijkstra's algorithm at high agent counts by predicting congestion *before it forms*.

**🪞 Digital Twin**
Real-world sensor data streams are mirrored into the simulation in real time. The twin detects drift between simulated and actual states and triggers corrective agent behavior — automatically, continuously.

**🎭 Behavioral Personas**
Agents are assigned archetypes — Aggressive, Conservative, Adaptive, Emergency, Autonomous — to model realistic heterogeneous traffic. Each persona has unique decision weights within the PRPAL loop.

**📝 Scenario DSL**
A domain-specific language for engineers and planners to define arbitrary events — accidents, road closures, surge demand, weather — as executable code. Zero-cost hypothesis testing, zero risk to real infrastructure.

---

## 🤖 Agent Types

| Agent | Role | Key Behaviors |
|---|---|---|
| 🧭 Navigation | Core entity movement | Pathfind, avoid congestion, merge, emit signals |
| 🗺️ Mapping | Graph state maintenance | Update edge weights, detect blockages, flag anomalies |
| ⚙️ Optimization | Global efficiency coordination | Signal timing, flow balancing, throughput maximization |
| ⚔️ Conflict | Deadlock and collision resolution | Detect deadlock, negotiate yield priority, reroute |
| 💥 Trigger | Scenario event injection | Simulate accidents, closures, surge demand via DSL |
| 🐝 Hive | Swarm signal coordination | Aggregate pheromone signals, apply decay model, broadcast |
| 🪞 Digital Twin | Real-world synchronization | Mirror sensor data, detect drift, trigger corrections |

---

## 🏗️ System Architecture

| Layer | Components | Responsibility |
|---|---|---|
| 🖥️ Frontend | React, TypeScript, p5.js, Three.js | Simulation rendering, control panel, analytics UI |
| 🔌 API Gateway | FastAPI (REST + WebSocket) | Agent orchestration, scenario ingestion, state streaming |
| 📬 Task Queue | Celery + Redis | Async agent execution, distributed task scheduling |
| 🧠 AI Core | LangChain + OpenAI, PyTorch Geometric, ONNX | Agent reasoning, GNN routing inference |
| 🐝 Hive Layer | Custom signal engine on Redis | Pheromone broadcast, decay modeling, signal aggregation |
| 🪞 Digital Twin | Sync engine + external sensor API | Real-world data mirroring, drift detection |
| 🗄️ Data Layer | PostgreSQL, TimescaleDB, Redis | Config/audit storage, time-series metrics, hot cache |

---

## 🛠️ Tech Stack — Current

What's actively running in the repo right now.

| Technology | Purpose |
|---|---|
| 🟦 TypeScript | Frontend type safety, component logic, API client contracts |
| 🐍 Python | Backend agent logic, FastAPI server, AI/ML pipeline |
| 🐳 Docker | Containerized local development, reproducible environments |
| 🌐 HTML | Simulation canvas shell, dashboard scaffolding |

---

## 🔮 Tech Stack — Planned on implementing

Technologies defined in the product specification, to be integrated phase by phase.

**🖼️ Frontend**
- React + TypeScript — agent control UI and dashboards
- p5.js — 2D maze/agent simulation rendering at 60fps
- Three.js — 3D traffic flow visualization via WebGL

**⚙️ Backend**
- FastAPI — async REST + WebSocket API server
- Redis — shared agent state, pub/sub signal bus, hot cache
- Celery — async distributed agent task execution with priority queues

**🧬 AI / ML**
- LangChain + OpenAI — agent chain-of-thought reasoning and scenario NLP parsing
- PyTorch Geometric — GNN model training on graph-structured traffic data
- ONNX Runtime — production GNN inference without PyTorch dependency

**🗄️ Data**
- PostgreSQL — agent config, scenarios, audit logs (ACID, JSONB support)
- TimescaleDB — time-series metrics with automatic partitioning and range query optimization

## 🗺️ Roadmap

| Phase | Milestone | Key Deliverables | Timeline |
|---|---|---|---|
| 0️⃣ Phase 0 | Foundation | Grid engine, base Navigation agent, p5.js render, FastAPI skeleton | 
| 1️⃣ Phase 1 | MVP Core | All 7 agent types, PRPAL loop, Hive Layer, Redis pub/sub, basic dashboard | 
| 2️⃣ Phase 2 | AI Integration | Neural Pathfinder (GNN) + ONNX deploy, LangChain reasoning, Scenario DSL v1 | 
| 3️⃣ Phase 3 | Digital Twin | Sensor adapter, drift detection, real-world sync, Three.js 3D view | 
| 4️⃣ Phase 4 | Analytics & UX | Full analytics dashboard, alerts, historical replay, Scenario DSL v2 | 
| 5️⃣ Phase 5 | Scale & Harden | K8s deployment, KEDA autoscaling, security audit, performance benchmarks |
| 6️⃣ Phase 6 | Open Platform | SDK for 3rd-party agents, federated learning module, public API |

---

## 🌍 Real-World Applications

| Domain | Application | Expected Impact |
|---|---|---|
| 🚦 Urban Traffic Management | Adaptive signal control, incident response routing | 30–45% reduction in average congestion |
| 🚑 Emergency Services | Priority corridor creation, real-time rerouting | −2.8 min average emergency response time |
| 🚛 Logistics & Fleet | Multi-vehicle route optimization, depot planning | 20% fuel cost reduction at fleet scale |
| 🏙️ Smart City Infrastructure | Cross-system coordination (transit + traffic + utilities) | Unified event response layer |
| 🆘 Disaster Management | Mass evacuation flow simulation and optimization | Bottleneck prediction before incident formation |
| 🔬 Research & Policy | Traffic policy hypothesis testing without real risk | Zero-cost scenario sandbox |
| 🤖 Autonomous Vehicles | V2X coordination protocol testbed | Multi-agent AV coordination at city scale |

---

## 📖 Glossary

| Term | Definition |
|---|---|
| PRPAL Loop | Perception → Reasoning → Planning → Action → Learning — the agent cognitive cycle |
| Hive Layer | The pheromone-inspired signal bus enabling global swarm coordination without a central controller |
| Neural Pathfinder | The GNN-based routing module that dynamically computes optimal paths across the network graph |
| Digital Twin | A real-time synchronized simulation mirror of a real-world network, fed by live sensor data |
| Scenario DSL | A domain-specific language for defining simulation events and interventions as executable code |
| Behavioral Persona | A named archetype assigned to an agent, modulating its PRPAL decision weights |
| Emergent Optimization | System-level efficiency arising from the collective interactions of individually simple agents |
| GNN | Graph Neural Network — a neural architecture operating natively on graph-structured data |
| ONNX | Open Neural Network Exchange — a framework-agnostic model format for production inference |
| Pheromone Decay | The process by which Hive Layer signals lose influence over time, preventing signal saturation |

---

