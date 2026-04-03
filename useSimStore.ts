// store/useSimStore.ts
import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────────────────────
export type AgentType = "nav" | "map" | "opt" | "scout" | "mentor";
export type TriggerType = "congestion" | "slow";
export type Theme = "dark" | "light";
export type Scenario = "city" | "sparse" | "deadend";

export interface AgentState {
  id: number;
  type: AgentType;
  color: string;
  x: number; y: number;     // float canvas position
  gx: number; gy: number;   // grid cell
  ex: number; ey: number;   // exit cell
  trust: number;
  efficiency: number;
  reasoning: string;
  path: { x: number; y: number }[];
  pidx: number;
  history: { x: number; y: number }[];
  llmUsed: boolean;
  status: "active" | "waiting" | "expired";
}

export interface TriggerState {
  x: number; y: number;
  type: TriggerType;
  intensity: number;
  decay: number;
}

export interface SignalState {
  x: number; y: number;
  phase: number;   // 0=red, 1=amber, 2=green
  timer: number;
}

export interface LogEntry {
  tick: number;
  type: TriggerType | "scout" | "storm";
  msg: string;
}

export interface MemEntry { key: string; val: string; tick: number; }

// ── Helpers ────────────────────────────────────────────────────────────────
const GRID_SIZE = 22;
const AGENT_COLORS: Record<AgentType, string> = {
  nav: "#FF00AD", map: "#7EEBBC", opt: "#8400C0", scout: "#FFD700", mentor: "#FF6B35",
};

function buildGrid(sc: Scenario): number[][] {
  const g: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  if (sc === "city") {
    [3,7,11,15,19].forEach(r => { for (let c = 0; c < GRID_SIZE; c++) g[r][c] = 1; });
    [2,6,10,14,18,21].forEach(c => { for (let r = 0; r < GRID_SIZE; r++) g[r][c] = 1; });
  } else if (sc === "sparse") {
    [5,11,17].forEach(r => { for (let c = 0; c < GRID_SIZE; c++) g[r][c] = 1; });
    [4,10,16].forEach(c => { for (let r = 0; r < GRID_SIZE; r++) g[r][c] = 1; });
  } else {
    [2,5,8,11,14,17,20].forEach(r => {
      for (let c = 0; c < GRID_SIZE; c++) if (c % 4 !== 0 || r % 6 === 2) g[r][c] = 1;
    });
    [2,6,10,14,18].forEach(c => { for (let r = 0; r < GRID_SIZE; r++) g[r][c] = 1; });
  }
  return g;
}

function getRoadCells(grid: number[][]): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++)
      if (grid[y]?.[x] === 1) cells.push({ x, y });
  return cells;
}

function astar(
  grid: number[][], triggers: TriggerState[], stormActive: boolean,
  sx: number, sy: number, ex: number, ey: number
): { x: number; y: number }[] {
  const H = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);
  const K = (x: number, y: number) => `${x},${y}`;
  const open = [{ x: sx, y: sy, g: 0, f: H(sx, sy), p: null as any }];
  const closed = new Set<string>();
  const gc: Record<string, number> = { [K(sx, sy)]: 0 };
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (cur.x === ex && cur.y === ey) {
      const path: { x: number; y: number }[] = [];
      let n: any = cur;
      while (n) { path.unshift({ x: n.x, y: n.y }); n = n.p; }
      return path;
    }
    const k = K(cur.x, cur.y);
    if (closed.has(k)) continue;
    closed.add(k);
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      if (grid[ny]?.[nx] !== 1) continue;
      const nk = K(nx, ny);
      if (closed.has(nk)) continue;
      const tr = triggers.find(t => t.x === nx && t.y === ny);
      const tc = tr ? (tr.type === "congestion" ? 9 : 3) : 0;
      const sc2 = stormActive ? Math.random() * 4 : 0;
      const g = (gc[k] ?? 0) + 1 + tc + sc2;
      if (g < (gc[nk] ?? Infinity)) {
        gc[nk] = g;
        open.push({ x: nx, y: ny, g, f: g + H(nx, ny), p: cur });
      }
    }
  }
  return [];
}

