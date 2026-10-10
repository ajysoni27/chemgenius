import { useEffect, useRef, useState } from "react";
import { Search, Loader2, FlaskConical } from "lucide-react";
import { autocomplete, searchCompounds, type Compound } from "@/lib/pubchem";
import { cn } from "@/lib/utils";

/** Search box over PubChem (names, IUPAC, formulas, SMILES, CIDs). */
export function CompoundSearch({
  onPick,
  placeholder = "Search 100M+ compounds — name, formula, SMILES, IUPAC…",
  size = "md",
  autoFocus,
}: {
  onPick: (c: Compound) => void;
  placeholder?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) return setSugs([]);
    t.current = setTimeout(() => autocomplete(q).then(setSugs), 220);
  }, [q]);

  async function go(term: string) {
    if (!term.trim()) return;
    setBusy(true);
    setErr("");
    setOpen(false);
    const res = await searchCompounds(term);
    setBusy(false);
    if (!res.length) return setErr(`No compound found for "${term}"`);
    onPick(res[0]);
    setQ("");
  }

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
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
            setErr("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="hidden rounded-full bg-gradient-neon px-4 py-1.5 text-sm font-semibold text-primary-foreground sm:block">
          Search
        </button>
      </form>
      {err && <p className="mt-2 px-5 text-sm text-destructive">{err}</p>}
      {open && sugs.length > 0 && (
        <ul className="glass-strong absolute z-40 mt-2 w-full overflow-hidden rounded-2xl py-2 shadow-violet">
          {sugs.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s)}
                className="flex w-full items-center gap-3 px-5 py-2 text-left text-sm hover:bg-secondary"
              >
                <FlaskConical className="size-4 text-violet" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
