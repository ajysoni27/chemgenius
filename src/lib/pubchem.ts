const BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PROPS =
  "Title,IUPACName,MolecularFormula,MolecularWeight,ExactMass,SMILES,ConnectivitySMILES,InChI,InChIKey,XLogP,TPSA,Charge,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount,Complexity";

export interface Compound {
  cid: number;
  title: string;
  iupac?: string;
  formula: string;
  mw: number;
  exactMass?: number;
  smiles: string;
  inchi?: string;
  inchikey?: string;
  xlogp?: number;
  tpsa?: number;
  charge?: number;
  hbd?: number;
  hba?: number;
  rotatable?: number;
  heavyAtoms?: number;
  complexity?: number;
}

type Raw = Record<string, string | number | undefined>;

function map(p: Raw): Compound {
  return {
    cid: Number(p.CID),
    title: String(p.Title ?? p.IUPACName ?? `CID ${p.CID}`),
    iupac: p.IUPACName as string | undefined,
    formula: String(p.MolecularFormula ?? ""),
    mw: Number(p.MolecularWeight ?? 0),
    exactMass: p.ExactMass !== undefined ? Number(p.ExactMass) : undefined,
    smiles: String(p.SMILES ?? p.ConnectivitySMILES ?? p.CanonicalSMILES ?? p.IsomericSMILES ?? ""),
    inchi: p.InChI as string | undefined,
    inchikey: p.InChIKey as string | undefined,
    xlogp: p.XLogP as number | undefined,
    tpsa: p.TPSA as number | undefined,
    charge: p.Charge as number | undefined,
    hbd: p.HBondDonorCount as number | undefined,
    hba: p.HBondAcceptorCount as number | undefined,
    rotatable: p.RotatableBondCount as number | undefined,
    heavyAtoms: p.HeavyAtomCount as number | undefined,
    complexity: p.Complexity as number | undefined,
  };
}

const memo = new Map<string, Promise<Compound[]>>();

async function propsBy(namespace: string, value: string, post = false): Promise<Compound[]> {
  const url = post
    ? `${BASE}/compound/${namespace}/property/${PROPS}/JSON`
    : `${BASE}/compound/${namespace}/${encodeURIComponent(value)}/property/${PROPS}/JSON`;
  const res = post
    ? await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `${namespace}=${encodeURIComponent(value)}` })
    : await fetch(url);
  if (!res.ok) return [];
  const j = await res.json();
  return (j?.PropertyTable?.Properties ?? []).map(map);
}

export function looksLikeFormula(q: string) {
  return /^([A-Z][a-z]?\d*)+$/.test(q.trim()) && /\d|[A-Z].*[A-Z]/.test(q.trim());
}
export function looksLikeSmiles(q: string) {
  return /[=#()[\]@\\/]/.test(q) || /^[cnosCNOSPFIBrl0-9]+$/.test(q) && /[a-z]/.test(q) && q.length > 3 && !/\s/.test(q);
}

/** Resolve a free-text query (name, IUPAC, formula, SMILES, InChI, or CID) to compounds. */
export function searchCompounds(query: string): Promise<Compound[]> {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  const key = q.toLowerCase();
  if (memo.has(key)) return memo.get(key)!;
  const p = (async () => {
    if (/^\d+$/.test(q)) return propsBy("cid", q);
    if (q.startsWith("InChI=")) return propsBy("inchi", q, true);
    const byName = await propsBy("name", q);
    if (byName.length) return byName.slice(0, 10);
    if (looksLikeSmiles(q) || /[=#()]/.test(q)) {
      const s = await propsBy("smiles", q, true);
      if (s.length) return s;
    }
    if (looksLikeFormula(q)) {
      const r = await fetch(`${BASE}/compound/fastformula/${encodeURIComponent(q)}/cids/JSON?MaxRecords=12`);
      if (r.ok) {
        const ids: number[] = (await r.json())?.IdentifierList?.CID ?? [];
        if (ids.length) return propsBy("cid", ids.slice(0, 12).join(","));
      }
    }
    const s = await propsBy("smiles", q, true);
    return s;
  })().catch(() => []);
  memo.set(key, p);
  return p;
}

export async function getCompound(query: string): Promise<Compound | null> {
  return (await searchCompounds(query))[0] ?? null;
}

export async function autocomplete(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  try {
    const r = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(q.trim())}/json?limit=8`);
    if (!r.ok) return [];
    return (await r.json())?.dictionary_terms?.compound ?? [];
  } catch {
    return [];
  }
}

export async function getSynonyms(cid: number): Promise<string[]> {
  try {
    const r = await fetch(`${BASE}/compound/cid/${cid}/synonyms/JSON`);
    if (!r.ok) return [];
    const list: string[] = (await r.json())?.InformationList?.Information?.[0]?.Synonym ?? [];
    return list.filter((s) => !/^\d|[A-Z0-9]{8,}|-\d{2,}-/.test(s)).slice(0, 10);
  } catch {
    return [];
  }
}

export async function getSdf(cid: number): Promise<{ sdf: string; is3d: boolean } | null> {
  const r3 = await fetch(`${BASE}/compound/cid/${cid}/record/SDF?record_type=3d`);
  if (r3.ok) return { sdf: await r3.text(), is3d: true };
  const r2 = await fetch(`${BASE}/compound/cid/${cid}/record/SDF?record_type=2d`);
  if (r2.ok) return { sdf: await r2.text(), is3d: false };
  return null;
}

export interface GhsInfo {
  signal?: string;
  pictograms: { code: string; label: string; url: string }[];
  hazards: string[];
}

export async function getGhs(cid: number): Promise<GhsInfo> {
  const out: GhsInfo = { pictograms: [], hazards: [] };
  try {
    const r = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=GHS+Classification`);
    if (!r.ok) return out;
    const text = JSON.stringify(await r.json());
    const j = JSON.parse(text);
    const seen = new Set<string>();
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === "object") {
        const n = node as Record<string, unknown>;
        if (n.Name === "Signal" && !out.signal) {
          const v = JSON.stringify(n.Value).match(/"String":"(Danger|Warning)"/);
          if (v) out.signal = v[1];
        }
        if (n.Type === "Icon" && typeof n.URL === "string") {
          const code = n.URL.match(/GHS\d+/)?.[0];
          if (code && !seen.has(code)) {
            seen.add(code);
            out.pictograms.push({ code, label: String(n.Extra ?? code), url: n.URL });
          }
        }
        if (n.Name === "GHS Hazard Statements" && out.hazards.length === 0) {
          const arr = (n.Value as { StringWithMarkup?: { String: string }[] })?.StringWithMarkup ?? [];
          out.hazards = Array.from(new Set(arr.map((s) => s.String.replace(/\s*\[.*?\]\s*$/, "")))).slice(0, 12);
        }
        Object.values(n).forEach(walk);
      }
    };
    walk(j);
  } catch {
    /* ignore */
  }
  return out;
}

export const imageUrl = (cid: number) => `${BASE}/compound/cid/${cid}/PNG?image_size=300x300`;
