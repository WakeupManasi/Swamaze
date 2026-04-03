// components/TopBar.tsx
import React from "react";
import { useSimStore, Scenario } from "../store/useSimStore";

const C = { hotPink: "#FF00AD", mint: "#7EEBBC", navy: "#03186F", purple: "#8400C0" };

export function TopBar() {
  const { tick, running, stormTicks, scenario, theme, speed,
    setRunning, doStep, doReset, triggerStorm, setScenario, setTheme, tick1 } = useSimStore();

  const isDark = theme === "dark";
  const bg = isDark ? "#030E3A" : "#F0EBFF";
  const border = isDark ? "rgba(255,0,173,0.3)" : "rgba(3,24,111,0.2)";
  const text = isDark ? "#E8F4FF" : "#03186F";

  const scenarios: { id: Scenario; label: string }[] = [
    { id: "city", label: "DENSE CITY" },
    { id: "sparse", label: "SPARSE GRID" },
    { id: "deadend", label: "DEAD-END" },
  ];

  const handleRun = () => {
    if (!running) {
      setRunning(true);
      const iv = setInterval(() => {
        if (!useSimStore.getState().running) { clearInterval(iv); return; }
        useSimStore.getState().tick1();
      }, useSimStore.getState().speed);
    } else {
      setRunning(false);
    }
  };

  const btnStyle = (active: boolean, col: string): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 5, fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, letterSpacing: "0.05em", border: `1px solid ${col}`,
    color: active ? "#fff" : col, background: active ? col : "transparent", cursor: "none",
    transition: "all 0.2s", boxShadow: active ? `0 0 10px ${col}88` : "none",
  });

  return (
    <div style={{ gridColumn: "1/-1", background: bg, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", position: "relative", overflow: "hidden" }}>
      {/* Animated bottom border */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.hotPink},${C.mint},${C.purple},transparent)`, animation: "scanbar 3s linear infinite" }} />
      <style>{`@keyframes scanbar{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "0.12em", color: C.hotPink, textShadow: `0 0 12px ${C.hotPink}88` }}>
        SWA<span style={{ color: C.mint, textShadow: `0 0 12px ${C.mint}88` }}>MAZE</span>
      </div>

      {/* Scenario pills */}
      <div style={{ display: "flex", gap: 5 }}>
        {scenarios.map(sc => (
          <button key={sc.id} onClick={() => setScenario(sc.id)} style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 9, letterSpacing: "0.06em",
            border: `1px solid ${sc.id === scenario ? C.mint : "rgba(126,235,188,0.25)"}`,
            color: sc.id === scenario ? C.navy : C.mint,
            background: sc.id === scenario ? C.mint : "transparent",
            cursor: "none", transition: "all 0.2s",
            boxShadow: sc.id === scenario ? `0 0 8px ${C.mint}66` : "none",
          }}>{sc.label}</button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ fontSize: 10, color: isDark ? "#8BA8CC" : "#5533AA", border: `1px solid ${border}`, padding: "3px 10px", borderRadius: 4, letterSpacing: "0.08em" }}>
          TICK <span style={{ color: C.hotPink, fontWeight: 700 }}>{String(tick).padStart(4, "0")}</span>
        </div>
        <button style={btnStyle(running, C.hotPink)} onClick={handleRun}>{running ? "⏸ PAUSE" : "▶ RUN"}</button>
        <button style={btnStyle(false, C.mint)} onClick={doStep}>⏭ STEP</button>
        <button style={btnStyle(stormTicks > 0, C.purple)} onClick={triggerStorm}>⚡ STORM</button>
        <button style={btnStyle(false, C.hotPink)} onClick={doReset}>↺ RESET</button>
      </div>

      <button onClick={() => setTheme(isDark ? "light" : "dark")} style={{
        width: 32, height: 32, borderRadius: "50%", border: `1px solid rgba(126,235,188,0.3)`,
        background: "transparent", color: C.mint, fontSize: 14, cursor: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{isDark ? "🌙" : "☀️"}</button>
    </div>
  );
}

