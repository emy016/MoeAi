"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";

/**
 * z = f(x, y), as a rotatable wireframe.
 *
 * No library and no WebGL: a 3D surface is a grid of points, an orthographic
 * projection is two dot products, and painter's algorithm is a sort. Which
 * means it runs anywhere, weighs nothing, and cannot fail to get a GL context
 * in the middle of a demo.
 *
 * The expression goes through lib/moeai/math, so the same whitelist that
 * guards the calculator guards this: no arbitrary code reaches eval.
 */
const SAMPLES = ["sin(x) * cos(y)", "x^2 - y^2", "sin(sqrt(x^2 + y^2))", "x * y / 4"];
const STEPS = 34;

export function SurfacePlot({ onAsk }: { onAsk: (text: string) => void }) {
  const [input, setInput] = useState("sin(x) * cos(y)");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [angle, setAngle] = useState({ yaw: -0.62, pitch: 0.52 });
  const grid = useRef<number[][] | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  async function build(source = input) {
    setBusy(true); setError("");
    try {
      const { expression } = await import("@/lib/moeai/math");
      const compiled = expression(source, ["x", "y"]).compile();
      const rows: number[][] = [];
      for (let i = 0; i <= STEPS; i++) {
        const row: number[] = [];
        for (let j = 0; j <= STEPS; j++) {
          const x = -5 + (10 * i) / STEPS, y = -5 + (10 * j) / STEPS;
          const z = compiled.evaluate({ x, y });
          row.push(typeof z === "number" && Number.isFinite(z) ? Math.max(-8, Math.min(8, z)) : NaN);
        }
        rows.push(row);
      }
      if (rows.every(row => row.every(Number.isNaN))) throw new Error("That surface has no real values in this window.");
      grid.current = rows;
      draw();
    } catch (e) {
      grid.current = null;
      setError(e instanceof Error ? e.message : "Check the expression. Use x and y.");
      draw();
    } finally { setBusy(false); }
  }

  function draw() {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = el.clientWidth || 320;
    el.width = size * dpr; el.height = size * dpr;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    const rows = grid.current;
    if (!rows) return;

    const { yaw, pitch } = angle;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = size / 15;
    const project = (x: number, y: number, z: number) => {
      const rx = x * cy - y * sy, ry = x * sy + y * cy;
      return {
        sx: size / 2 + rx * scale,
        sy: size / 2 + (ry * sp - z * cp) * scale * 0.82,
        depth: ry * cp + z * sp,
      };
    };

    // Draw far cells first so near ones cover them.
    const cells: { pts: { sx: number; sy: number }[]; depth: number; z: number }[] = [];
    for (let i = 0; i < STEPS; i++) for (let j = 0; j < STEPS; j++) {
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]] as [number, number][];
      const zs = corners.map(([a, b]) => rows[a][b]);
      if (zs.some(Number.isNaN)) continue;
      const pts = corners.map(([a, b]) => project(-5 + (10 * a) / STEPS, -5 + (10 * b) / STEPS, rows[a][b]));
      cells.push({ pts, depth: pts.reduce((s, p) => s + p.depth, 0) / 4, z: zs.reduce((s, v) => s + v, 0) / 4 });
    }
    cells.sort((a, b) => a.depth - b.depth);

    const accent = getComputedStyle(el).getPropertyValue("--mx-accent-rgb").trim() || "244,63,109";
    for (const cell of cells) {
      // Height drives the fill, so the shape is readable even head-on.
      const t = Math.max(0, Math.min(1, (cell.z + 4) / 8));
      ctx.beginPath();
      cell.pts.forEach((p, k) => (k ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
      ctx.closePath();
      ctx.fillStyle = `rgba(${accent}, ${0.08 + t * 0.42})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + t * 0.14})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  useEffect(() => { build(); /* first paint */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(draw, [angle]);
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <>
    <p className="mx-muted">Rotate it with a drag. The window is x, y ∈ [−5, 5] and z is clamped to ±8.</p>
    <label className="mx-field">z = f(x, y)
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") build(); }} maxLength={300}/>
    </label>
    <div className="mx-inline">
      <button className="mx-primary" onClick={() => build()} disabled={busy}>{busy ? "Building…" : "Plot surface"}</button>
      <button className="mx-icon" aria-label="Reset the view" onClick={() => setAngle({ yaw: -0.62, pitch: 0.52 })}><RotateCcw size={16}/></button>
    </div>
    {error && <p className="mx-error" role="alert">{error}</p>}
    <div className="mx-surface">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Three-dimensional surface of z equals ${input}`}
        onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture(e.pointerId); }}
        onPointerMove={e => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setAngle(a => ({ yaw: a.yaw + dx * 0.01, pitch: Math.max(-1.4, Math.min(1.4, a.pitch + dy * 0.01)) }));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      />
    </div>
    <div className="mx-tool-examples">
      <span className="mx-eyebrow">TRY A SURFACE</span>
      {SAMPLES.map(s => <button key={s} onClick={() => { setInput(s); build(s); }}>{s}<ArrowUpRight size={13}/></button>)}
    </div>
    <button className="mx-text-button" onClick={() => onAsk(`Explain the shape of the surface z = ${input}. What do the critical points mean, and where is it increasing?`)}>
      Explain this surface with Moe <ArrowUpRight size={14}/>
    </button>
  </>;
}
