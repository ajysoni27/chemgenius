import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, FlaskConical } from "lucide-react";
import { searchCompounds, getGhs, type Compound, type GhsInfo } from "@/lib/pubchem";
import { POPULAR } from "@/lib/popular";
import { subscript } from "@/lib/chem";
import { Structure2D } from "@/components/chem/Structure2D";
import { Structure3D } from "@/components/chem/Structure3D";
import { explainCompound } from "@/lib/chem-ai.functions";

export const Route = createFileRoute("/compound/$cid")({
  validateSearch: (s: Record<string, unknown>): { ai?: number } => (s.ai ? { ai: 1 } : {}),
  head: () => ({
    meta: [
      { title: "Compound profile — SmartChemVision" },
      { name: "description", content: "Structure, properties, safety and AI explanation for a chemical compound." },
      { property: "og:title", content: "Compound profile — SmartChemVision" },
      { property: "og:description", content: "2D/3D structure, properties, GHS safety and AI insights from PubChem data." },
    ],
  }),
  component: CompoundPage,
});

function fallbackCompound(cid: number): Compound | null {
  const p = POPULAR.find((x) => x.cid === cid);
  return p ? { cid: p.cid, title: p.name, formula: p.formula, mw: 0, smiles: p.smiles } : null;
}

function CompoundPage() {
  const { cid: cidStr } = Route.useParams();
  const cid = Number(cidStr);
  const [c, setC] = useState<Compound | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  const [ghs, setGhs] = useState<GhsInfo | null>(null);
  const [ai, setAi] = useState<{ text: string; fallback: boolean } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    let off = false;
    setState("loading");
    setAi(null);
    setGhs(null);
    (async () => {
      const res = await searchCompounds(String(cid)).catch(() => [] as Compound[]);
      const comp = res[0] ?? fallbackCompound(cid);
      if (off) return;
      setC(comp);
      setState(comp ? "ok" : "none");
      if (comp) getGhs(comp.cid).then((g) => !off && setGhs(g)).catch(() => {});
      if (comp) void askAI(comp, () => off);
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  async function askAI(comp: Compound, cancelled: () => boolean = () => false) {
    setAiBusy(true);
    try {
      const r = await explainCompound({
        data: { name: comp.title, formula: comp.formula, iupac: comp.iupac ?? "", mw: comp.mw, smiles: comp.smiles },
      });
      if (!cancelled()) setAi(r);
    } catch {
      if (!cancelled()) setAi({ text: "AI busy, showing saved info. Try again in a moment.", fallback: true });
    } finally {
      if (!cancelled()) setAiBusy(false);
    }
  }

  if (state === "loading")
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-neon" /> Loading compound…
      </div>
    );

  if (!c)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Compound not available right now</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try one of these popular compounds:</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {POPULAR.map((p) => (
            <Link key={p.cid} to="/compound/$cid" params={{ cid: String(p.cid) }} className="glass rounded-full px-3 py-1 text-sm">
              {p.name}
            </Link>
          ))}
        </div>
      </div>
    );

  const props: [string, string | number | undefined][] = [
    ["Formula", c.formula],
    ["Molar mass", c.mw ? `${c.mw} g/mol` : undefined],
    ["IUPAC name", c.iupac],
    ["PubChem CID", c.cid],
    ["XLogP", c.xlogp],
    ["TPSA", c.tpsa != null ? `${c.tpsa} Å²` : undefined],
    ["H-bond donors / acceptors", c.hbd != null ? `${c.hbd} / ${c.hba}` : undefined],
    ["Heavy atoms", c.heavyAtoms],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Compound</p>
      <h1 className="text-3xl font-extrabold md:text-5xl">{c.title}</h1>
      <p className="mt-1 font-mono text-lg text-neon">{subscript(c.formula)}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-3xl p-4">
          <p className="mb-2 text-sm font-semibold">2D structure</p>
          {c.smiles ? <Structure2D smiles={c.smiles} height={280} /> : <p className="text-sm text-muted-foreground">No structure data.</p>}
        </div>
        <div className="glass rounded-3xl p-4">
          <p className="mb-2 text-sm font-semibold">3D structure</p>
          <Structure3D cid={c.cid} height={280} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-3xl p-5 md:col-span-1">
          <p className="mb-3 text-sm font-semibold">Properties</p>
          <dl className="space-y-2 text-sm">
            {props.filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words font-mono">{v}</dd>
              </div>
            ))}
          </dl>
          {ghs && (ghs.pictograms.length > 0 || ghs.hazards.length > 0) && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">GHS safety {ghs.signal && <span className="text-destructive">· {ghs.signal}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {ghs.pictograms.map((p) => (
                  <img key={p.code} src={p.url} alt={p.label} title={p.label} className="size-10 rounded bg-foreground/90 p-0.5" />
                ))}
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {ghs.hazards.slice(0, 6).map((h) => <li key={h}>{h}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="glass rounded-3xl p-5 md:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical className="size-4 text-neon" /> Chem AI explanation
            </p>
            <button
              onClick={() => void askAI(c)}
              disabled={aiBusy}
              className="flex items-center gap-1 rounded-full border border-violet/40 px-3 py-1 text-xs text-violet hover:bg-violet/10 disabled:opacity-50"
            >
              <Sparkles className="size-3" /> Ask AI about this compound
            </button>
          </div>
          {aiBusy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </p>
          )}
          {!aiBusy && ai && (
            <>
              {ai.fallback && <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI busy, showing saved info</p>}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{ai.text}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
