import { useState } from "react";
import { motion } from "framer-motion";
import { ELEMENTS, classify, oxideBehaviour, CLASS_META, type Element, type ElClass } from "@/lib/chem";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const CLASS_STYLE: Record<ElClass, string> = {
  metal: "bg-el-metal/15 border-el-metal/40 text-el-metal",
  nonmetal: "bg-el-nonmetal/15 border-el-nonmetal/40 text-el-nonmetal",
  metalloid: "bg-el-metalloid/15 border-el-metalloid/40 text-el-metalloid",
  halogen: "bg-el-halogen/15 border-el-halogen/40 text-el-halogen",
  noble: "bg-el-noble/15 border-el-noble/40 text-el-noble",
  inner: "bg-el-lanthanide/15 border-el-lanthanide/40 text-el-lanthanide",
  unknown: "bg-el-unknown/15 border-el-unknown/40 text-el-unknown",
};
const DOT: Record<ElClass, string> = {
  metal: "bg-el-metal",
  nonmetal: "bg-el-nonmetal",
  metalloid: "bg-el-metalloid",
  halogen: "bg-el-halogen",
  noble: "bg-el-noble",
  inner: "bg-el-lanthanide",
  unknown: "bg-el-unknown",
};

export function PeriodicTable() {
  const [filter, setFilter] = useState<ElClass | null>(null);
  const [sel, setSel] = useState<Element | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(CLASS_META) as ElClass[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(filter === k ? null : k)}
            className={cn("glass flex items-center gap-2 rounded-full px-3 py-1 text-xs transition", filter === k && "shadow-glow ring-1 ring-neon")}
          >
            <span className={cn("size-2.5 rounded-full", DOT[k])} />
            {CLASS_META[k].label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar overflow-x-auto pb-2">
        <div className="grid min-w-[900px] gap-1" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gridTemplateRows: "repeat(10, minmax(0, 1fr))" }}>
          {ELEMENTS.map((e, i) => {
            const k = classify(e);
            const dim = filter && filter !== k;
            return (
              <HoverCard key={e.n} openDelay={80} closeDelay={40}>
                <HoverCardTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: dim ? 0.15 : 1, scale: 1 }}
                    transition={{ delay: i * 0.004, type: "spring", stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.25, zIndex: 10 }}
                    onClick={() => setSel(e)}
                    style={{ gridColumn: e.x, gridRow: e.y }}
                    className={cn("relative aspect-square rounded-md border p-1 text-left", CLASS_STYLE[k])}
                  >
                    <span className="absolute left-1 top-0.5 font-mono text-[8px] opacity-70">{e.n}</span>
                    <span className="flex h-full items-center justify-center font-display text-sm font-bold text-foreground">{e.s}</span>
                  </motion.button>
                </HoverCardTrigger>
                <HoverCardContent className="glass-strong w-72 border-border">
                  <ElementQuick e={e} />
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      </div>
      <ElementDialog e={sel} onClose={() => setSel(null)} />
    </div>
  );
}

function ElementQuick({ e }: { e: Element }) {
  const k = classify(e);
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-xl font-bold">{e.name}</p>
          <p className="text-xs text-muted-foreground">{CLASS_META[k].label} · {e.c}</p>
        </div>
        <span className="font-display text-3xl font-bold text-gradient">{e.s}</span>
      </div>
      <Row k="Atomic number" v={e.n} />
      <Row k="Molar mass" v={`${e.m} g/mol`} />
      <Row k="Discovered by" v={e.by ?? "Ancient / unknown"} />
      <Row k="Oxide" v={oxideBehaviour(e)} />
      <Row k="Electronegativity" v={e.en ?? "—"} />
      <p className="line-clamp-3 text-xs text-muted-foreground">{e.sum}</p>
      <p className="text-xs text-neon">Click for full profile →</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

function ElementDialog({ e, onClose }: { e: Element | null; onClose: () => void }) {
  const [, setForEl] = useState<number | null>(null);

  return (
    <Dialog open={!!e} onOpenChange={(o) => !o && (onClose(), setForEl(null))}>
      <DialogContent className="glass-strong max-h-[85vh] max-w-2xl overflow-y-auto border-border">
        {e && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4">
                <span className={cn("flex size-16 items-center justify-center rounded-xl border font-display text-3xl", CLASS_STYLE[classify(e)])}>
                  <span className="text-foreground">{e.s}</span>
                </span>
                <span>
                  <span className="block text-2xl">{e.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    #{e.n} · {CLASS_META[classify(e)].label} · {e.ph}
                  </span>
                </span>
              </DialogTitle>
              <DialogDescription>{e.sum}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-2">
              <Row k="Molar mass" v={`${e.m} g/mol`} />
              <Row k="Electron config." v={<span className="font-mono">{e.ec}</span>} />
              <Row k="Electronegativity" v={e.en ?? "—"} />
              <Row k="Density" v={e.d ? `${e.d} g/cm³` : "—"} />
              <Row k="Melting point" v={e.mp ? `${e.mp} K` : "—"} />
              <Row k="Boiling point" v={e.bp ? `${e.bp} K` : "—"} />
              <Row k="Discovered by" v={e.by ?? "Ancient / unknown"} />
              <Row k="Acid/base (oxide)" v={oxideBehaviour(e)} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
