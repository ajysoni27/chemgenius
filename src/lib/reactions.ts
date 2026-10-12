import { BY_SYMBOL, balanceEquation, classify, parseFormula, type Counts } from "./chem";

/* ---------- ions ---------- */

export const POLY_ANIONS: Record<string, number> = {
  OH: -1, NO3: -1, NO2: -1, SO4: -2, SO3: -2, CO3: -2, PO4: -3, HPO4: -2, H2PO4: -1,
  ClO: -1, ClO2: -1, ClO3: -1, ClO4: -1, BrO3: -1, IO3: -1, MnO4: -1, CrO4: -2, Cr2O7: -2,
  CN: -1, SCN: -1, HCO3: -1, HSO4: -1, CH3COO: -1, C2H3O2: -1, C2O4: -2, SiO3: -2,
  AlF6: -3, BF4: -1, PF6: -1, "Fe(CN)6": -4, S2O3: -2, AsO4: -3,
};
const MONO_ANION: Record<string, number> = { F: -1, Cl: -1, Br: -1, I: -1, At: -1, O: -2, S: -2, Se: -2, Te: -2, N: -3, P: -3, H: -1 };
const DEFAULT_CAT: Record<string, number> = { Ag: 1, Zn: 2, Cu: 2, Pb: 2, Fe: 3, Al: 3, Ni: 2, Co: 2, Mn: 2, Sn: 2, Hg: 2, Cr: 3, Au: 3, Cd: 2, Ga: 3, U: 6, Ti: 4, NH4: 1 };

export function cationCharge(sym: string): number {
  if (DEFAULT_CAT[sym]) return DEFAULT_CAT[sym];
  const e = BY_SYMBOL[sym];
  if (!e) return 1;
  if (e.c === "alkali metal") return 1;
  if (e.c === "alkaline earth metal") return 2;
  if (e.c === "lanthanide" || e.c === "actinide") return 3;
  return 2;
}

export function isMetal(sym: string) {
  const e = BY_SYMBOL[sym];
  if (!e) return sym === "NH4";
  const k = classify(e);
  return k === "metal" || k === "inner";
}

export interface Ionic { cat: string; nCat: number; cc: number; an: string; nAn: number; ac: number; poly: boolean }

