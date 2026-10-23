import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHEM, CHEM_BY_SYMBOL, phaseAt, PHASE_STYLE } from "@/lib/chemdata";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Comparison Lab — SmartChemVision" },
      { name: "description", content: "Compare any 3 of the 118 elements: mass, melting and boiling points, density, state and pH tendency." },
      { property: "og:title", content: "Comparison Lab — SmartChemVision" },
      { property: "og:description", content: "Side-by-side element comparison with charts and a live temperature state slider." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComparePage,
});

const fmt = (v: number | null | undefined, u = "") => (v == null ? "—" : `${v}${u}`);

function ComparePage() {
  const [syms, setSyms] = useState(["Fe", "Hg", "O"]);
  const [temp, setTemp] = useState(25);
  const els = syms.map((s) => CHEM_BY_SYMBOL[s]);
  const rows: [string, (e: (typeof els)[number]) => string][] = [
    ["Molar Mass", (e) => fmt(+e.molarMass.toFixed(3), " g/mol")],
    ["Atomic Mass", (e) => fmt(+e.atomicMass.toFixed(3), " u")],
    ["Melting °C", (e) => fmt(e.meltingPointC)],
    ["Boiling °C", (e) => fmt(e.boilingPointC)],
    ["Density", (e) => fmt(e.density, " g/cm³")],
    ["State at STP", (e) => e.stateAtSTP],
    ["pH Tendency", (e) => e.pH_Tendency],
    ["State Change", (e) => e.stateChangeInfo],
  ];
  const chart = els.map((e) => ({ name: e.symbol, Melting: e.meltingPointC ?? 0, Boiling: e.boilingPointC ?? 0 }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Compare</p>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Comparison <span className="text-gradient">Lab</span></h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {syms.map((s, i) => (
          <select
            key={i}
            value={s}
            onChange={(ev) => setSyms(syms.map((x, j) => (j === i ? ev.target.value : x)))}
            className="glass rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            {CHEM.map((e) => (
              <option key={e.symbol} value={e.symbol}>{e.atomicNumber}. {e.name} ({e.symbol})</option>
            ))}
          </select>
        ))}
      </div>

      <div className="glass mt-6 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left text-muted-foreground">Property</th>
              {els.map((e, i) => <th key={i} className="p-3 text-left font-display text-lg">{e.name} <span className="text-neon">{e.symbol}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, f]) => (
              <tr key={k} className="border-b border-border/40">
                <td className="p-3 text-muted-foreground">{k}</td>
                {els.map((e, i) => <td key={i} className="p-3 capitalize">{f(e)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass mt-6 rounded-2xl p-4">
        <h2 className="mb-3 font-display text-xl font-bold">Melting vs Boiling (°C)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="Melting" fill="var(--neon)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Boiling" fill="var(--violet)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Temperature state</h2>
          <span className="font-mono text-2xl text-neon">{temp}°C</span>
        </div>
        <Slider min={-273} max={3500} step={1} value={[temp]} onValueChange={(v) => setTemp(v[0])} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {els.map((e, i) => {
            const p = phaseAt(e, temp);
            return (
              <div key={i} className="rounded-xl border border-border p-4 text-center">
                <p className="font-display text-lg font-bold">{e.name}</p>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={p}
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -8 }}
                    className={cn("mt-2 inline-block rounded-full border px-4 py-1 text-sm font-semibold", PHASE_STYLE[p])}
                  >
                    {p}
                  </motion.span>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
