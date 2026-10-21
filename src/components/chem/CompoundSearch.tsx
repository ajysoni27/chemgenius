import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, FlaskConical, Sparkles } from "lucide-react";
import { autocomplete, searchCompounds, type Compound } from "@/lib/pubchem";
import { POPULAR } from "@/lib/popular";
import { subscript } from "@/lib/chem";
import { cn } from "@/lib/utils";
import { streamChemAI, cleanAI } from "@/lib/chem-ai-client";

function isQuestion(q: string) {
  const t = q.trim();
  return /\?$/.test(t) || /^(why|what|how|explain|when|which|who|define|describe|is|are|can|does|do)\b/i.test(t) || t.split(/\s+/).length >= 4;
}

type Sug = { label: string; cid?: number; formula?: string };

function localMatches(q: string): Sug[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return POPULAR.filter(
    (p) => p.name.toLowerCase().includes(s) || p.formula.toLowerCase() === s || p.smiles.toLowerCase() === s,
  ).map((p) => ({ label: p.name, cid: p.cid, formula: p.formula }));
}

/** Search box over PubChem (names, IUPAC, formulas, CAS, SMILES, CIDs) with local fallback. */
export function CompoundSearch({
  onPick,
  placeholder = "Search 100M+ compounds — name, formula, CAS, SMILES…",
  size = "md",
  autoFocus,
}: {
  onPick?: (c: Compound) => void;
  placeholder?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingSugs, setLoadingSugs] = useState(false);
  const [msg, setMsg] = useState("");
  const [ai, setAi] = useState<{ q: string; text: string; error?: boolean } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  async function askAI(question: string) {
    setOpen(false);
    setMsg("");
    setAiBusy(true);
    setAi(null);
    try {
      await streamChemAI([{ role: "user", content: question }], (t) => {
        setAiBusy(false);
        setAi({ q: question, text: t });
      });
    } catch (e) {
      setAi({ q: question, text: `AI could not answer: ${(e as Error).message}`, error: true });
    } finally {
      setAiBusy(false);
    }
  }
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(t.current);
    const term = q.trim();
    if (term.length < 2) {
      setSugs([]);
      return;
    }
    const local = localMatches(term);
    setSugs(local);
    setLoadingSugs(true);
    t.current = setTimeout(async () => {
      const remote = await autocomplete(term).catch(() => [] as string[]);
      const seen = new Set(local.map((l) => l.label.toLowerCase()));
      const merged = [...local, ...remote.filter((r) => !seen.has(r.toLowerCase())).map((r) => ({ label: r }))].slice(0, 9);
      // Formula / SMILES / CAS queries: offer direct lookup
      if (!merged.length) merged.push({ label: term });
      setSugs(merged);
      setLoadingSugs(false);
    }, 200);
  }, [q]);

  function open_(cid: number, ai = false) {
    setQ("");
    setOpen(false);
    navigate({ to: "/compound/$cid", params: { cid: String(cid) }, search: ai ? { ai: 1 } : {} });
  }

  async function go(s: Sug | string, ai = false) {
    const sug = typeof s === "string" ? { label: s } : s;
    if (!sug.label.trim()) return;
    if (sug.cid) return open_(sug.cid, ai);
    if (isQuestion(sug.label)) return askAI(sug.label);
    setBusy(true);
    setMsg("");
    setOpen(false);
    const res = await searchCompounds(sug.label).catch(() => [] as Compound[]);
    setBusy(false);
    if (!res.length) {
      const local = localMatches(sug.label)[0];
      if (local?.cid) return open_(local.cid, ai);
      return askAI(sug.label);
    }
    onPick?.(res[0]);
    open_(res[0].cid, ai);
  }

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void go(sugs[0]?.cid ? sugs[0] : q);
        }}
        className={cn(
          "glass flex items-center gap-3 rounded-full px-5 transition focus-within:shadow-glow",
          size === "lg" ? "h-16 text-lg" : "h-12",
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-neon" /> : <Search className="size-5 text-neon" />}
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setMsg("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label="Search compounds"
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="hidden rounded-full bg-gradient-neon px-4 py-1.5 text-sm font-semibold text-primary-foreground sm:block">
          Search
        </button>
      </form>
      {(aiBusy || ai) && (
        <div className="glass mt-3 rounded-2xl px-5 py-4 text-left text-sm">
          {aiBusy ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> AI is thinking…</div>
          ) : ai && (
            <>
              <div className="mb-2 flex items-center gap-2 text-xs text-violet"><Sparkles className="size-3.5" /> {ai.q}</div>
              <div className="whitespace-pre-wrap leading-relaxed">{cleanAI(ai.text).trim()}</div>
            </>
          )}
        </div>
      )}
      {msg && <p className="mt-2 px-5 text-sm text-muted-foreground">{msg}</p>}
      {open && q.trim().length >= 2 && (sugs.length > 0 || loadingSugs) && (
        <ul className="glass-strong absolute z-40 mt-2 w-full overflow-hidden rounded-2xl py-2 text-left shadow-violet">
          {sugs.map((s) => (
            <li key={s.label} className="flex items-center hover:bg-secondary">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void go(s)}
                className="flex min-w-0 flex-1 items-center gap-3 px-5 py-2 text-left text-sm"
              >
                <FlaskConical className="size-4 shrink-0 text-violet" />
                <span className="truncate">{s.label}</span>
                {s.formula && <span className="font-mono text-xs text-neon">{subscript(s.formula)}</span>}
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void go(s, true)}
                className="mr-3 flex shrink-0 items-center gap-1 rounded-full border border-violet/40 px-2 py-0.5 text-[11px] text-violet hover:bg-violet/10"
              >
                <Sparkles className="size-3" /> Ask AI
              </button>
            </li>
          ))}
          {loadingSugs && (
            <li className="flex items-center gap-2 px-5 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Searching PubChem…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
