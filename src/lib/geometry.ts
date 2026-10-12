import { BY_SYMBOL } from "./chem";
import { clean, isMetal, splitIonic } from "./reactions";

export type V3 = [number, number, number];
export interface Atom { el: string; p: V3 }
export interface Bond { a: number; b: number; order: number } // order 0 = ionic
export interface Mol { atoms: Atom[]; bonds: Bond[]; geometry: string }

const COV: Record<string, number> = { H: 0.31, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Br: 1.2, I: 1.39, Fe: 1.32, U: 1.96, Na: 1.66, K: 2.03, Ag: 1.45, Cu: 1.32 };
export const covRadius = (el: string) => COV[el] ?? (isMetal(el) ? 1.45 : 1.0);
const bondLen = (a: string, b: string, order: number) => (covRadius(a) + covRadius(b)) * (order >= 3 ? 0.78 : order === 2 ? 0.87 : 1);

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return scale(a, 1 / l);
};
export const dist = (a: V3, b: V3) => Math.hypot(...sub(a, b));
export function angle(a: V3, c: V3, b: V3) {
  return (Math.acos(Math.max(-1, Math.min(1, dot(norm(sub(a, c)), norm(sub(b, c)))))) * 180) / Math.PI;
}
/** Rotation (Rodrigues) that maps unit vector u onto v. */
function rotator(u: V3, v: V3) {
  const k = cross(u, v);
  const s = Math.hypot(...k), c = dot(u, v);
  if (s < 1e-6) return c > 0 ? (p: V3) => p : (p: V3): V3 => [-p[0], -p[1], p[2]];
  const ax = scale(k, 1 / s);
  return (p: V3): V3 => add(add(scale(p, c), scale(cross(ax, p), s)), scale(ax, dot(ax, p) * (1 - c)));
}

const LONE_PAIR_2 = new Set(["O", "S", "Se", "Te"]);
const LONE_PAIR_3 = new Set(["N", "P", "As", "Sb"]);

function directions(n: number, central: string): { dirs: V3[]; name: string } {
  const t = (deg: number) => (deg * Math.PI) / 180;
  if (n === 1) return { dirs: [[1, 0, 0]], name: "Linear" };
  if (n === 2) {
    if (LONE_PAIR_2.has(central)) {
      const h = t(104.5 / 2);
      return { dirs: [[Math.sin(h), -Math.cos(h), 0], [-Math.sin(h), -Math.cos(h), 0]], name: "Bent" };
    }
    return { dirs: [[1, 0, 0], [-1, 0, 0]], name: "Linear" };
  }
  if (n === 3) {
    if (LONE_PAIR_3.has(central)) {
      const z = -0.33;
      const r = Math.sqrt(1 - z * z);
      return { dirs: [0, 120, 240].map((d) => [r * Math.cos(t(d)), z, r * Math.sin(t(d))] as V3), name: "Trigonal pyramidal" };
    }
    return { dirs: [90, 210, 330].map((d) => [Math.cos(t(d)), Math.sin(t(d)), 0] as V3), name: "Trigonal planar" };
  }
  if (n === 4) return { dirs: ([[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]] as V3[]).map(norm), name: "Tetrahedral" };
  if (n === 5) return { dirs: [[0, 1, 0], [0, -1, 0], ...[0, 120, 240].map((d) => [Math.cos(t(d)), 0, Math.sin(t(d))] as V3)], name: "Trigonal bipyramidal" };
  if (n === 6) return { dirs: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], name: "Octahedral" };
  const dirs: V3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
    dirs.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  return { dirs, name: `${n}-coordinate` };
}

interface Unit { f: string; n: number; group: boolean }
function units(s: string): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if ("([{".includes(ch)) {
      let d = 1, j = i + 1;
      while (j < s.length && d) {
        if ("([{".includes(s[j])) d++;
        if (")]}".includes(s[j])) d--;
        j++;
      }
      const inner = s.slice(i + 1, j - 1);
      let num = "";
      while (j < s.length && /\d/.test(s[j])) num += s[j++];
      out.push({ f: inner, n: Number(num || 1), group: true });
      i = j;
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      i++;
      while (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
      let num = "";
      while (i < s.length && /\d/.test(s[i])) num += s[i++];
      out.push({ f: sym, n: Number(num || 1), group: false });
    } else i++;
  }
  // merge repeated plain element units (e.g. CH3COOH → C2H4O2 style chains handled by fallback)
  return out;
}