// ── AgentPanel ─────────────────────────────────────────────────────────────
export function AgentPanel() {
  const { agents, selectedAgent, showHeat, showTrust, showSigs, showPaths, speed,
    setSelectedAgent, toggleHeat, toggleTrust, toggleSigs, togglePaths, setSpeed, theme } = useSimStore();
  const isDark = theme === "dark";
  const bg = isDark ? "#030E3A" : "#F0EBFF";
  const surf = isDark ? "#050F2E" : "#fff";
  const border = isDark ? "rgba(255,0,173,0.2)" : "rgba(3,24,111,0.15)";
  const text2 = isDark ? "#8BA8CC" : "#5533AA";
  const text3 = isDark ? "#4A6A99" : "#8855CC";

  const typeColors: Record<string, string> = { nav: "#FF00AD", map: "#7EEBBC", opt: "#8400C0", scout: "#FFD700", mentor: "#FF6B35" };

  const Toggle = ({ label, on, cb, swId }: { label: string; on: boolean; cb: () => void; swId: string }) => (
    <div onClick={cb} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "none" }}>
      <div style={{ width: 26, height: 13, borderRadius: 7, border: `1px solid rgba(255,0,173,0.3)`, position: "relative", background: on ? "linear-gradient(90deg,#8400C0,#FF00AD)" : "rgba(255,255,255,0.08)", transition: "background 0.3s", flexShrink: 0 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff", position: "absolute", top: 1, left: on ? 14 : 1, transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 9, color: text2 }}>{label}</span>
    </div>
  );

  return (
    <div style={{ background: bg, borderRight: `1px solid rgba(255,0,173,0.25)`, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionTitle label="Agents" color="#FF00AD" />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {agents.map((a, i) => (
          <div key={a.id} onClick={() => setSelectedAgent(i)} style={{
            padding: "8px 10px", borderRadius: 8, border: `1px solid ${selectedAgent === i ? "#FF00AD" : border}`,
            background: surf, cursor: "none", transition: "all 0.2s", position: "relative", overflow: "hidden",
            boxShadow: selectedAgent === i ? "0 0 12px rgba(255,0,173,0.3)" : "none",
          }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: typeColors[a.type] ?? "#fff" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, paddingLeft: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, boxShadow: `0 0 6px ${a.color}88`, flexShrink: 0 }} />
              <div style={{ fontSize: 10, fontWeight: 600, flex: 1, letterSpacing: "0.04em", color: isDark ? "#E8F4FF" : "#03186F" }}>{a.type.toUpperCase()}-{String(a.id).padStart(2, "0")}</div>
              {a.llmUsed && <div style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(255,0,173,0.12)", color: "#FF00AD", border: "1px solid rgba(255,0,173,0.3)" }}>LLM</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, paddingLeft: 4 }}>
              <div style={{ fontSize: 8, color: text3 }}>POS <span style={{ color: text2 }}>[{a.gx},{a.gy}]</span></div>
              <div style={{ fontSize: 8, color: text3 }}>EFF <span style={{ color: text2 }}>{(a.efficiency * 100).toFixed(0)}%</span></div>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, marginTop: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${a.trust * 100}%`, background: "linear-gradient(90deg,#8400C0,#7EEBBC)", borderRadius: 1, transition: "width 0.6s" }} />
            </div>
          </div>
        ))}
      </div>

      <SectionTitle label="Speed" color="#FF00AD" />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {[{ ms: 500, label: "0.5×" }, { ms: 200, label: "1×" }, { ms: 100, label: "2×" }, { ms: 50, label: "4×" }].map(({ ms, label }) => (
          <button key={ms} onClick={() => setSpeed(ms)} style={{
            padding: "3px 8px", borderRadius: 4, fontSize: 9,
            border: `1px solid ${speed === ms ? "#7EEBBC" : "rgba(126,235,188,0.3)"}`,
            color: speed === ms ? C.navy : "#7EEBBC",
            background: speed === ms ? "#7EEBBC" : "transparent",
            cursor: "none", transition: "all 0.2s",
            boxShadow: speed === ms ? "0 0 8px rgba(126,235,188,0.5)" : "none",
          }} where C={{ navy: "#03186F" }}>{label}</button>
        ))}
      </div>

      <SectionTitle label="Overlays" color="#FF00AD" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Toggle label="Heatmap" on={showHeat} cb={toggleHeat} swId="heat" />
        <Toggle label="Trust Network" on={showTrust} cb={toggleTrust} swId="trust" />
        <Toggle label="Signals" on={showSigs} cb={toggleSigs} swId="sigs" />
        <Toggle label="Agent Trails" on={showPaths} cb={togglePaths} swId="paths" />
      </div>
    </div>
  );
}

const C = { navy: "#03186F" };

function SectionTitle({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: "0.15em", color, fontWeight: 600, textTransform: "uppercase" as const, paddingBottom: 4, borderBottom: `1px solid ${color}44` }}>
      {label}
    </div>
  );
}

// ── RightPanel ─────────────────────────────────────────────────────────────
export function RightPanel() {
  const { agents, selectedAgent, tick, conflicts, exits, llmCalls, log, sharedMem, theme } = useSimStore();
  const isDark = theme === "dark";
  const bg = isDark ? "#030E3A" : "#F0EBFF";
  const surf = isDark ? "#050F2E" : "#fff";
  const border = isDark ? "rgba(126,235,188,0.2)" : "rgba(3,24,111,0.15)";
  const text2 = isDark ? "#8BA8CC" : "#5533AA";
  const text3 = isDark ? "#4A6A99" : "#8855CC";

  const avgEff = agents.length ? (agents.reduce((s, a) => s + a.efficiency, 0) / agents.length * 100).toFixed(0) + "%" : "--%";
  const llmPct = tick > 0 ? (llmCalls / tick * 100).toFixed(1) + "%" : "0%";
  const sel = selectedAgent !== null ? agents[selectedAgent] : null;

  const logColors: Record<string, string> = { congestion: "#FF00AD", slow: "#FFD700", scout: "#7EEBBC", storm: "#8400C0" };

  return (
    <div style={{ background: bg, borderLeft: `1px solid rgba(126,235,188,0.25)`, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionTitle label="Agent Reasoning" color="#7EEBBC" />
      <div style={{ padding: "9px 10px", borderRadius: 7, border: `1px solid ${border}`, background: surf, fontSize: 9, color: "#7EEBBC", lineHeight: 1.8, minHeight: 72, maxHeight: 110, overflowY: "auto", whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>
        {sel ? `[${sel.type.toUpperCase()}-${sel.id}]\n${sel.reasoning}` : "Select an agent to view live LLM reasoning and A* decisions..."}
      </div>

      <SectionTitle label="Live Metrics" color="#7EEBBC" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { val: avgEff, label: "AVG EFFICIENCY", color: "#FF00AD" },
          { val: String(exits), label: "EXITS REACHED", color: "#7EEBBC" },
          { val: llmPct, label: "LLM INVOKES", color: "#CC88FF" },
          { val: String(conflicts), label: "CONFLICTS", color: "#FF00AD" },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ padding: "9px 10px", borderRadius: 7, background: surf, border: `1px solid rgba(255,0,173,0.2)` }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 700, color, textShadow: `0 0 10px ${color}88` }}>{val}</div>
            <div style={{ fontSize: 8, color: text3, marginTop: 2, letterSpacing: "0.05em" }}>{label}</div>
          </div>
        ))}
      </div>

      <SectionTitle label="Trigger Log" color="#7EEBBC" />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 150, overflowY: "auto" }}>
        {log.slice(0, 30).map((entry, i) => (
          <div key={i} style={{ display: "flex", gap: 7, fontSize: 8, padding: "4px 7px", borderRadius: 4, borderLeft: `2px solid ${logColors[entry.type] ?? "#7EEBBC"}`, background: `${logColors[entry.type] ?? "#7EEBBC"}11` }}>
            <span style={{ color: text3, flexShrink: 0, minWidth: 28 }}>T{entry.tick}</span>
            <span style={{ color: text2 }}>{entry.msg}</span>
          </div>
        ))}
        {log.length === 0 && <div style={{ fontSize: 8, color: text3 }}>Trigger events will appear here...</div>}
      </div>

      <SectionTitle label="Shared Memory" color="#7EEBBC" />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 100, overflowY: "auto" }}>
        {sharedMem.slice(0, 6).map((m, i) => (
          <div key={i} style={{ fontSize: 8, padding: "3px 6px", borderRadius: 3, background: "rgba(132,0,192,0.1)", border: "1px solid rgba(132,0,192,0.25)", color: text2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            <span style={{ color: "#CC88FF" }}>T{m.tick}</span> {m.val}
          </div>
        ))}
        {sharedMem.length === 0 && <div style={{ fontSize: 8, color: text3 }}>Shared memory writes will appear here...</div>}
      </div>
    </div>
  );
}

// ── StatusBar ──────────────────────────────────────────────────────────────
export function StatusBar() {
  const { agents, triggers, signals, theme } = useSimStore();
  const isDark = theme === "dark";
  const bg = isDark ? "#030E3A" : "#F0EBFF";
  const border = isDark ? "rgba(255,0,173,0.25)" : "rgba(3,24,111,0.15)";
  const text3 = isDark ? "#4A6A99" : "#8855CC";

  return (
    <div style={{ gridColumn: "1/-1", background: bg, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 14, padding: "0 14px", fontSize: 8, color: text3, letterSpacing: "0.05em" }}>
      <style>{`@keyframes sb-pulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#7EEBBC", animation: "sb-pulse 1.8s infinite" }} />ENGINE ONLINE
      </div>
      <div>AGENTS: <span style={{ color: "#7EEBBC" }}>{agents.length}</span></div>
      <div>TRIGGERS: <span style={{ color: "#FF00AD" }}>{triggers.length}</span></div>
      <div>SIGNALS: <span style={{ color: "#CC88FF" }}>{signals.length}</span></div>
      <div style={{ flex: 1 }} />
      <div style={{ color: text3 }}>SWAMAZE v1.0 — CYBERTECH MULTI-AGENT TRAFFIC SIMULATION</div>
    </div>
  );
}

// ── TrainCursor ────────────────────────────────────────────────────────────
export function TrainCursor() {
  const [pos, setPos] = React.useState({ x: -100, y: -100 });
  const [angle, setAngle] = React.useState(0);
  const lastPos = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) setAngle(Math.atan2(dy, dx) * 180 / Math.PI);
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, transform: `translate(-50%,-50%) rotate(${angle}deg)`, pointerEvents: "none", zIndex: 9999 }}>
      <style>{`@keyframes puff{0%{opacity:.4;transform:scale(1)}100%{opacity:0;transform:scale(2) translateY(-5px)}}`}</style>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7EEBBC", opacity: 0.4, marginRight: 2, animation: "puff 1s infinite" }} />
        <div style={{ width: 3, height: 1.5, background: "#4A6A99" }} />
        <div style={{ width: 16, height: 9, borderRadius: "2px 5px 5px 2px", border: "1.5px solid #7EEBBC", background: "#030E3A", position: "relative" }}>
          <div style={{ position: "absolute", bottom: -3, left: 3, width: 3, height: 3, borderRadius: "50%", background: "#4A6A99" }} />
        </div>
        <div style={{ width: 3, height: 1.5, background: "#4A6A99" }} />
        <div style={{ width: 20, height: 9, borderRadius: "2px 7px 7px 2px", background: "#FF00AD", border: "1.5px solid #FF00AD", position: "relative", boxShadow: "0 0 8px rgba(255,0,173,0.6)" }}>
          <div style={{ position: "absolute", top: 1, right: 2, width: 4, height: 4, background: "#fff", borderRadius: "50%", opacity: 0.85 }} />
          <div style={{ position: "absolute", bottom: -3, left: 3, width: 3, height: 3, borderRadius: "50%", background: "#4A6A99" }} />
        </div>
      </div>
    </div>
  );
}
