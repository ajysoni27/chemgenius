import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FlaskConical, GitCompare, Wrench, Sparkles, Atom, Scale } from "lucide-react";
import { CompoundSearch } from "@/components/chem/CompoundSearch";
import { FloatingMolecules } from "@/components/chem/FloatingMolecules";
import { PeriodicTable } from "@/components/chem/PeriodicTable";
import { Structure2D } from "@/components/chem/Structure2D";
import { TiltCard } from "@/components/chem/TiltCard";
import { askChemAI } from "@/components/chem/ChatWidget";
import { POPULAR } from "@/lib/popular";
import { subscript } from "@/lib/chem";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartChemVision — The Ultimate Chemistry Universe" },
      { name: "description", content: "Search 100M+ compounds, explore an interactive periodic table, predict reactions with AI and view 3D molecules." },
      { property: "og:title", content: "SmartChemVision — The Ultimate Chemistry Universe" },
      { property: "og:description", content: "An AI chemistry operating system: compounds, reactions, 3D structures, spectra and safety." },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { to: "/reactions", icon: FlaskConical, title: "Smart Reaction Lab", body: "Mix up to 4 compounds. AI predicts products, balanced equation, mechanism & energy." },
  { to: "/compare", icon: GitCompare, title: "Comparison Lab", body: "Side-by-side structures, properties, safety and graphs for up to 3 compounds." },
  { to: "/tools", icon: Scale, title: "Chem Toolkit", body: "Equation balancer, molar mass, solubility predictor, spectroscopy & GHS viewer." },
] as const;

function Index() {
  return (
    <div>
      <section className="grid-bg relative overflow-hidden">
        <FloatingMolecules />
        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-20 text-center md:pt-28">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
            <Sparkles className="size-3.5 text-neon" /> Live PubChem data · 100M+ compounds · AI-powered
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl font-extrabold leading-[1.05] md:text-7xl"
          >
            The Ultimate
            <br />
            <span className="text-gradient">Chemistry Universe</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Explore every molecule in 2D and 3D, predict reactions, compare compounds and ask an AI chemist anything.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mx-auto mt-10 max-w-2xl">
            <CompoundSearch size="lg" onPick={(c) => askChemAI(`Tell me about ${c.title} (${c.formula})`)} />
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              Try:
              {["Aspirin", "C6H12O6", "CC(=O)O", "2-acetoxybenzoic acid"].map((t) => (
                <button key={t} onClick={() => askChemAI(`Tell me about ${t}`)} className="glass rounded-full px-3 py-1 font-mono hover:text-foreground">
                  {t}
                </button>
              ))}
              <button onClick={() => askChemAI()} className="rounded-full border border-violet/50 px-3 py-1 text-violet hover:bg-violet/10">
                Ask Chem AI ✦
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Interactive</p>
            <h2 className="text-3xl font-bold">Periodic Table</h2>
            <p className="text-sm text-muted-foreground">Hover any element for a quick profile. Click for uses, isotopes & discovery.</p>
          </div>
          <Atom className="hidden size-10 text-violet md:block" />
        </div>
        <div className="glass rounded-3xl p-4 md:p-6">
          <PeriodicTable />
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Trending</p>
          <h2 className="mb-6 text-3xl font-bold">Popular compounds</h2>
        </div>
        <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-4 pb-6 md:px-[max(1rem,calc((100vw-80rem)/2+1rem))]">
          {POPULAR.map((c, i) => (
            <motion.div key={c.cid} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="snap-start">
              <button onClick={() => askChemAI(`Tell me about ${c.name}`)} className="text-left">
                <TiltCard className="w-60 shrink-0 p-4 transition hover:shadow-glow">
                  <Structure2D smiles={c.smiles} height={150} />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-display font-semibold">{c.name}</p>
                    <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] text-violet">{c.tag}</span>
                  </div>
                  <p className="font-mono text-sm text-neon">{subscript(c.formula)}</p>
                </TiltCard>
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.to}>
            <TiltCard className="h-full p-6 transition hover:shadow-violet">
              <f.icon className="mb-4 size-8 text-neon" />
              <h3 className="text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </TiltCard>
          </div>
        ))}
        <button onClick={() => askChemAI()} className="text-left md:col-span-3">
          <TiltCard intensity={4} className="flex items-center gap-4 p-6">
            <Wrench className="size-8 text-violet" />
            <div>
              <h3 className="text-xl font-bold">Ask Chem AI anything</h3>
              <p className="text-sm text-muted-foreground">"Why does Aspirin work?" · "What happens if I mix bleach and vinegar?"</p>
            </div>
          </TiltCard>
        </button>
      </section>
    </div>
  );
}
