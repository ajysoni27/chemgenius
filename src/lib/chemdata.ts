import raw from "@/data/chemistryData.json";

export interface ChemEl {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  molarMass: number;
  density: number | null;
  meltingPointC: number | null;
  boilingPointC: number | null;
  meltingPointK: number | null;
  boilingPointK: number | null;
  stateAtSTP: string;
  stateChangeInfo: string;
  pH_Tendency: string;
  electronegativity: number | null;
}

export const CHEM: ChemEl[] = raw as ChemEl[];
export const CHEM_BY_SYMBOL: Record<string, ChemEl> = Object.fromEntries(CHEM.map((e) => [e.symbol, e]));

export type Phase = "Solid" | "Liquid" | "Gas" | "Unknown";
/** Phase of an element at a temperature in °C (1 atm), from its melting/boiling points. */
export function phaseAt(e: ChemEl, tempC: number): Phase {
  const mp = e.meltingPointC;
  const bp = e.boilingPointC;
  if (mp == null && bp == null) return "Unknown";
  if (bp != null && tempC >= bp) return "Gas";
  if (mp != null && tempC < mp) return "Solid";
  if (mp == null) return "Unknown";
  return "Liquid";
}

export const PHASE_STYLE: Record<Phase, string> = {
  Solid: "bg-el-metal/20 text-el-metal border-el-metal/50",
  Liquid: "bg-neon/20 text-neon border-neon/50",
  Gas: "bg-el-halogen/20 text-el-halogen border-el-halogen/50",
  Unknown: "bg-muted text-muted-foreground border-border",
};
