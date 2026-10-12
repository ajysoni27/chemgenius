import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Maximize2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { atomColor, buildMolecule, covRadius, describe, dist, type V3 } from "@/lib/geometry";
import { subscript } from "@/lib/chem";

type View = "2d" | "3d";
type Style = "ball" | "fill";

export function MoleculeCanvas({ formula, label, height = 260 }: { formula: string; label?: string; height?: number }) {
  const mol = useMemo(() => buildMolecule(formula), [formula]);
  const info = useMemo(() => describe(mol), [mol]);
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>("3d");
  const [style, setStyle] = useState<Style>("ball");
  const [spin, setSpin] = useState(true);
  const [showLen, setShowLen] = useState(false);
  const rot = useRef({ yaw: 0.5, pitch: 0.35, zoom: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (view === "2d") rot.current = { ...rot.current, yaw: 0, pitch: 0 };
  }, [view]);

  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const maxR = Math.max(1.5, ...mol.atoms.map((a) => Math.hypot(...a.p) + covRadius(a.el)));

    const draw = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      if (spin && view === "3d" && !drag.current) rot.current.yaw += dt * 0.6;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { yaw, pitch, zoom } = rot.current;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const S = (Math.min(w, h) * 0.42 * zoom) / maxR;
      const F = maxR * 4;
      const proj = (p: V3) => {
        const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
        const y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
        const k = view === "3d" ? F / (F + z2) : 1;
        return { x: w / 2 + x1 * S * k, y: h / 2 - y2 * S * k, z: z2, k };
      };
      const P = mol.atoms.map((a) => proj(a.p));
      const rad = (el: string, k: number) => (style === "fill" ? covRadius(el) * 1.15 : 0.18 + covRadius(el) * 0.28) * S * k;

      // bonds
      if (style === "ball") {
        const order = [...mol.bonds].sort((a, b) => P[a.a].z + P[a.b].z - (P[b.a].z + P[b.b].z));
        for (const b of order.reverse()) {
          const A = P[b.a], B = P[b.b];
          const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L, ny = dx / L;
          const n = Math.max(1, b.order);
          const gap = 3.2;
          ctx.lineCap = "round";
          ctx.setLineDash(b.order === 0 ? [4, 5] : []);
          for (let i = 0; i < n; i++) {
            const o = (i - (n - 1) / 2) * gap;
            const mx = (A.x + B.x) / 2 + nx * o, my = (A.y + B.y) / 2 + ny * o;
            ctx.lineWidth = b.order === 0 ? 1.4 : n > 1 ? 2.2 : 4;
            ctx.strokeStyle = b.order === 0 ? "rgba(148,163,184,.6)" : atomColor(mol.atoms[b.a].el);
            ctx.beginPath(); ctx.moveTo(A.x + nx * o, A.y + ny * o); ctx.lineTo(mx, my); ctx.stroke();
            ctx.strokeStyle = b.order === 0 ? "rgba(148,163,184,.6)" : atomColor(mol.atoms[b.b].el);
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(B.x + nx * o, B.y + ny * o); ctx.stroke();
          }
          ctx.setLineDash([]);
          if (showLen && b.order > 0) {
            ctx.font = "10px ui-monospace, monospace";
            ctx.fillStyle = "#7dd3fc";
            ctx.fillText(`${dist(mol.atoms[b.a].p, mol.atoms[b.b].p).toFixed(2)}Å`, (A.x + B.x) / 2 + nx * 8, (A.y + B.y) / 2 + ny * 8);
          }
        }
      }
      // atoms back-to-front
      const idx = mol.atoms.map((_, i) => i).sort((a, b) => P[b].z - P[a].z);
      for (const i of idx) {
        const a = mol.atoms[i], p = P[i], r = rad(a.el, p.k), col = atomColor(a.el);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (view === "3d") {
          const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
          g.addColorStop(0, "#ffffff");
          g.addColorStop(0.25, col);
          g.addColorStop(1, shade(col));
          ctx.fillStyle = g;
        } else ctx.fillStyle = col;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = a.el === "C" ? "#6b7280" : "rgba(0,0,0,.35)";
        ctx.stroke();
        if (r > 7) {
          ctx.font = `600 ${Math.min(14, r * 0.8)}px ui-sans-serif, system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = lum(col) > 0.6 ? "#111827" : "#f8fafc";
          ctx.fillText(a.el, p.x, p.y + 0.5);
          ctx.textAlign = "start";
          ctx.textBaseline = "alphabetic";
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mol, view, style, spin, showLen]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    rot.current.yaw += (e.clientX - drag.current.x) * 0.01;
    rot.current.pitch += (e.clientY - drag.current.y) * 0.01;
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onWheel = (e: React.WheelEvent) => {
    rot.current.zoom = Math.min(4, Math.max(0.3, rot.current.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
  };

  function exportPng() {
    const c = cvs.current!;
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const x = out.getContext("2d")!;
    x.fillStyle = "#0a0e1f";
    x.fillRect(0, 0, out.width, out.height);
    x.drawImage(c, 0, 0);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = `${formula.replace(/[^\w]/g, "_")}.png`;
    a.click();
  }

  const seg = (on: boolean) => (on ? "neon" : "glass") as "neon" | "glass";

  return (
    <div ref={wrap} className="glass flex flex-col overflow-hidden rounded-2xl bg-background">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{subscript(formula)}</p>
          {label && <p className="text-xs text-muted-foreground">{label}</p>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="glass" className="size-8" onClick={exportPng} aria-label="Export PNG"><Download className="size-4" /></Button>
          <Button size="icon" variant="glass" className="size-8" aria-label="Fullscreen 3D" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen())}><Maximize2 className="size-4" /></Button>
        </div>
      </div>
      <canvas
        ref={cvs}
        className="w-full flex-1 cursor-grab touch-none active:cursor-grabbing"
        style={{ height, minHeight: height }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onWheel={onWheel}
      />
      <div className="flex flex-wrap gap-1 px-3">
        <Button size="sm" variant={seg(view === "2d")} className="h-7 px-2 text-xs" onClick={() => setView("2d")}>2D</Button>
        <Button size="sm" variant={seg(view === "3d")} className="h-7 px-2 text-xs" onClick={() => setView("3d")}>3D</Button>
        <Button size="sm" variant={seg(style === "ball")} className="h-7 px-2 text-xs" onClick={() => setStyle("ball")}>Ball&Stick</Button>
        <Button size="sm" variant={seg(style === "fill")} className="h-7 px-2 text-xs" onClick={() => setStyle("fill")}>Space-fill</Button>
        <Button size="sm" variant={seg(showLen)} className="h-7 px-2 text-xs" onClick={() => setShowLen(!showLen)}>Å</Button>
        <Button size="sm" variant={seg(spin)} className="h-7 px-2 text-xs" onClick={() => setSpin(!spin)} aria-label="Toggle rotation"><RotateCw className="size-3" /></Button>
      </div>
      <div className="space-y-0.5 px-4 py-3 text-xs text-muted-foreground">
        <p><span className="text-foreground">Geometry:</span> {mol.geometry}</p>
        {info.bonds.length > 0 && <p><span className="text-foreground">Bonds:</span> {info.bonds.map((b) => `${b.label} ${b.length.toFixed(2)} Å`).join(" · ")}</p>}
        {info.angle && <p><span className="text-foreground">Angle:</span> {info.angle.label} {info.angle.deg.toFixed(1)}°</p>}
      </div>
    </div>
  );
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(c: string) {
  const [r, g, b] = hex(c);
  return `rgb(${r * 0.35},${g * 0.35},${b * 0.35})`;
}
function lum(c: string) {
  const [r, g, b] = hex(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