/** Split a salt-like formula into cation / anion. */
export function splitIonic(raw: string): Ionic | null {
  const f = clean(raw);
  let m = f.match(/^\((NH4)\)(\d*)(.+)$/) ?? f.match(/^(NH4)()(.+)$/) ?? f.match(/^([A-Z][a-z]?)(\d*)(.+)$/);
  if (!m) return null;
  const cat = m[1];
  if (!isMetal(cat)) return null;
  const nCat = Number(m[2] || 1);
  const rest = m[3];
  let an = "", nAn = 1, poly = true;
  const g = rest.match(/^[([{](.+)[)\]}](\d*)$/);
  if (g) {
    an = g[1];
    nAn = Number(g[2] || 1);
  } else if (POLY_ANIONS[rest] !== undefined) {
    an = rest;
  } else {
    m = rest.match(/^([A-Z][a-z]?)(\d*)$/);
    if (!m || MONO_ANION[m[1]] === undefined) return null;
    an = m[1];
    nAn = Number(m[2] || 1);
    poly = false;
  }
  let ac = POLY_ANIONS[an] ?? MONO_ANION[an];
  let cc: number;
  if (ac !== undefined) cc = (nAn * -ac) / nCat;
  else {
    cc = cationCharge(cat);
    ac = -(cc * nCat) / nAn;
  }
  return { cat, nCat, cc, an, nAn, ac, poly };
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export function salt(cat: string, cc: number, an: string, ac: number) {
  const a = Math.abs(ac);
  const c = Math.max(1, Math.round(cc));
  const l = (c * a) / gcd(c, a);
  const nc = l / c, na = l / a;
  const catS = cat === "NH4" && nc > 1 ? `(NH4)${nc}` : `${cat}${nc > 1 ? nc : ""}`;
  const multi = (an.match(/[A-Z]/g) ?? []).length > 1 || /\d/.test(an);
  const anS = na > 1 ? (multi ? `(${an})${na}` : `${an}${na}`) : an;
  return catS + anS;
}

/* ---------- states ---------- */

const GASES = new Set(["O2", "H2", "N2", "CO2", "CO", "SO2", "NO", "NO2", "NH3", "CH4", "Cl2", "F2", "HF", "H2S", "B2H6", "C2H6", "C3H8", "C2H4", "C2H2", "UF6", "He", "Ne", "Ar", "Kr", "Xe", "Rn", "SO3", "N2O"]);
const LIQUIDS = new Set(["H2O", "Br2", "Hg", "C2H5OH", "C2H6O", "CH3OH", "C6H6", "H2O2"]);
const INSOL_HALIDE = new Set(["Ag", "Pb", "Hg"]);
const INSOL_SULFATE = new Set(["Ba", "Pb", "Ca", "Sr", "Ag"]);

export function isInsoluble(f: string): boolean {
  if (/^Fe4\[Fe\(CN\)6\]3$/.test(f)) return true;
  const io = splitIonic(f);
  if (!io) return false;
  const alk = BY_SYMBOL[io.cat]?.c === "alkali metal" || io.cat === "NH4";
  if (alk || ["NO3", "CH3COO", "ClO4", "ClO3"].includes(io.an)) return false;
  if (["Cl", "Br", "I"].includes(io.an)) return INSOL_HALIDE.has(io.cat);
  if (io.an === "SO4") return INSOL_SULFATE.has(io.cat);
  if (io.an === "OH") return !["Ba", "Sr"].includes(io.cat);
  if (["CO3", "PO4", "S", "O", "SO3", "CrO4", "C2O4", "SiO3"].includes(io.an)) return true;
  if (io.an === "F") return ["Ca", "Mg", "Ba", "Sr", "Pb", "Al"].includes(io.cat);
  return false;
}

export type State = "s" | "l" | "g" | "aq";
export function stateOf(f: string, isProduct: boolean): State {
  if (GASES.has(f)) return "g";
  if (LIQUIDS.has(f)) return "l";
  if (["HCl", "HNO3", "H2SO4", "HBr", "HI", "H3PO4", "H2CO3", "H2SO3"].includes(f)) return "aq";
  if (f === "HF") return "g";
  const c = safeCounts(f);
  const syms = Object.keys(c);
  if (syms.length === 1) return "s";
  if (isInsoluble(f)) return "s";
  const io = splitIonic(f);
  if (io) {
    if (!io.poly && ["Al", "Fe", "U", "Ti", "Sn"].includes(io.cat) && !isProduct) return "s";
    return isProduct || io.poly ? "aq" : "s";
  }
  if (c.C && c.H) return "l";
  return "s";
}

/* ---------- helpers ---------- */

export function clean(f: string) {
  return f.trim().replace(/\s/g, "").replace(/[↓↑]/g, "").replace(/\((s|l|g|aq)\)$/i, "");
}
function safeCounts(f: string): Counts {
  try {
    return parseFormula(f);
  } catch {
    return {};
  }
}
const isElement = (f: string) => Object.keys(safeCounts(f)).length === 1;
const elemOf = (f: string) => Object.keys(safeCounts(f))[0];

/** Molecular form of an element as it occurs naturally. */
function elementForm(sym: string) {
  if (["H", "N", "O", "F", "Cl", "Br", "I"].includes(sym)) return `${sym}2`;
  if (sym === "P") return "P4";
  if (sym === "S") return "S8";
  return sym;
}

function oxideOf(sym: string, c: Counts): string {
  switch (sym) {
    case "C": return "CO2";
    case "H": return "H2O";
    case "S": return "SO2";
    case "N": return "N2";
    case "B": return "B2O3";
    case "Si": return "SiO2";
    case "P": return "P4O10";
    case "Al": return "Al2O3";
    case "F": case "Cl": case "Br": case "I": return c.H ? `H${sym}` : `${sym}2`;
    case "O": return "";
  }
  if (isMetal(sym)) return salt(sym, cationCharge(sym), "O", -2);
  return `${sym}O2`;
}

function formatCounts(c: Counts, order?: string[]) {
  const keys = Object.keys(c);
  const ord = order ? [...order.filter((k) => c[k]), ...keys.filter((k) => !order.includes(k))] : keys;
  return ord.map((k) => `${k}${c[k] > 1 ? c[k] : ""}`).join("");
}

const ACTIVITY = ["Li", "K", "Ba", "Ca", "Na", "Mg", "Al", "Zn", "Cr", "Fe", "Ni", "Sn", "Pb", "H", "Cu", "Hg", "Ag", "Pt", "Au"];
const STRONG_ACIDS = /^H(Cl|Br|I|NO3|ClO4)$|^H2SO4$/;

function acidAnion(f: string): { an: string; nH: number } | null {
  if (f === "H2O" || f === "H2O2" || !/^H\d*[A-Z(]/.test(f)) return null;
  const m = f.match(/^H(\d*)(.+)$/);
  if (!m) return null;
  const an = m[2];
  if (POLY_ANIONS[an] === undefined && MONO_ANION[an] === undefined) return null;
  if (an === "H") return null;
  return { an, nH: Number(m[1] || 1) };
}

/* ---------- prediction ---------- */

export type ReactionType = "Combustion" | "Precipitation" | "Acid-Base" | "Redox" | "Complexation" | "Hydrolysis" | "Double displacement" | "Synthesis" | "Single displacement" | "Gas evolution" | "Dissolution" | "Decomposition";

export interface Species { formula: string; coef: number; state: State; mark?: "↓" | "↑" }
export interface Prediction {
  type: ReactionType;
  reactants: Species[];
  products: Species[];
  equation: string;
  observation: string;
  conditions: string;
  note?: string;
}

interface Raw { type: ReactionType; products: string[]; observation: string; conditions: string; note?: string }

const KNOWN: Record<string, Raw> = {
  "AlCl3|H2O": { type: "Hydrolysis", products: ["Al(OH)3", "HCl"], observation: "Violent fuming; white gelatinous Al(OH)₃ forms and HCl gas/mist is released. Solution turns acidic.", conditions: "Room temperature, excess water" },
  "B2H6|O2": { type: "Combustion", products: ["B2O3", "H2O"], observation: "Diborane ignites spontaneously with a brilliant green flame; very exothermic (ΔH ≈ −2035 kJ/mol).", conditions: "Spontaneous in air (pyrophoric)" },
  "H2O|UF6": { type: "Hydrolysis", products: ["UO2F2", "HF"], observation: "UF₆ reacts vigorously with moisture forming a white smoke of uranyl fluoride and highly toxic HF.", conditions: "Room temperature, moist air" },
  "AgNO3|NaCl": { type: "Precipitation", products: ["AgCl", "NaNO3"], observation: "Dense white curdy precipitate of AgCl appears instantly; darkens in light.", conditions: "Aqueous solutions, room temperature" },
  "FeCl3|K4[Fe(CN)6]": { type: "Complexation", products: ["Fe4[Fe(CN)6]3", "KCl"], observation: "Deep intense blue precipitate — Prussian blue (iron(III) hexacyanoferrate(II)).", conditions: "Aqueous solutions, room temperature" },
  "CH4|O2": { type: "Combustion", products: ["CO2", "H2O"], observation: "Clean blue flame; heat and light released (ΔH ≈ −890 kJ/mol).", conditions: "Ignition" },
  "H2|O2": { type: "Combustion", products: ["H2O"], observation: "Explosive pop; water vapour forms (ΔH ≈ −286 kJ/mol).", conditions: "Spark / ignition" },
  "Na|H2O": { type: "Redox", products: ["NaOH", "H2"], observation: "Sodium darts on the surface, fizzes and may ignite with a yellow flame.", conditions: "Room temperature" },
  "HCl|NaOH": { type: "Acid-Base", products: ["NaCl", "H2O"], observation: "No visible change; solution warms (ΔH ≈ −57 kJ/mol).", conditions: "Aqueous, room temperature" },
  "CaCO3|HCl": { type: "Gas evolution", products: ["CaCl2", "H2O", "CO2"], observation: "Effervescence — CO₂ bubbles; solid dissolves.", conditions: "Aqueous, room temperature" },
  "Fe(NO3)3|KSCN": { type: "Complexation", products: ["Fe(SCN)3", "KNO3"], observation: "Blood-red colour of iron(III) thiocyanate.", conditions: "Aqueous" },
  "CuSO4|NH3": { type: "Complexation", products: ["[Cu(NH3)4]SO4"], observation: "Pale blue precipitate dissolves into deep royal-blue tetraamminecopper(II).", conditions: "Excess aqueous ammonia" },
};

const OBS: Record<ReactionType, string> = {
  Combustion: "Burns releasing heat and light; oxides formed.",
  Precipitation: "An insoluble solid precipitates out of solution.",
  "Acid-Base": "Neutralisation — salt and water form; solution warms.",
  Redox: "Electron transfer — oxidation states change; heat often released.",
  Complexation: "Coordination complex forms, often with a distinct colour change.",
  Hydrolysis: "Water cleaves the compound; acidic or basic solution results.",
  "Double displacement": "Ions exchange partners; all products stay dissolved (no visible change).",
  Synthesis: "Elements combine directly into a compound, usually exothermically.",
  "Single displacement": "The more reactive metal displaces the less reactive one; metal coating appears.",
  "Gas evolution": "Effervescence — gas bubbles are released.",
  Dissolution: "Substance dissolves and dissociates into hydrated ions.",
  Decomposition: "Compound breaks down into simpler substances.",
};

function rule(a: string, b: string): Raw {
  const key = [a, b].sort().join("|");
  if (KNOWN[key]) return KNOWN[key];
  const pair = (x: string, y: string, t: (p: string, q: string) => Raw | null) => t(x, y) ?? t(y, x);
  const ca = safeCounts(a), cb = safeCounts(b);

  // Combustion / oxidation
  const comb = pair(a, b, (p, q) => {
    if (q !== "O2") return null;
    const c = safeCounts(p);
    const prods = Array.from(new Set(Object.keys(c).map((s) => oxideOf(s, c)).filter(Boolean)));
    if (!prods.length) return null;
    const organic = c.C || c.H || c.B;
    return { type: organic ? "Combustion" : "Redox", products: prods, observation: OBS[organic ? "Combustion" : "Redox"], conditions: "Heat / ignition in air" };
  });
  if (comb) return comb;

  // Acid + base / carbonate / metal / oxide
  const ab = pair(a, b, (p, q) => {
    const ac = acidAnion(p);
    if (!ac) return null;
    const aCharge = POLY_ANIONS[ac.an] ?? MONO_ANION[ac.an];
    if (q === "NH3") return { type: "Acid-Base", products: [salt("NH4", 1, ac.an, aCharge)], observation: "White fumes / ammonium salt forms.", conditions: "Room temperature" };
    if (isElement(q) && isMetal(elemOf(q))) {
      const m = elemOf(q);
      const below = ACTIVITY.indexOf(m) > ACTIVITY.indexOf("H") && ACTIVITY.indexOf(m) !== -1;
      if (below && !STRONG_ACIDS.test(p)) return null;
      return { type: "Redox", products: [salt(m, cationCharge(m), ac.an, aCharge), "H2"], observation: "Metal dissolves with effervescence of hydrogen gas.", conditions: "Dilute acid, room temperature" };
    }
    const io = splitIonic(q);
    if (!io) return null;
    const s = salt(io.cat, io.cc, ac.an, aCharge);
    if (io.an === "OH") return { type: "Acid-Base", products: [s, "H2O"], observation: OBS["Acid-Base"], conditions: "Aqueous, room temperature" };
    if (io.an === "CO3" || io.an === "HCO3") return { type: "Gas evolution", products: [s, "H2O", "CO2"], observation: "Effervescence of CO₂ gas.", conditions: "Aqueous, room temperature" };
    if (io.an === "O") return { type: "Acid-Base", products: [s, "H2O"], observation: "Basic oxide dissolves in the acid forming a salt solution.", conditions: "Warm dilute acid" };
    if (io.an === "S") return { type: "Gas evolution", products: [s, "H2S"], observation: "Rotten-egg smell of H₂S gas.", conditions: "Room temperature" };
    return null;
  });
  if (ab) return ab;

  // Water reactions
  const wat = pair(a, b, (p, q) => {
    if (q !== "H2O") return null;
    const c = safeCounts(p);
    if (isElement(p)) {
      const m = elemOf(p);
      if (isMetal(m) && ACTIVITY.indexOf(m) > -1 && ACTIVITY.indexOf(m) <= ACTIVITY.indexOf("Mg"))
        return { type: "Redox", products: [salt(m, cationCharge(m), "OH", -1), "H2"], observation: "Metal reacts with water releasing hydrogen gas.", conditions: "Room temperature (Mg: hot water)" };
      if (m === "Cl" || m === "Br") return { type: "Redox", products: [`H${m}`, `H${m}O`], observation: "Disproportionation — bleaching solution forms.", conditions: "Room temperature" };
    }
    const io = splitIonic(p);
    if (io && io.an === "O") return { type: "Hydrolysis", products: [salt(io.cat, io.cc, "OH", -1)], observation: "Basic oxide dissolves forming an alkaline hydroxide.", conditions: "Room temperature" };
    if (io && !io.poly && MONO_ANION[io.an] === -1 && io.an !== "H") {
      const alk = ["alkali metal", "alkaline earth metal"].includes(BY_SYMBOL[io.cat]?.c ?? "") && io.cat !== "Be";
      if (!alk) return { type: "Hydrolysis", products: [salt(io.cat, io.cc, "OH", -1), `H${io.an}`], observation: OBS.Hydrolysis, conditions: "Excess water" };
    }
    if (io && io.an === "H") return { type: "Redox", products: [salt(io.cat, io.cc, "OH", -1), "H2"], observation: "Hydride releases hydrogen gas vigorously.", conditions: "Room temperature" };
    // non-metal halides / oxides → oxo-acids
    const syms = Object.keys(c);
    const hal = syms.find((s) => ["F", "Cl", "Br", "I"].includes(s));
    const centre = syms.find((s) => s !== hal && s !== "O" && s !== "H");
    if (hal && centre && !isMetal(centre)) {
      const n = c[hal];
      return { type: "Hydrolysis", products: [formatCounts({ H: n, [centre]: c[centre], O: n } as Counts, ["H", centre, "O"]), `H${hal}`], observation: OBS.Hydrolysis, conditions: "Excess water" };
    }
    if (syms.length === 2 && c.O && centre && !isMetal(centre)) {
      return { type: "Synthesis", products: [formatCounts({ H: 2, [centre]: c[centre], O: c.O + 1 } as Counts, ["H", centre, "O"])], observation: "Acidic oxide dissolves forming an oxo-acid; pH drops.", conditions: "Room temperature" };
    }
    return null;
  });
  if (wat) return wat;

  // Salt metathesis
  const ia = splitIonic(a), ib = splitIonic(b);
  if (ia && ib) {
    const p1 = salt(ia.cat, ia.cc, ib.an, ib.ac);
    const p2 = salt(ib.cat, ib.cc, ia.an, ia.ac);
    const ppt = isInsoluble(p1) || isInsoluble(p2);
    const complex = /CN|SCN|Fe\(CN\)6/.test(ia.an + ib.an);
    const type: ReactionType = complex ? "Complexation" : ppt ? "Precipitation" : "Double displacement";
    return { type, products: [p1, p2], observation: OBS[type], conditions: "Aqueous solutions, room temperature" };
  }

  // Metal + salt (single displacement) / metal + non-metal (synthesis)
  const disp = pair(a, b, (p, q) => {
    if (!isElement(p)) return null;
    const m = elemOf(p);
    const io = splitIonic(q);
    if (isMetal(m) && io && ACTIVITY.includes(m) && ACTIVITY.includes(io.cat) && ACTIVITY.indexOf(m) < ACTIVITY.indexOf(io.cat))
      return { type: "Single displacement", products: [salt(m, cationCharge(m), io.an, io.ac), elementForm(io.cat)], observation: OBS["Single displacement"], conditions: "Aqueous, room temperature" };
    if (isMetal(m) && isElement(q) && MONO_ANION[elemOf(q)] !== undefined)
      return { type: "Synthesis", products: [salt(m, cationCharge(m), elemOf(q), MONO_ANION[elemOf(q)])], observation: OBS.Synthesis, conditions: "Heat" };
    return null;
  });
  if (disp) return disp;

  // Two non-metal elements → binary compound
  if (isElement(a) && isElement(b)) {
    const x = elemOf(a), y = elemOf(b);
    const [lo, hi] = (BY_SYMBOL[x].en ?? 0) <= (BY_SYMBOL[y].en ?? 0) ? [x, y] : [y, x];
    const val = Math.abs(MONO_ANION[hi] ?? -1);
    const loVal = lo === "H" ? 1 : lo === "C" ? 4 : lo === "N" ? 3 : lo === "S" ? 2 : lo === "P" ? 3 : 1;
    return { type: "Synthesis", products: [lo === "H" ? salt("H", 1, hi, -val).replace(/^H(\d*)(.*)/, "H$1$2") : salt(lo, loVal, hi, -val)], observation: OBS.Synthesis, conditions: "Heat / spark" };
  }

  // Lewis acid–base adduct (always gives a product)
  const merged: Counts = { ...ca };
  for (const [k, v] of Object.entries(cb)) merged[k] = (merged[k] ?? 0) + v;
  return { type: "Complexation", products: [`${a}·${b}`], observation: "Lewis acid–base adduct / coordination compound forms by donor → acceptor bonding.", conditions: "Room temperature, inert solvent", note: `Combined formula ${formatCounts(merged)}` };
}

export function predict(aIn: string, bIn: string, conditions?: string): Prediction {
  const a = clean(aIn), b = clean(bIn);
  for (const f of [a, b]) parseFormula(f); // throws a friendly error on typos
  const r = rule(a, b);
  const prods = r.products.filter((p) => p && p !== a && p !== b);
  let coeffs: number[] = [];
  try {
    coeffs = balanceEquation(`${a} + ${b} -> ${prods.join(" + ")}`).coeffs;
  } catch {
    coeffs = [1, 1, ...prods.map(() => 1)];
  }
  const sp = (f: string, i: number, isP: boolean): Species => {
    let state = stateOf(f, isP);
    if (r.type === "Combustion" && f === "H2O") state = "g";
    const mark = isP ? (state === "s" && splitIonic(f) ? "↓" : state === "g" ? "↑" : undefined) : undefined;
    return { formula: f, coef: coeffs[i], state, mark };
  };
  const reactants = [sp(a, 0, false), sp(b, 1, false)];
  const products = prods.map((p, i) => sp(p, i + 2, true));
  const fmt = (s: Species) => `${s.coef > 1 ? s.coef : ""}${s.formula}(${s.state})${s.mark ?? ""}`;
  return {
    type: r.type,
    reactants,
    products,
    equation: `${reactants.map(fmt).join(" + ")} → ${products.map(fmt).join(" + ")}`,
    observation: r.observation,
    conditions: conditions?.trim() || r.conditions,
    note: r.note,
  };
}
