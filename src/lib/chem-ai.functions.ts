import { createServerFn } from "@tanstack/react-start";
import elementsData from "./elements-data.json";
import { POPULAR } from "./popular";

const SYSTEM_PROMPT = `You are Pro Chemistry Expert. For any compound give: 1. IUPAC/Formula/Weight 2. How it works (mechanism) 3. Medicine use + dosage + side effects 4. Industrial & daily uses 5. Synthesis 6. Safety/GHS/limits 7. Tables + emojis. Never say I don't know.`;

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