function spawnAgents(grid: number[][]): AgentState[] {
  const rc = getRoadCells(grid);
  const agents: AgentState[] = [];
  let id = 0;
  const defs: { type: AgentType; count: number }[] = [
    { type: "nav", count: 4 }, { type: "map", count: 1 },
    { type: "opt", count: 1 }, { type: "scout", count: 2 }, { type: "mentor", count: 1 },
  ];
  const initR: Record<AgentType, string> = {
    nav:    "[A*] Initializing pathfinder. Scanning trigger overlays...",
    map:    "[MAP] Building global explored grid from all agent feeds.",
    opt:    "[OPT] Reading annotated map. Computing weight updates.",
    scout:  "[SCOUT] Deployed at 2× speed. Pre-exploring target region.",
    mentor: "[MENTOR] Observing runs. Distilling path hints to shared memory.",
  };
  defs.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const sp = rc[Math.floor(Math.random() * rc.length)] ?? { x: 0, y: 0 };
      const ex = rc[Math.floor(Math.random() * rc.length)] ?? { x: 1, y: 0 };
      agents.push({
        id: id++, type, color: AGENT_COLORS[type],
        x: sp.x + 0.5, y: sp.y + 0.5,
        gx: sp.x, gy: sp.y,
        ex: ex.x, ey: ex.y,
        trust: 0.65 + Math.random() * 0.35,
        efficiency: 1.0,
        reasoning: initR[type],
        path: [], pidx: 0,
        history: [],
        llmUsed: false,
        status: "active",
      });
    }
  });
  return agents;
}

function buildSignals(grid: number[][]): SignalState[] {
  const sigs: SignalState[] = [];
  const rows: number[] = [], cols: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) if (grid[r].some(c => c === 1)) rows.push(r);
  for (let c = 0; c < GRID_SIZE; c++) if (grid.some(r => r[c] === 1)) cols.push(c);
  rows.forEach(r => cols.forEach(c => {
    if (grid[r]?.[c] === 1 && Math.random() > 0.55)
      sigs.push({ x: c, y: r, phase: Math.floor(Math.random() * 3), timer: 10 + Math.floor(Math.random() * 15) });
  }));
  return sigs;
}

// ── Store Interface ────────────────────────────────────────────────────────
interface SimStore {
  grid: number[][];
  agents: AgentState[];
  triggers: TriggerState[];
  signals: SignalState[];
  heatmap: number[][];
  tick: number;
  running: boolean;
  speed: number;
  scenario: Scenario;
  theme: Theme;
  selectedAgent: number | null;
  showHeat: boolean;
  showTrust: boolean;
  showSigs: boolean;
  showPaths: boolean;
  stormTicks: number;
  conflicts: number;
  exits: number;
  llmCalls: number;
  log: LogEntry[];
  sharedMem: MemEntry[];