function merge(target: Mol, m: Mol, off: V3 = [0, 0, 0], tf?: (p: V3) => V3) {
  const base = target.atoms.length;
  for (const a of m.atoms) target.atoms.push({ el: a.el, p: add(tf ? tf(a.p) : a.p, off) });
  for (const b of m.bonds) target.bonds.push({ a: b.a + base, b: b.b + base, order: b.order });
  return base;
}

function centroid(m: Mol): V3 {
  const s = m.atoms.reduce<V3>((acc, a) => add(acc, a.p), [0, 0, 0]);
  return scale(s, 1 / Math.max(1, m.atoms.length));
}

function terminalOrder(central: string, lig: string, idx: number, hasH: boolean) {
  if (lig !== "O" && lig !== "S" && lig !== "N") return 1;
  if (isMetal(central) && central !== "U") return 1;
  if (central === "U" || central === "C" || central === "S") return hasH ? 1 : 2;
  if (central === "N" || central === "P" || central === "Cl") return idx === 0 && !hasH ? 2 : 1;
  return 1;
}

const B2H6: Mol = {
  geometry: "Bridged (3c–2e B–H–B bonds)",
  atoms: [
    { el: "B", p: [-0.89, 0, 0] }, { el: "B", p: [0.89, 0, 0] },
    { el: "H", p: [0, 0.99, 0] }, { el: "H", p: [0, -0.99, 0] },
    { el: "H", p: [-1.5, 0, 1.04] }, { el: "H", p: [-1.5, 0, -1.04] },
    { el: "H", p: [1.5, 0, 1.04] }, { el: "H", p: [1.5, 0, -1.04] },
  ],
  bonds: [[0, 2], [1, 2], [0, 3], [1, 3], [0, 4], [0, 5], [1, 6], [1, 7]].map(([a, b]) => ({ a, b, order: 1 })),
};

