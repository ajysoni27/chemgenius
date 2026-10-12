import { describe, expect, it } from "vitest";
import { predict } from "@/lib/reactions";
import { buildMolecule } from "@/lib/geometry";
import { parseFormula } from "@/lib/chem";

const forms = (p: ReturnType<typeof predict>) => p.products.map((s) => s.formula);

describe("reaction lab pro", () => {
  it("parses every bracket type and hydrates", () => {
    expect(parseFormula("K4[Fe(CN)6]")).toEqual({ K: 4, Fe: 1, C: 6, N: 6 });
    expect(parseFormula("Na3{AlF6}")).toEqual({ Na: 3, Al: 1, F: 6 });
    expect(parseFormula("UO2(NO3)2")).toEqual({ U: 1, O: 8, N: 2 });
    expect(parseFormula("Og")).toEqual({ Og: 1 });
  });
  it("AlCl3 + H2O", () => {
    const p = predict("AlCl3", "H2O");
    expect(forms(p)).toEqual(["Al(OH)3", "HCl"]);
    expect(p.reactants.map((r) => r.coef).concat(p.products.map((r) => r.coef))).toEqual([1, 3, 1, 3]);
  });
  it("B2H6 + O2", () => expect(predict("B2H6", "O2").equation).toBe("B2H6(g) + 3O2(g) → B2O3(s) + 3H2O(g)↑"));
  it("UF6 + H2O", () => expect(forms(predict("UF6", "H2O"))).toEqual(["UO2F2", "HF"]));
  it("AgNO3 + NaCl precipitates", () => {
    const p = predict("AgNO3", "NaCl");
    expect(p.type).toBe("Precipitation");
    expect(p.products[0]).toMatchObject({ formula: "AgCl", mark: "↓" });
  });
  it("Prussian blue", () => {
    const p = predict("K4[Fe(CN)6]", "FeCl3");
    expect(forms(p)).toEqual(["Fe4[Fe(CN)6]3", "KCl"]);
    expect(p.reactants.map((r) => r.coef)).toEqual([3, 4]);
  });
  it("always yields a product", () => {
    for (const [a, b] of [["BF3", "NH3"], ["Xe", "Og"], ["Al2(SO4)3", "BaCl2"], ["Zn", "CuSO4"]]) expect(predict(a, b).products.length).toBeGreaterThan(0);
  });
  it("builds structures", () => {
    expect(buildMolecule("AlCl3").geometry).toBe("Trigonal planar");
    expect(buildMolecule("UF6").geometry).toBe("Octahedral");
    expect(buildMolecule("K4[Fe(CN)6]").atoms.length).toBe(17);
    expect(buildMolecule("B2H6").atoms.length).toBe(8);
  });
});