  // Actions
  initSim: (sc: Scenario) => void;
  tick1: () => void;
  doStep: () => void;
  doReset: () => void;
  setRunning: (v: boolean) => void;
  triggerStorm: () => void;
  setScenario: (sc: Scenario) => void;
  setTheme: (t: Theme) => void;
  setSelectedAgent: (i: number | null) => void;
  setSpeed: (ms: number) => void;
  toggleHeat: () => void;
  toggleTrust: () => void;
  toggleSigs: () => void;
  togglePaths: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useSimStore = create<SimStore>((set, get) => ({
  grid: [], agents: [], triggers: [], signals: [],
  heatmap: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0)),
  tick: 0, running: false, speed: 200, scenario: "city", theme: "dark",
  selectedAgent: null,
  showHeat: false, showTrust: true, showSigs: true, showPaths: true,
  stormTicks: 0, conflicts: 0, exits: 0, llmCalls: 0,
  log: [], sharedMem: [],

  initSim: (sc) => {
    const g = buildGrid(sc);
    set({
      grid: g,
      agents: spawnAgents(g),
      signals: buildSignals(g),
      triggers: [],
      heatmap: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0)),
      tick: 0, conflicts: 0, exits: 0, llmCalls: 0,
      stormTicks: 0, log: [], sharedMem: [],
      selectedAgent: null, scenario: sc,
    });
  },

  tick1: () => {
    const s = get();
    const newTick = s.tick + 1;
    let { agents, triggers, signals, heatmap, conflicts, exits, llmCalls, stormTicks, log, sharedMem } = s;

    // Deep-clone mutable state
    agents = agents.map(a => ({ ...a, history: [...a.history] }));
    triggers = triggers.map(t => ({ ...t }));
    signals = signals.map(s2 => ({ ...s2 }));
    heatmap = heatmap.map(row => [...row]);
    log = [...log];
    sharedMem = [...sharedMem];

    // Storm countdown
    if (stormTicks > 0) stormTicks--;

    // Signal phase cycle
    signals.forEach(s2 => {
      s2.timer--;
      if (s2.timer <= 0) { s2.phase = (s2.phase + 1) % 3; s2.timer = 10 + Math.floor(Math.random() * 15); }
    });

    // Trigger decay
    triggers.forEach(t => { t.decay--; t.intensity -= 0.025; });
    // Cascade
    const newTr: TriggerState[] = [];
    triggers.filter(t => t.type === "congestion" && t.intensity > 0.7).forEach(t => {
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
        const nx = t.x + dx, ny = t.y + dy;
        if (nx >= 0 && ny >= 0 && nx < GRID_SIZE && ny < GRID_SIZE &&
            s.grid[ny]?.[nx] === 1 && !triggers.find(e => e.x === nx && e.y === ny) &&
            Math.random() < 0.12)
          newTr.push({ x: nx, y: ny, type: "congestion", intensity: 0.4, decay: 12 });
      });
    });
    const allTriggers = [...triggers.filter(t => t.decay > 0 && t.intensity > 0.05), ...newTr];

    // Move agents
    agents.forEach(a => {
      if (a.status !== "active") return;
      if (!a.path.length || a.pidx >= a.path.length - 1) {
        a.path = astar(s.grid, allTriggers, stormTicks > 0, a.gx, a.gy, a.ex, a.ey);
        a.pidx = 0;
        if (Math.random() < 0.07) {
          llmCalls++;
          a.llmUsed = true;
          const msgs = [
            `[LLM] Path delta <15%. GPT-4o queried. Trust: ${(a.trust * 100).toFixed(0)}%`,
            `[LLM] Rerouting via [${a.gx + 2},${a.gy}]. Cost optimized.`,
            `[LLM] Mentor hint accepted. Efficiency: ${(a.efficiency * 100).toFixed(0)}%`,
            `[LLM] Conflict detected. Backing off. Re-planning in 2t.`,
          ];
          a.reasoning = msgs[Math.floor(Math.random() * msgs.length)];
        }
      }
      if (a.path.length && a.pidx < a.path.length - 1) {
        const nxt = a.path[a.pidx + 1];
        const sig = signals.find(s2 => s2.x === nxt.x && s2.y === nxt.y && s2.phase === 0);
        if (!sig) {
          a.pidx++;
          const tgt = a.path[a.pidx];
          a.gx = tgt.x; a.gy = tgt.y;
          const spd = a.type === "scout" ? 0.45 : 0.28;
          const mult = a.type === "scout" ? 2 : 1;
          a.x += (tgt.x + 0.5 - a.x) * spd * mult;
          a.y += (tgt.y + 0.5 - a.y) * spd * mult;
          a.history.push({ x: a.x, y: a.y });
          if (a.history.length > 22) a.history.shift();
          heatmap[tgt.y][tgt.x] = Math.min(1, (heatmap[tgt.y][tgt.x] ?? 0) + 0.04);
          if (Math.random() < 0.015) {
            const type: TriggerType = Math.random() < 0.5 ? "congestion" : "slow";
            const ex2 = allTriggers.find(t => t.x === a.gx && t.y === a.gy);
            if (ex2) { ex2.intensity = Math.min(1, ex2.intensity + 0.2); }
            else { allTriggers.push({ x: a.gx, y: a.gy, type, intensity: 0.6 + Math.random() * 0.4, decay: 20 }); }
            log = [{ tick: newTick, type, msg: `${type.toUpperCase()} at [${a.gx},${a.gy}]` }, ...log.slice(0, 49)];
          }
          if (a.type === "scout" && Math.random() < 0.04) {
            sharedMem = [{ key: `scout_${a.id}`, val: `Region [${a.gx},${a.gy}] explored by Scout-${a.id}`, tick: newTick }, ...sharedMem.slice(0, 11)];
            log = [{ tick: newTick, type: "scout", msg: `Scout-${a.id}: [${a.gx},${a.gy}] clear` }, ...log.slice(0, 49)];
          }
        } else {
          a.reasoning = `[WAIT] Red signal at [${nxt.x},${nxt.y}]. Holding position.`;
          a.status = "waiting";
          setTimeout(() => { a.status = "active"; }, 200);
        }
      }
      if (a.gx === a.ex && a.gy === a.ey) {
        exits++;
        a.efficiency = Math.min(1, a.efficiency + 0.04);
        sharedMem = [{ key: `exit_${a.id}`, val: `Agent-${a.id} reached exit. Eff: ${(a.efficiency * 100).toFixed(0)}%`, tick: newTick }, ...sharedMem.slice(0, 11)];
        const rc2 = getRoadCells(s.grid);
        const ne = rc2[Math.floor(Math.random() * rc2.length)] ?? { x: 1, y: 0 };
        a.ex = ne.x; a.ey = ne.y; a.path = [];
      }
    });

    // Conflicts
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        if (Math.abs(agents[i].gx - agents[j].gx) < 1 && Math.abs(agents[i].gy - agents[j].gy) < 1) {
          conflicts++;
          agents[i].trust = Math.max(0.1, agents[i].trust - 0.04);
          agents[j].trust = Math.max(0.1, agents[j].trust - 0.04);
        }
      }
    }

    set({ tick: newTick, agents, triggers: allTriggers, signals, heatmap, conflicts, exits, llmCalls, stormTicks, log, sharedMem });
  },

  doStep: () => { get().tick1(); },
  doReset: () => { get().initSim(get().scenario); },
  setRunning: (v) => set({ running: v }),
  triggerStorm: () => {
    const s = get();
    const rc = getRoadCells(s.grid);
    const newTr: TriggerState[] = [];
    for (let i = 0; i < 7; i++) {
      const c = rc[Math.floor(Math.random() * rc.length)];
      if (c) newTr.push({ x: c.x, y: c.y, type: "congestion", intensity: 0.9, decay: 30 });
    }
    set({
      stormTicks: 80,
      triggers: [...s.triggers, ...newTr],
      log: [{ tick: s.tick, type: "storm", msg: "⚡ STORM: traversal cost ×4 for 80 ticks" }, ...s.log.slice(0, 49)],
    });
  },
  setScenario: (sc) => { set({ scenario: sc }); get().initSim(sc); },
  setTheme: (t) => set({ theme: t }),
  setSelectedAgent: (i) => set({ selectedAgent: i }),
  setSpeed: (ms) => set({ speed: ms }),
  toggleHeat: () => set(s => ({ showHeat: !s.showHeat })),
  toggleTrust: () => set(s => ({ showTrust: !s.showTrust })),
  toggleSigs: () => set(s => ({ showSigs: !s.showSigs })),
  togglePaths: () => set(s => ({ showPaths: !s.showPaths })),
}));
