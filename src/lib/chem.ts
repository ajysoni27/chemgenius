import raw from "./elements-data.json";

export interface Element {
  n: number;
  s: string;
  name: string;
  m: number;
  c: string;
  x: number;
  y: number;
  ec: string;
  en: number | null;
  by: string | null;
  ph: string;
  mp: number | null;
  bp: number | null;
  d: number | null;
  sum: string;
}

export const ELEMENTS: Element[] = (raw as Element[]).filter((e) => e.n <= 118);
export const BY_SYMBOL: Record<string, Element> = Object.fromEntries(ELEMENTS.map((e) => [e.s, e]));

export type ElClass = "metal" | "nonmetal" | "metalloid" | "noble" | "halogen" | "inner" | "unknown";

const HALOGENS = new Set(["F", "Cl", "Br", "I", "At", "Ts"]);
export function classify(e: Element): ElClass {
  if (HALOGENS.has(e.s) && e.n < 85) return "halogen";
  if (e.c.includes("noble")) return "noble";
  if (e.c.startsWith("unknown")) return "unknown";
  if (e.c === "lanthanide" || e.c === "actinide") return "inner";
  if (e.c.includes("metalloid")) return "metalloid";
  if (e.c.includes("nonmetal")) return "nonmetal";
  return "metal";
}

export const CLASS_META: Record<ElClass, { label: string; token: string }> = {
  metal: { label: "Metal", token: "el-metal" },
  nonmetal: { label: "Non-metal", token: "el-nonmetal" },
  metalloid: { label: "Metalloid", token: "el-metalloid" },
  halogen: { label: "Halogen", token: "el-halogen" },
  noble: { label: "Noble gas", token: "el-noble" },
  inner: { label: "Lanthanide / Actinide", token: "el-lanthanide" },
  unknown: { label: "Unknown / synthetic", token: "el-unknown" },
};

const AMPHOTERIC = new Set(["Be", "Al", "Zn", "Ga", "Ge", "Sn", "Pb", "Sb", "Cr", "Cu", "As"]);
/** Acid/base behaviour of an element's oxide, from its class. */
export function oxideBehaviour(e: Element): "Basic oxide" | "Acidic oxide" | "Amphoteric oxide" | "Inert" | "Unknown" {
  if (AMPHOTERIC.has(e.s)) return "Amphoteric oxide";
  const k = classify(e);
  if (k === "noble") return "Inert";
  if (k === "unknown") return "Unknown";
  if (k === "nonmetal" || k === "halogen") return "Acidic oxide";
  if (k === "metalloid") return "Amphoteric oxide";
  return "Basic oxide";
}

/* ---------------- Formula parsing ---------------- */

export type Counts = Record<string, number>;

/** Parse a formula like Ca(OH)2, CuSO4·5H2O, [Fe(CN)6]3- into element counts. */
export function parseFormula(formula: string): Counts {
  const f = formula.replace(/\s/g, "").replace(/[+-]\d*$|\d*[+-]$/, "");
  const parts = f.split(/[·.*]/);
  const total: Counts = {};
  for (const part of parts) {
    const m = part.match(/^(\d+)(.*)$/);
    const mult = m ? Number(m[1]) : 1;
    const c = parseGroup(m ? m[2] : part);
    for (const [k, v] of Object.entries(c)) total[k] = (total[k] ?? 0) + v * mult;
  }
  return total;
}

function parseGroup(s: string): Counts {
  const stack: Counts[] = [{}];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "(" || ch === "[") {
      stack.push({});
      i++;
    } else if (ch === ")" || ch === "]") {
      i++;
      let num = "";
      while (i < s.length && /\d/.test(s[i])) num += s[i++];
      const n = num ? Number(num) : 1;
      const top = stack.pop()!;
      if (!stack.length) throw new Error("Unbalanced brackets");
      const cur = stack[stack.length - 1];
      for (const [k, v] of Object.entries(top)) cur[k] = (cur[k] ?? 0) + v * n;
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      i++;
      while (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
      if (!BY_SYMBOL[sym]) throw new Error(`Unknown element "${sym}"`);
      let num = "";
      while (i < s.length && /\d/.test(s[i])) num += s[i++];
      const cur = stack[stack.length - 1];
      cur[sym] = (cur[sym] ?? 0) + (num ? Number(num) : 1);
    } else {
      throw new Error(`Unexpected character "${ch}"`);
    }
  }
  if (stack.length !== 1) throw new Error("Unbalanced brackets");
  return stack[0];
}

export function molarMass(formula: string): { total: number; breakdown: { symbol: string; count: number; mass: number; percent: number }[] } {
  const counts = parseFormula(formula);
  const rows = Object.entries(counts).map(([symbol, count]) => ({ symbol, count, mass: BY_SYMBOL[symbol].m * count, percent: 0 }));
  const total = rows.reduce((a, r) => a + r.mass, 0);
  rows.forEach((r) => (r.percent = (r.mass / total) * 100));
  return { total, breakdown: rows };
}

