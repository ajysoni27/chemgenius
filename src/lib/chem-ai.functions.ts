import { createServerFn } from "@tanstack/react-start";
import elementsData from "./elements-data.json";
import { POPULAR } from "./popular";

const SYSTEM_PROMPT = `You are SmartChemVision - World's Best Chemistry + Medicine Expert. You know 118 elements, 100M+ compounds (PubChem NIH), organic/inorganic/physical/analytical chemistry, plus pharma/medicine uses, mechanism, precautions, GHS safety, limitations, applications, dosage general info. For ANY user query (Why soft water is soft, what is buffer, aspirin formula etc) give: 1) Direct Accurate Answer 2) Explanation with equations 3) Uses 4) Applications 5) Limitations 6) Precautions & Safety 7) Medicine relevance if any. Never say 'No match' or 'try again'. If query is not a compound, explain it like a teacher. Reply in the user's language (e.g. Hindi/Hinglish if they write that way). Use plain text, no markdown asterisks.`;

const TOPICS: { k: RegExp; a: string }[] = [
  {
    k: /(soft|hard)\s*water|hardness/i,
    a: "Soft vs hard water\n\nWater is soft when it contains very few dissolved Ca²⁺ and Mg²⁺ ions. Hardness comes from these ions (as bicarbonates, sulfates, chlorides).\n\n- Temporary hardness (bicarbonates) is removed by boiling: Ca(HCO₃)₂ → CaCO₃↓ + H₂O + CO₂↑\n- Permanent hardness is removed by washing soda or ion exchange: CaSO₄ + Na₂CO₃ → CaCO₃↓ + Na₂SO₄\n- Soft water lathers easily with soap because no insoluble Ca/Mg soap scum forms.",
  },
  {
    k: /\bph\b/i,
    a: "pH (potential of hydrogen)\n\npH = −log[H⁺]. It measures how acidic or basic a solution is on a 0–14 scale at 25 °C.\n\n- pH < 7: acidic (lemon juice ≈ 2, stomach acid ≈ 1.5)\n- pH = 7: neutral (pure water)\n- pH > 7: basic (soap ≈ 10, NaOH solution ≈ 13)\n- Water: H₂O ⇌ H⁺ + OH⁻, Kw = 1×10⁻¹⁴\n\nUses: water quality, agriculture (soil pH), medicine (blood pH 7.35–7.45), food and cosmetics.\nSafety: very low or high pH liquids are corrosive — wear gloves and goggles.\n\nHindi: pH batata hai ki koi ghol kitna amliya (acidic) ya kshariya (basic) hai.",
  },
  {
    k: /buffer/i,
    a: "Buffer solution\n\nA buffer resists pH change when small amounts of acid or base are added. It is a weak acid + its salt (CH₃COOH/CH₃COONa) or a weak base + its salt (NH₄OH/NH₄Cl).\n\nHenderson equation: pH = pKa + log([salt]/[acid])\n\nUses: blood (H₂CO₃/HCO₃⁻ keeps pH ≈ 7.4), medicines, fermentation, lab analysis.\nLimitation: works only within about pKa ± 1.",
  },
  {
    k: /acid|base|alkali/i,
    a: "Acids and bases\n\n- Arrhenius: acids give H⁺, bases give OH⁻ in water.\n- Brønsted–Lowry: acids donate protons, bases accept them.\n- Neutralisation: HCl + NaOH → NaCl + H₂O (exothermic)\n\nSafety: strong acids/bases are corrosive — always add acid to water, never water to acid.",
  },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

type ElementRow = {
  n: number;
  s: string;
  name: string;
  m: number;
  c: string;
  ec: string;
  en?: number;
  ph: string;
  mp?: number;
  bp?: number;
  d?: number;
  sum?: string;
};

const ELEMENTS = elementsData as ElementRow[];

function findLocalAnswer(query: string): string | null {
  const q = query.toLowerCase();
  const topic = TOPICS.find((t) => t.k.test(query));
  if (topic) return topic.a;
  // Element match by name or symbol
  const el =
    ELEMENTS.find((e) => q.includes(e.name.toLowerCase())) ??
    ELEMENTS.find((e) => new RegExp(`\\b${e.s}\\b`).test(query));
  if (el) {
    return [
      `**${el.name} (${el.s})** — saved periodic data`,
      ``,
      `| Property | Value |`,
      `| --- | --- |`,
      `| Atomic number | ${el.n} |`,
      `| Molar mass | ${el.m} g/mol |`,
      `| Category | ${el.c} |`,
      `| Phase (STP) | ${el.ph} |`,
      el.en != null ? `| Electronegativity | ${el.en} |` : null,
      `| Electron config | ${el.ec} |`,
      el.mp != null ? `| Melting point | ${el.mp} K |` : null,
      el.bp != null ? `| Boiling point | ${el.bp} K |` : null,
      el.d != null ? `| Density | ${el.d} |` : null,
      ``,
      el.sum ?? "",
    ]
      .filter((l) => l != null)
      .join("\n");
  }
  // Popular compound match
  const cmp = POPULAR.find(
    (p) => q.includes(p.name.toLowerCase()) || q.includes(p.formula.toLowerCase()),
  );
  if (cmp) {
    return [
      `**${cmp.name}** — saved compound data`,
      ``,
      `- Formula: **${cmp.formula}**`,
      `- Class: ${cmp.tag}`,
      `- SMILES: \`${cmp.smiles}\``,
      `- PubChem CID: ${cmp.cid}`,
    ].join("\n");
  }
  return null;
}

export const askChemAI = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data }) => {
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    const query = lastUser?.content ?? "";
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("missing key");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          reasoning_effort: "low",
          max_completion_tokens: 2048,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.messages.slice(-10),
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("empty");
      return { text, fallback: false };
    } catch {
      // Silently fall back to saved local data — never surface a raw error.
      const local = findLocalAnswer(query);
      return {
        text:
          (local ? local + "\n\n" : "") +
          "_AI busy, showing saved info. Try again in a moment for the full expert answer._",
        fallback: true,
      };
    }
  });

type ExplainInput = { name: string; formula: string; iupac: string; mw: number; smiles: string };

export const explainCompound = createServerFn({ method: "POST" })
  .inputValidator((data: ExplainInput) => data)
  .handler(async ({ data }) => {
    const facts = `PubChem data — Name: ${data.name}; Formula: ${data.formula}; IUPAC: ${data.iupac || "n/a"}; MW: ${data.mw || "n/a"} g/mol; SMILES: ${data.smiles}`;
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("missing key");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          reasoning_effort: "low",
          max_completion_tokens: 1500,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + " Keep it concise (under 300 words). Plain text with short headings, no markdown tables." },
            { role: "user", content: `${facts}\n\nExplain this compound: structure, uses, and safety.` },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("empty");
      return { text, fallback: false };
    } catch {
      const local = findLocalAnswer(data.name) ?? findLocalAnswer(data.formula);
      return {
        text: [facts.replace("PubChem data — ", "").split("; ").join("\n"), local ? "\n" + local : ""].join(""),
        fallback: true,
      };
    }
  });
