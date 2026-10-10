import { describe, expect, it } from "vitest";
import { balanceEquation, molarMass, parseFormula, oxideBehaviour, BY_SYMBOL, ELEMENTS } from "@/lib/chem";

describe("chemistry logic", () => {
  it("has all 118 elements", () => expect(ELEMENTS.length).toBe(118));
  it("parses brackets and hydrates", () => {
    expect(parseFormula("Ca(OH)2")).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormula("CuSO4·5H2O")).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
  });
  it("computes molar mass of water", () => expect(molarMass("H2O").total).toBeCloseTo(18.015, 2));
  it("balances combustion of methane", () => expect(balanceEquation("CH4 + O2 -> CO2 + H2O").coeffs).toEqual([1, 2, 1, 2]));
  it("balances iron oxidation", () => expect(balanceEquation("Fe + O2 -> Fe2O3").coeffs).toEqual([4, 3, 2]));
  it("classifies oxides", () => {
    expect(oxideBehaviour(BY_SYMBOL.Na)).toBe("Basic oxide");
    expect(oxideBehaviour(BY_SYMBOL.S)).toBe("Acidic oxide");
    expect(oxideBehaviour(BY_SYMBOL.Al)).toBe("Amphoteric oxide");
  });
});
