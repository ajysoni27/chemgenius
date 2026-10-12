import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, FlaskConical, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MoleculeCanvas } from "@/components/chem/MoleculeCanvas";
import { predict, type Prediction } from "@/lib/reactions";
import { subscript } from "@/lib/chem";

export const Route = createFileRoute("/reactions")({
  head: () => ({
    meta: [
      { title: "Reaction Lab Pro — SmartChemVision" },
      { name: "description", content: "Predict products for any two reactants across all 118 elements, with balanced equations, states and 2D/3D structures." },
      { property: "og:title", content: "Reaction Lab Pro — SmartChemVision" },
      { property: "og:description", content: "Unlimited reaction prediction: combustion, precipitation, acid-base, redox and complexation with 3D models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReactionLab,
});

const EXAMPLES: [string, string][] = [
  ["AlCl3", "H2O"],
  ["B2H6", "O2"],
  ["UF6", "H2O"],
  ["AgNO3", "NaCl"],
  ["K4[Fe(CN)6]", "FeCl3"],
  ["CuSO4·5H2O", "NH3"],
  ["Al2(SO4)3", "BaCl2"],
];

function ReactionLab() {
  const [a, setA] = useState("AlCl3");
  const [b, setB] = useState("H2O");
  const [cond, setCond] = useState("");
  const [res, setRes] = useState<Prediction | null>(() => predict("AlCl3", "H2O"));
  const [err, setErr] = useState("");

  function run(x = a, y = b) {
    setErr("");
    try {
      setRes(predict(x, y, cond));
    } catch (e) {
      setErr(`Check the formula spelling — ${e instanceof Error ? e.message : String(e)}. Element symbols are case-sensitive (Co ≠ CO).`);
    }
  }

  const input = "glass h-12 w-full rounded-full bg-transparent px-5 font-mono outline-none focus:shadow-glow";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <p className="glass mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
          <Zap className="size-3.5 text-neon" /> Unlimited Pro · 118 elements · every formula type
        </p>
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          Reaction Lab <span className="text-gradient">Pro</span>
        </h1>
      </motion.div>

      <form
        className="glass-strong mx-auto max-w-4xl space-y-4 rounded-3xl p-5"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <input aria-label="Reactant A" className={input} value={a} onChange={(e) => setA(e.target.value)} placeholder="Reactant A, e.g. AlCl3" />
          <Plus className="mx-auto size-5 text-neon" />
          <input aria-label="Reactant B" className={input} value={b} onChange={(e) => setB(e.target.value)} placeholder="Reactant B, e.g. H2O" />
        </div>
        <input aria-label="Conditions" className={input} value={cond} onChange={(e) => setCond(e.target.value)} placeholder="Conditions (optional) — e.g. heat, aqueous, catalyst" />
        <div className="flex flex-wrap items-center gap-2">
          {EXAMPLES.map(([x, y]) => (
            <Button
              key={x + y}
              type="button"
              size="sm"
              variant="glass"
              className="font-mono text-xs"
              onClick={() => {
                setA(x);
                setB(y);
                run(x, y);
              }}
            >
              {subscript(x)} + {subscript(y)}
            </Button>
          ))}
          <Button type="submit" variant="neon" className="ml-auto">
            <FlaskConical className="size-4" /> React
          </Button>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>

      {res && (
        <motion.section key={res.equation} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-6">
          <div className="glass-strong rounded-3xl p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gradient-neon px-3 py-1 text-xs font-semibold text-primary-foreground">{res.type}</span>
              <span className="text-xs text-muted-foreground">Conditions: {res.conditions}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-xl md:text-2xl" data-testid="equation">{subscript(res.equation)}</p>
              <Button
                size="sm"
                variant="glass"
                onClick={() => {
                  navigator.clipboard.writeText(res.equation);
                  toast.success("Equation copied");
                }}
              >
                <Copy className="size-3.5" /> Copy Eq
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground"><span className="text-foreground">Observation:</span> {res.observation}</p>
            {res.note && <p className="mt-1 text-xs text-muted-foreground">{res.note}</p>}
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl font-semibold">Reactants</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {res.reactants.map((s) => <MoleculeCanvas key={"r" + s.formula} formula={s.formula} label={`Reactant · (${s.state})`} />)}
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-display text-xl font-semibold">Products</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {res.products.map((s) => <MoleculeCanvas key={"p" + s.formula} formula={s.formula} label={`Product · (${s.state})${s.mark === "↓" ? " · precipitate" : s.mark === "↑" ? " · gas" : ""}`} />)}
            </div>
          </div>
        </motion.section>
      )}

      <p className="mt-16 text-center text-sm text-muted-foreground">Developed by Ajay 27 | 118 elements | All reactions work</p>
    </div>
  );
}