function covalent(f: string, depth = 0): Mol {
  if (f === "B2H6") return structuredClone(B2H6);
  const us = units(f);
  const mol: Mol = { atoms: [], bonds: [], geometry: "" };
  if (!us.length) return mol;

  // pure element
  if (us.length === 1 && !us[0].group) {
    const { f: el, n } = us[0];
    if (n === 1) return { atoms: [{ el, p: [0, 0, 0] }], bonds: [], geometry: "Single atom" };
    const order = el === "N" ? 3 : el === "O" ? 2 : 1;
    if (n === 2) {
      const d = bondLen(el, el, order) / 2;
      return { atoms: [{ el, p: [-d, 0, 0] }, { el, p: [d, 0, 0] }], bonds: [{ a: 0, b: 1, order }], geometry: "Linear (diatomic)" };
    }
    if (n === 3 && el === "O") {
      const h = (117 / 2) * (Math.PI / 180), d = 1.28;
      return { atoms: [{ el, p: [0, 0.3, 0] }, { el, p: [d * Math.sin(h), 0.3 - d * Math.cos(h), 0] }, { el, p: [-d * Math.sin(h), 0.3 - d * Math.cos(h), 0] }], bonds: [{ a: 0, b: 1, order: 2 }, { a: 0, b: 2, order: 1 }], geometry: "Bent" };
    }
    const R = (bondLen(el, el, 1) / 2) / Math.sin(Math.PI / n);
    for (let i = 0; i < n; i++) mol.atoms.push({ el, p: [R * Math.cos((i * 2 * Math.PI) / n), R * Math.sin((i * 2 * Math.PI) / n), i % 2 ? 0.4 : -0.4] });
    for (let i = 0; i < n; i++) mol.bonds.push({ a: i, b: (i + 1) % n, order: 1 });
    return { ...mol, geometry: `Ring (${el}${n})` };
  }

  // choose central atom
  const cands = us.filter((u) => !u.group && u.n === 1 && u.f !== "H");
  if (cands.length || (us.length === 2 && us.every((u) => !u.group && u.n === 1))) {
    const pool = cands.length ? cands : us;
    const central = [...pool].sort((x, y) => {
      const mx = isMetal(x.f) ? -10 : 0, my = isMetal(y.f) ? -10 : 0;
      return mx + (BY_SYMBOL[x.f]?.en ?? 2) - (my + (BY_SYMBOL[y.f]?.en ?? 2));
    })[0];
    const ligs: { f: string; group: boolean }[] = [];
    let skipped = false;
    for (const u of us) for (let k = 0; k < u.n; k++) {
      if (u === central && !skipped) { skipped = true; continue; }
      ligs.push({ f: u.f, group: u.group });
    }
    // expand multi-atom element ligands like "O2" handled by count already
    const { dirs, name } = directions(ligs.length, central.f);
    mol.atoms.push({ el: central.f, p: [0, 0, 0] });
    const hasH = ligs.some((l) => l.f === "H");
    ligs.forEach((l, i) => {
      const d = dirs[i];
      if (!l.group && /^[A-Z][a-z]?$/.test(l.f)) {
        const order = terminalOrder(central.f, l.f, i, hasH);
        mol.atoms.push({ el: l.f, p: scale(d, bondLen(central.f, l.f, order)) });
        mol.bonds.push({ a: 0, b: mol.atoms.length - 1, order });
      } else {
        const sm = depth < 3 ? covalent(l.f, depth + 1) : { atoms: [{ el: "C", p: [0, 0, 0] as V3 }], bonds: [], geometry: "" };
        if (!sm.atoms.length) return;
        const anchor = sm.atoms[0];
        const shifted = sm.atoms.map((a) => sub(a.p, anchor.p));
        const c = centroid({ ...sm, atoms: sm.atoms.map((a, j) => ({ el: a.el, p: shifted[j] })) });
        const tf = Math.hypot(...c) > 1e-3 ? rotator(norm(c), d) : (p: V3) => p;
        const tri = l.f === "CN" || l.f === "NC";
        const len = bondLen(central.f, anchor.el, 1);
        const base = merge(mol, { ...sm, atoms: sm.atoms.map((a, j) => ({ el: a.el, p: shifted[j] })), bonds: sm.bonds.map((b) => ({ ...b, order: tri ? 3 : b.order })) }, scale(d, len), tf);
        mol.bonds.push({ a: 0, b: base, order: 1 });
      }
    });
    return { ...mol, geometry: name };
  }

  // chain fallback (B2O3, C2H6, Fe2O3…)
  const heavy: string[] = [];
  const hs: string[] = [];
  const expand = (s: string, mult: number) => {
    for (const u of units(s)) for (let k = 0; k < u.n * mult; k++) {
      if (u.group) expand(u.f, 1);
      else (u.f === "H" ? hs : heavy).push(u.f);
    }
  };
  expand(f, 1);
  const kinds = Array.from(new Set(heavy));
  const groups = kinds.map((k) => heavy.filter((h) => h === k)).sort((a, b) => b.length - a.length);
  const chain: string[] = [];
  const maj = groups[0] ?? [], rest = groups.slice(1).flat();
  for (let i = 0; i < maj.length; i++) {
    chain.push(maj[i]);
    if (rest[i]) chain.push(rest[i]);
  }
  for (let i = maj.length; i < rest.length; i++) chain.push(rest[i]);
  let x = 0;
  chain.forEach((el, i) => {
    if (i) x += bondLen(chain[i - 1], el, 1) * 0.85;
    mol.atoms.push({ el, p: [x, i % 2 ? 0.55 : -0.55, 0] });
    if (i) mol.bonds.push({ a: i - 1, b: i, order: 1 });
  });
  hs.forEach((_, i) => {
    const host = i % chain.length;
    const hp = mol.atoms[host].p;
    const ang = (i / Math.max(1, chain.length)) * 2.1 + (host % 2 ? 0 : Math.PI);
    mol.atoms.push({ el: "H", p: add(hp, [0.3 * Math.cos(ang), (host % 2 ? 1 : -1) * 0.9, Math.sin(ang) * 0.9]) });
    mol.bonds.push({ a: host, b: mol.atoms.length - 1, order: 1 });
  });
  const c = centroid(mol);
  mol.atoms.forEach((a) => (a.p = sub(a.p, c)));
  return { ...mol, geometry: "Extended network (fragment)" };
}

