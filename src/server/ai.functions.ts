import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYS =
  "You are an expert chemist and pharmacologist. Answer with accurate, concise, factual data. If a value is unknown, use null or 'Not well established'. Never invent medicine brand names you are unsure about.";

const compoundSchema = z.object({
  summary: z.string(),
  hybridization: z.array(z.object({ atom: z.string(), type: z.string(), geometry: z.string(), bondAngle: z.string() })),
  polarity: z.string(),
  solubility: z.string(),
  density: z.string().nullable(),
  meltingPoint: z.string().nullable(),
  boilingPoint: z.string().nullable(),
  acidBase: z.string(),
  reactivity: z.string(),
  approxCost: z.string(),
  uses: z.array(z.string()),
  medical: z.array(z.object({ medicine: z.string(), treats: z.string(), mechanism: z.string() })),
  industrial: z.array(z.string()),
  limitations: z.array(z.string()),
  toxicity: z.string(),
  naturalSources: z.array(z.string()),
});
export type CompoundInsights = z.infer<typeof compoundSchema>;

export const getCompoundInsights = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; formula?: string; smiles?: string }) => d)
  .handler(async ({ data }) => {
    const { aiObject } = await import("./gateway.server");
    return aiObject(
      compoundSchema,
      SYS,
      `Give a full chemistry profile for "${data.name}" (formula ${data.formula ?? "?"}, SMILES ${data.smiles ?? "?"}). Hybridization: list key atoms (e.g. "C1 (carbonyl)") with sp/sp2/sp3, geometry and bond angle. Provide 3-6 items in each list. Medical: real medicines that contain it, the disease treated and the mechanism; empty array if none. Cost like "~$20/kg (lab grade)".`,
    );
  });

const reactionSchema = z.object({
  reacts: z.boolean(),
  equation: z.string(),
  reactionType: z.string(),
  conditions: z.string(),
  products: z.array(z.object({ name: z.string(), formula: z.string(), smiles: z.string().nullable() })),
  enthalpy: z.string(),
  thermicity: z.enum(["exothermic", "endothermic", "neutral", "unknown"]),
  activationEnergyLevel: z.enum(["low", "medium", "high"]),
  mechanism: z.array(z.object({ title: z.string(), detail: z.string() })),
  safety: z.string(),
  explanation: z.string(),
});
export type ReactionPrediction = z.infer<typeof reactionSchema>;

export const predictReaction = createServerFn({ method: "POST" })
  .inputValidator((d: { reactants: { name: string; formula?: string; smiles?: string }[]; conditions?: string }) => d)
  .handler(async ({ data }) => {
    const { aiObject } = await import("./gateway.server");
    const list = data.reactants.map((r) => `${r.name} (${r.formula ?? ""}${r.smiles ? `, SMILES ${r.smiles}` : ""})`).join(" + ");
    return aiObject(
      reactionSchema,
      SYS,
      `Predict the most likely chemical reaction between: ${list}. Conditions given by user: ${data.conditions || "standard / typical lab conditions"}. Return a correctly BALANCED equation using formulas and → arrow, the reaction type (e.g. acid-base neutralization, nucleophilic substitution, addition, redox, esterification, combustion, precipitation), products with common names, molecular formulas and valid SMILES, the standard enthalpy change (e.g. "ΔH ≈ -57 kJ/mol"), 3-5 mechanism steps. If no meaningful reaction occurs, set reacts=false and explain.`,
    );
  });

const elementSchema = z.object({
  discoveryYear: z.string(),
  uses: z.array(z.string()),
  occurrence: z.string(),
  oxideNature: z.string(),
  isotopes: z.array(z.object({ isotope: z.string(), abundance: z.string(), note: z.string() })),
  funFact: z.string(),
});
export type ElementFacts = z.infer<typeof elementSchema>;

export const getElementFacts = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; symbol: string }) => d)
  .handler(async ({ data }) => {
    const { aiObject } = await import("./gateway.server");
    return aiObject(
      elementSchema,
      SYS,
      `For the element ${data.name} (${data.symbol}): discovery year, 4-6 main uses, where it is found in nature, nature of its oxides (acidic/basic/amphoteric/neutral with example oxide), up to 4 notable isotopes with natural abundance, and one fun fact.`,
    );
  });

const spectraSchema = z.object({
  ir: z.array(z.object({ wavenumber: z.number(), intensity: z.number(), group: z.string() })),
  hnmr: z.array(z.object({ shift: z.number(), integration: z.number(), multiplicity: z.string(), assignment: z.string() })),
  cnmr: z.array(z.object({ shift: z.number(), assignment: z.string() })),
  notes: z.string(),
});
export type Spectra = z.infer<typeof spectraSchema>;

export const predictSpectra = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; smiles: string }) => d)
  .handler(async ({ data }) => {
    const { aiObject } = await import("./gateway.server");
    return aiObject(
      spectraSchema,
      SYS,
      `Predict the spectra of ${data.name} (SMILES ${data.smiles}). IR: 5-10 characteristic absorption bands (wavenumber cm-1, intensity 0-1 where 1 is strongest absorption, functional group). 1H NMR in CDCl3: each distinct proton environment (shift ppm, integration H count, multiplicity like s/d/t/q/m, assignment). 13C NMR: each carbon environment. Empty arrays where not applicable.`,
    );
  });
