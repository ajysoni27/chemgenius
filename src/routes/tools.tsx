import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { molarMass } from "@/lib/chem";
import { CHEM, CHEM_BY_SYMBOL, phaseAt, PHASE_STYLE } from "@/lib/chemdata";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Chem Toolkit — SmartChemVision" },
      { name: "description", content: "Molar mass calculator, element state predictor and searchable property viewer for all 118 elements." },
      { property: "og:title", content: "Chem Toolkit — SmartChemVision" },
      { property: "og:description", content: "Quick chemistry tools: molar mass, state at any temperature, element properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolsPage,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MolarTool() {
  const [f, setF] = useState("CuSO4·5H2O");
  const res = useMemo(() => {
    try { return f.trim() ? molarMass(f) : null; } catch { return null; }
  }, [f]);
  return (
    <Card title="Molar Mass Calculator">
      <Input value={f} onChange={(e) => setF(e.target.value)} placeholder="e.g. H2SO4" className="font-mono" />
      {res ? (
        <div className="mt-3">
          <p className="font-mono text-2xl text-neon">{res.total.toFixed(3)} g/mol</p>
          <ul className="mt-2 space-y-1 text-sm">
            {res.breakdown.map((r) => (
              <li key={r.symbol} className="flex justify-between border-b border-border/40 pb-1">
                <span>{r.symbol} × {r.count}</span>
                <span className="text-muted-foreground">{r.mass.toFixed(3)} · {r.percent.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : f.trim() ? <p className="mt-3 text-sm text-muted-foreground">Type a valid formula, e.g. Ca(OH)2</p> : null}
    </Card>
  );
}

function StateTool() {
  const [s, setS] = useState("Fe");
  const [t, setT] = useState("500");
  const e = CHEM_BY_SYMBOL[s];
  const temp = Number(t);
  const p = Number.isFinite(temp) && t !== "" ? phaseAt(e, temp) : null;
  return (
    <Card title="State Predictor">
      <div className="flex gap-2">
        <select value={s} onChange={(ev) => setS(ev.target.value)} className="flex-1 rounded-md border border-border bg-background px-3 text-sm">
          {CHEM.map((x) => <option key={x.symbol} value={x.symbol}>{x.name} ({x.symbol})</option>)}
        </select>
        <Input type="number" value={t} onChange={(ev) => setT(ev.target.value)} className="w-28" />
      </div>
      {p && (
        <p className="mt-4 text-lg">
          At {temp}°C, {e.symbol} is{" "}
          <span className={cn("rounded-full border px-3 py-0.5 font-semibold", PHASE_STYLE[p])}>{p === "Unknown" ? "unknown (no data)" : p}</span>
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{e.stateChangeInfo}</p>
    </Card>
  );
}

function PropertyTool() {
  const [q, setQ] = useState("");
  const list = CHEM.filter((e) => {
    const k = q.trim().toLowerCase();
    return !k || e.name.toLowerCase().includes(k) || e.symbol.toLowerCase() === k || String(e.atomicNumber) === k || e.pH_Tendency.includes(k);
  });
  return (
    <Card title="Property Viewer">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, symbol, number or acidic/basic…" />
      <div className="mt-3 max-h-96 overflow-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="sticky top-0 bg-background text-muted-foreground">
            <tr><th className="p-2 text-left">El</th><th className="p-2 text-left">Mass</th><th className="p-2 text-left">Melt °C</th><th className="p-2 text-left">Boil °C</th><th className="p-2 text-left">pH</th><th className="p-2 text-left">STP</th></tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.symbol} className="border-b border-border/40">
                <td className="p-2"><span className="font-bold text-neon">{e.symbol}</span> {e.name}</td>
                <td className="p-2">{e.molarMass.toFixed(2)}</td>
                <td className="p-2">{e.meltingPointC ?? "—"}</td>
                <td className="p-2">{e.boilingPointC ?? "—"}</td>
                <td className="p-2 capitalize">{e.pH_Tendency}</td>
                <td className="p-2 capitalize">{e.stateAtSTP}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Toolkit</p>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Chem <span className="text-gradient">Toolkit</span></h1>
      <div className="grid gap-4 md:grid-cols-2">
        <MolarTool />
        <StateTool />
      </div>
      <div className="mt-4"><PropertyTool /></div>
    </div>
  );
}