/* ---------------- Equation balancing ---------------- */

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

type Frac = [number, number];
const fr = (n: number, d = 1): Frac => {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const sub = (a: Frac, b: Frac) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a: Frac, b: Frac) => fr(a[0] * b[0], a[1] * b[1]);
const div = (a: Frac, b: Frac) => fr(a[0] * b[1], a[1] * b[0]);

/** Balance "H2 + O2 -> H2O". Returns integer coefficients for every species. */
export function balanceEquation(eq: string): { reactants: string[]; products: string[]; coeffs: number[]; balanced: string } {
  const [lhs, rhs] = eq.split(/->|→|=>|=/).map((s) => s?.trim());
  if (!lhs || !rhs) throw new Error("Use the form: A + B -> C + D");
  const reactants = lhs.split(/\s+\+\s+|\s*\+\s*(?=[A-Z0-9([])/).map((s) => s.trim()).filter(Boolean);
  const products = rhs.split(/\s+\+\s+|\s*\+\s*(?=[A-Z0-9([])/).map((s) => s.trim()).filter(Boolean);
  const species = [...reactants, ...products];
  const counts = species.map(parseFormula);
  const els = Array.from(new Set(counts.flatMap((c) => Object.keys(c))));
  // matrix rows = elements, cols = species (products negative)
  const M: Frac[][] = els.map((el) => species.map((_, j) => fr((counts[j][el] ?? 0) * (j < reactants.length ? 1 : -1))));
  const rows = M.length;
  const cols = species.length;
  let r = 0;
  const pivots: number[] = [];
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    while (p < rows && M[p][c][0] === 0) p++;
    if (p === rows) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const pv = M[r][c];
    M[r] = M[r].map((v) => div(v, pv));
    for (let i = 0; i < rows; i++) {
      if (i !== r && M[i][c][0] !== 0) {
        const f = M[i][c];
        M[i] = M[i].map((v, k) => sub(v, mul(f, M[r][k])));
      }
    }
    pivots.push(c);
    r++;
  }
  const free = Array.from({ length: cols }, (_, i) => i).filter((c) => !pivots.includes(c));
  if (free.length === 0) throw new Error("This equation cannot be balanced — check the formulas.");
  const fc = free[free.length - 1];
  const sol: Frac[] = Array.from({ length: cols }, () => fr(0));
  sol[fc] = fr(1);
  for (const f of free) if (f !== fc) sol[f] = fr(0);
  pivots.forEach((c, i) => (sol[c] = fr(-M[i][fc][0], M[i][fc][1])));
  const lcm = sol.reduce((a, s) => (a * s[1]) / gcd(a, s[1]), 1);
  let ints = sol.map((s) => (s[0] * lcm) / s[1]);
  const g = ints.reduce((a, b) => gcd(a, b));
  ints = ints.map((v) => v / g);
  if (ints.some((v) => v <= 0)) {
    if (ints.every((v) => v < 0)) ints = ints.map((v) => -v);
    else throw new Error("No positive solution — a species may be missing or incorrect.");
  }
  const fmt = (list: string[], off: number) => list.map((s, i) => `${ints[i + off] === 1 ? "" : ints[i + off]}${s}`).join(" + ");
  return { reactants, products, coeffs: ints, balanced: `${fmt(reactants, 0)} → ${fmt(products, reactants.length)}` };
}

/* ---------------- Solubility (ESOL, Delaney 2004) ---------------- */

export function esolLogS(p: { xlogp: number; mw: number; rotatable: number; aromaticProportion?: number }) {
  return 0.16 - 0.63 * p.xlogp - 0.0062 * p.mw + 0.066 * p.rotatable - 0.74 * (p.aromaticProportion ?? 0);
}

export function aromaticProportion(smiles: string): number {
  const heavy = smiles.replace(/\[[^\]]*\]/g, "X").match(/Cl|Br|[BCNOSPFI]|[bcnosp]|X/g) ?? [];
  if (!heavy.length) return 0;
  return heavy.filter((a) => /^[bcnosp]$/.test(a)).length / heavy.length;
}

export function solubilityClass(logS: number) {
  if (logS > 0) return "Highly soluble";
  if (logS > -2) return "Soluble";
  if (logS > -4) return "Moderately soluble";
  if (logS > -6) return "Poorly soluble";
  return "Insoluble";
}

export function subscript(formula: string) {
  return formula.replace(/(\d+)/g, (d) => d.split("").map((c) => "₀₁₂₃₄₅₆₇₈₉"[Number(c)]).join(""));
}
