// App.tsx — SWAMAZE Cybertech Simulation
// Stack: React 18 + TypeScript + p5.js + Tailwind CSS
// Run: npm install p5 @types/p5 zustand && npm run dev

import React, { useRef, useEffect, useCallback, useState } from "react";
import p5 from "p5";
import { useSimStore } from "./store/useSimStore";
import { AgentPanel } from "./components/AgentPanel";
import { RightPanel } from "./components/RightPanel";
import { TopBar } from "./components/TopBar";
import { StatusBar } from "./components/StatusBar";
import { TrainCursor } from "./components/TrainCursor";

const GRID_SIZE = 22;
const CELL = 30;

// ── Color palette from CyberTech reference ────────────────────────────────
export const C = {
  hotPink:  "#FF00AD",
  mint:     "#7EEBBC",
  navy:     "#03186F",
  purple:   "#8400C0",
  gold:     "#FFD700",
  orange:   "#FF6B35",
} as const;

export type AgentType = "nav" | "map" | "opt" | "scout" | "mentor";
export const AGENT_COLORS: Record<AgentType, string> = {
  nav:    C.hotPink,
  map:    C.mint,
  opt:    C.purple,
  scout:  C.gold,
  mentor: C.orange,
};

export default function App() {
  const canvasParent = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const {
    grid, agents, triggers, signals, heatmap,
    showHeat, showTrust, showSigs, showPaths,
    selectedAgent, theme,
    tick, running,
    setRunning, doStep, doReset, triggerStorm, setSelectedAgent,
    initSim,
  } = useSimStore();

  const isDark = theme === "dark";

  // ── p5 sketch ──────────────────────────────────────────────────────────
  const buildSketch = useCallback((p: p5) => {
    p.setup = () => {
      const parent = canvasParent.current!;
      p.createCanvas(parent.clientWidth, parent.clientHeight).parent(parent);
      p.noLoop();
    };

    p.draw = () => {
      const W = p.width, H = p.height;
      const ox = (W - GRID_SIZE * CELL) / 2;
      const oy = (H - GRID_SIZE * CELL) / 2;
      const store = useSimStore.getState();

      p.clear();
      p.background(isDark ? "#010820" : "#E8E0FF");

      // Grid dots
      for (let y = 0; y <= GRID_SIZE; y++) {
        for (let x = 0; x <= GRID_SIZE; x++) {
          p.noStroke();
          p.fill(isDark ? "rgba(126,235,188,0.1)" : "rgba(132,0,192,0.1)");
          p.circle(ox + x * CELL, oy + y * CELL, 2);
        }
      }

      // Heatmap layer
      if (store.showHeat) {
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const v = store.heatmap[y]?.[x] ?? 0;
            if (v < 0.02) continue;
            p.noStroke();
            p.fill(Math.round(v * 255), 0, Math.round((1 - v) * 200), Math.round(v * 130));
            p.rect(ox + x * CELL, oy + y * CELL, CELL, CELL);
          }
        }
      }

      // Roads
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (!store.grid[y]?.[x]) continue;
          const px = ox + x * CELL, py = oy + y * CELL;
          p.noStroke();
          p.fill(isDark ? "rgba(126,235,188,0.06)" : "rgba(3,24,111,0.05)");
          p.rect(px, py, CELL, CELL);

          const hasR = x + 1 < GRID_SIZE && store.grid[y]?.[x + 1] === 1;
          const hasD = y + 1 < GRID_SIZE && store.grid[y + 1]?.[x] === 1;

          p.stroke(isDark ? "rgba(255,0,173,0.22)" : "rgba(3,24,111,0.18)");
          p.strokeWeight(1);
          p.drawingContext.setLineDash([]);
          if (hasR) p.line(px + CELL / 2, py + CELL / 2, px + CELL + CELL / 2, py + CELL / 2);
          if (hasD) p.line(px + CELL / 2, py + CELL / 2, px + CELL / 2, py + CELL + CELL / 2);

          p.stroke(isDark ? "rgba(255,0,173,0.09)" : "rgba(3,24,111,0.07)");
          p.strokeWeight(0.5);
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([3, 6]);
          if (hasR) p.line(px + 4, py + CELL / 2, px + CELL - 4, py + CELL / 2);
          if (hasD) p.line(px + CELL / 2, py + 4, px + CELL / 2, py + CELL - 4);
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([]);
        }
      }

      // Triggers
      store.triggers.forEach((t) => {
        const px = ox + t.x * CELL, py = oy + t.y * CELL;
        const alpha = Math.round(t.intensity * 110);
        p.noStroke();
        if (t.type === "congestion") p.fill(255, 0, 173, alpha);
        else p.fill(255, 215, 0, alpha);
        p.rect(px, py, CELL, CELL, 4);
        p.noFill();
        if (t.type === "congestion") p.stroke(255, 0, 173, Math.round(alpha * 0.5));
        else p.stroke(255, 215, 0, Math.round(alpha * 0.5));
        p.strokeWeight(1);
        p.rect(px + 2, py + 2, CELL - 4, CELL - 4, 3);
      });

      // Signals
      if (store.showSigs) {
        store.signals.forEach((s) => {
          const px = ox + s.x * CELL + CELL - 9;
          const py = oy + s.y * CELL + 2;
          p.noStroke();
          p.fill(isDark ? "#1E0A3C" : "#C8C0E8");
          p.rect(px - 1, py - 1, 10, 10, 2);
          const sigColors: [number, number, number][] = [[255,0,100],[255,200,0],[0,200,120]];
          const [r, g, b] = sigColors[s.phase];
          p.fill(r, g, b); p.circle(px + 4, py + 4, 6);
          p.fill(r, g, b, 55); p.circle(px + 4, py + 4, 10);
        });
      }

      // Agent trails
      if (store.showPaths) {
        store.agents.forEach((a) => {
          if (a.history.length < 2) return;
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([2, 5]);
          for (let i = 1; i < a.history.length; i++) {
            const alpha = Math.round((i / a.history.length) * 75);
            const col = p.color(a.color);
            col.setAlpha(alpha);
            p.stroke(col);
            p.strokeWeight(1);
            p.line(
              ox + a.history[i - 1].x * CELL, oy + a.history[i - 1].y * CELL,
              ox + a.history[i].x * CELL, oy + a.history[i].y * CELL
            );
          }
          (p.drawingContext as CanvasRenderingContext2D).setLineDash([]);
        });
      }

      // Trust edges
      if (store.showTrust) {
        (p.drawingContext as CanvasRenderingContext2D).setLineDash([]);
        store.agents.forEach((a, i) => {
          store.agents.forEach((b, j) => {
            if (j <= i) return;
            const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
            if (d > 7) return;
            const alpha = Math.round(Math.min(a.trust, b.trust) * 55);
            p.stroke(126, 235, 188, alpha);
            p.strokeWeight(0.5);
            p.line(ox + a.x * CELL, oy + a.y * CELL, ox + b.x * CELL, oy + b.y * CELL);
          });
        });
      }

      // Exit markers
      store.agents.forEach((a) => {
        const px = ox + (a.ex + 0.5) * CELL, py = oy + (a.ey + 0.5) * CELL;
        const col = p.color(a.color); col.setAlpha(70);
        p.noFill(); p.stroke(col); p.strokeWeight(1);
        p.square(px - 5, py - 5, 10, 2);
      });

      // Agents
      store.agents.forEach((a, i) => {
        const px = ox + a.x * CELL, py = oy + a.y * CELL;
        const r = a.type === "opt" ? 11 : 9;
        p.noStroke();
        const aura = p.color(a.color); aura.setAlpha(32);
        p.fill(aura); p.circle(px, py, r * 2.8);
        p.fill(a.color); p.circle(px, py, r * 2);
        if (store.selectedAgent === i) {
          p.noFill(); p.stroke(a.color); p.strokeWeight(1.5);
          p.circle(px, py, r * 2 + 7);
        }
        p.noStroke();
        p.fill(isDark ? 255 : 0);
        p.textSize(5.5); p.textAlign(p.CENTER, p.CENTER);
        p.textStyle(p.BOLD);
        p.text(a.type.toUpperCase().slice(0, 3), px, py);
      });

      // CRT scan line
      if (isDark) {
        const scanY = (store.tick * 2) % H;
        p.stroke(126, 235, 188, 7); p.strokeWeight(1);
        p.line(0, scanY, W, scanY);
      }
    };

    p.windowResized = () => {
      const parent = canvasParent.current;
      if (parent) { p.resizeCanvas(parent.clientWidth, parent.clientHeight); p.redraw(); }
    };
  }, [isDark]);

  useEffect(() => {
    initSim("city");
    if (canvasParent.current) {
      p5Ref.current = new p5(buildSketch);
    }
    const raf = setInterval(() => { p5Ref.current?.redraw(); }, 16);
    return () => { clearInterval(raf); p5Ref.current?.remove(); };
  }, []);

  useEffect(() => {
    p5Ref.current?.redraw();
  }, [tick, showHeat, showTrust, showSigs, showPaths, selectedAgent, theme]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!p5Ref.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const W = p5Ref.current.width, H = p5Ref.current.height;
    const ox = (W - GRID_SIZE * CELL) / 2, oy = (H - GRID_SIZE * CELL) / 2;
    const gx = Math.floor((cx - ox) / CELL), gy = Math.floor((cy - oy) / CELL);
    const hit = agents.findIndex(a => a.gx === gx && a.gy === gy);
    if (hit >= 0) setSelectedAgent(hit);
  };

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ cursor: "none", background: isDark ? "#010820" : "#E8E0FF" }}>
      <TrainCursor />
      <div className="grid h-full" style={{ gridTemplateColumns: "220px 1fr 252px", gridTemplateRows: "52px 1fr 32px" }}>
        <TopBar />
        <AgentPanel />
        {/* CENTER CANVAS */}
        <div id="center" className="relative overflow-hidden" onClick={handleCanvasClick}>
          <div ref={canvasParent} className="absolute inset-0" />
          {/* Storm badge */}
          <div
            className="absolute top-2.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[9px] tracking-widest border backdrop-blur-sm"
            style={{
              display: useSimStore.getState().stormTicks > 0 ? "block" : "none",
              color: C.hotPink, borderColor: C.hotPink,
              background: "rgba(255,0,173,0.1)",
            }}
          >⚡ STORM ACTIVE</div>
          {/* Legend */}
          <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 flex-wrap">
            {(Object.entries(AGENT_COLORS) as [AgentType, string][]).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10" style={{ background: "rgba(3,8,32,.75)", color: "#4A6A99" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {type.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
        <RightPanel />
        <StatusBar />
      </div>
    </div>
  );
}
