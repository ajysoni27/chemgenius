import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const MOLS = [
  { x: "8%", y: "18%", s: 90, d: 0, kind: "hex" },
  { x: "82%", y: "12%", s: 120, d: 1.2, kind: "water" },
  { x: "70%", y: "68%", s: 100, d: 0.6, kind: "hex" },
  { x: "15%", y: "72%", s: 80, d: 2, kind: "water" },
  { x: "45%", y: "8%", s: 60, d: 1.6, kind: "tetra" },
  { x: "92%", y: "45%", s: 70, d: 0.3, kind: "tetra" },
] as const;

function Shape({ kind }: { kind: string }) {
  if (kind === "hex") {
    const pts = Array.from({ length: 6 }, (_, i) => [Math.round((50 + 32 * Math.cos((Math.PI / 3) * i)) * 100) / 100, Math.round((50 + 32 * Math.sin((Math.PI / 3) * i)) * 100) / 100]);
    return (
      <svg viewBox="0 0 100 100" className="size-full">
        <polygon points={pts.map((p) => p.join(",")).join(" ")} className="fill-none stroke-neon" strokeWidth="2" />
        <circle cx="50" cy="50" r="16" className="fill-none stroke-violet" strokeWidth="1.5" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="5" className="fill-neon" />)}
      </svg>
    );
  }
  if (kind === "water") {
    return (
      <svg viewBox="0 0 100 100" className="size-full">
        <line x1="50" y1="45" x2="22" y2="70" className="stroke-foreground/40" strokeWidth="4" />
        <line x1="50" y1="45" x2="78" y2="70" className="stroke-foreground/40" strokeWidth="4" />
        <circle cx="50" cy="45" r="18" className="fill-el-halogen" />
        <circle cx="22" cy="70" r="11" className="fill-foreground/80" />
        <circle cx="78" cy="70" r="11" className="fill-foreground/80" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="size-full">
      {[[50, 15], [18, 75], [82, 75], [50, 60]].map(([x, y], i) => (
        <g key={i}>
          <line x1="50" y1="48" x2={x} y2={y} className="stroke-violet/60" strokeWidth="3" />
          <circle cx={x} cy={y} r="8" className="fill-violet" />
        </g>
      ))}
      <circle cx="50" cy="48" r="12" className="fill-neon" />
    </svg>
  );
}

export function FloatingMolecules() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {MOLS.map((m, i) => (
        <motion.div
          key={i}
          className="absolute opacity-40 blur-[0.3px]"
          style={{ left: m.x, top: m.y, width: m.s, height: m.s }}
          animate={{ y: [0, -24, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 14 + i * 2, repeat: Infinity, ease: "easeInOut", delay: m.d }}
        >
          <Shape kind={m.kind} />
        </motion.div>
      ))}
    </div>
  );
}