/** Build an approximate 3D model for any formula (molecules, salts, complexes, hydrates). */
export function buildMolecule(input: string): Mol {
  const f = clean(input).replace(/\^?\d*[+-]$/, "");
  // hydrates / adducts
  if (/[·.*]/.test(f)) {
    const parts = f.split(/[·.*]/).filter(Boolean);
    const out: Mol = { atoms: [], bonds: [], geometry: "" };
    let x = 0;
    const names: string[] = [];
    parts.forEach((p, idx) => {
      const m = p.match(/^(\d+)(.*)$/);
      const n = Math.min(m ? Number(m[1]) : 1, 6);
      const sm = buildMolecule(m ? m[2] : p);
      names.push(sm.geometry);
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        const off: V3 = idx === 0 ? [0, 0, 0] : [x + 3.2 + Math.cos(ang) * (n > 1 ? 2.2 : 0), Math.sin(ang) * (n > 1 ? 2.2 : 0), k % 2 ? 0.8 : -0.8];
        merge(out, sm, off);
      }
      x = Math.max(...out.atoms.map((a) => a.p[0]));
    });
    const c = centroid(out);
    out.atoms.forEach((a) => (a.p = sub(a.p, c)));
    return { ...out, geometry: names[0] + " + lattice/adduct partner" };
  }
  const io = splitIonic(f);
  if (io && io.poly) {
    const anion = covalent(io.an);
    const out: Mol = { atoms: [], bonds: [], geometry: `Ionic: ${io.cat}${io.cc > 0 ? `${io.cc}+` : ""} + ${anion.geometry.toLowerCase()} anion` };
    const nA = Math.min(io.nAn, 4);
    const r = Math.max(2.2, ...anion.atoms.map((a) => Math.hypot(...a.p))) + 1.2;
    const spacing = r * 1.9;
    for (let k = 0; k < nA; k++) merge(out, anion, [(k - (nA - 1) / 2) * spacing, 0, 0]);
    const nC = Math.min(io.nCat, 8);
    const anionAtoms = out.atoms.length;
    for (let k = 0; k < nC; k++) {
      const ang = (k / nC) * Math.PI * 2 + 0.4;
      const p: V3 = [Math.cos(ang) * (r + (nA - 1) * spacing * 0.5), Math.sin(ang) * r * 0.9, k % 2 ? r * 0.6 : -r * 0.6];
      out.atoms.push({ el: io.cat === "NH4" ? "N" : io.cat, p });
      let best = 0, bd = Infinity;
      for (let j = 0; j < anionAtoms; j++) {
        const d = dist(p, out.atoms[j].p);
        if (d < bd) { bd = d; best = j; }
      }
      out.bonds.push({ a: out.atoms.length - 1, b: best, order: 0 });
    }
    return out;
  }
  return covalent(f);
}

export interface BondInfo { label: string; length: number }
export function describe(m: Mol): { bonds: BondInfo[]; angle: { label: string; deg: number } | null } {
  const seen = new Map<string, number>();
  for (const b of m.bonds) {
    if (b.order === 0) continue;
    const A = m.atoms[b.a].el, B = m.atoms[b.b].el;
    const key = `${A}${b.order === 2 ? "=" : b.order === 3 ? "≡" : "–"}${B}`;
    if (!seen.has(key)) seen.set(key, dist(m.atoms[b.a].p, m.atoms[b.b].p));
  }
  let ang: { label: string; deg: number } | null = null;
  for (let c = 0; c < m.atoms.length && !ang; c++) {
    const nb = m.bonds.filter((b) => b.order > 0 && (b.a === c || b.b === c)).map((b) => (b.a === c ? b.b : b.a));
    if (nb.length >= 2) ang = { label: `${m.atoms[nb[0]].el}–${m.atoms[c].el}–${m.atoms[nb[1]].el}`, deg: angle(m.atoms[nb[0]].p, m.atoms[c].p, m.atoms[nb[1]].p) };
  }
  return { bonds: Array.from(seen, ([label, length]) => ({ label, length })).slice(0, 4), angle: ang };
}

export const CPK: Record<string, string> = {
  H: "#f5f5f5", C: "#1c1c1c", N: "#3050f8", O: "#ff2a2a", F: "#90e050", Cl: "#1ff01f", Br: "#a62929", I: "#940094",
  S: "#ffd123", P: "#ff8000", B: "#ffb5d0", Al: "#c8ccd4", Si: "#f0c8a0", U: "#00a83a", Fe: "#e06633", K: "#8f40d4",
  Na: "#ab5cf2", Ag: "#d8d8e0", Cu: "#c88033", Ca: "#3dff00", Mg: "#8aff00", Zn: "#7d80b0", Pb: "#575961", Li: "#cc80ff", Ba: "#00c900",
};
export const atomColor = (el: string) => CPK[el] ?? "#ff8fd0";
