import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are SmartChemVision Professor — a world-class Chemistry, Physics and Medicine professor. You know all 118 elements, 100M+ compounds (PubChem NIH), organic/inorganic/physical/analytical chemistry, plus pharma/medicine uses, mechanisms, precautions, GHS safety, limitations and applications. For ANY question give: 1) Direct accurate answer 2) Explanation with equations 3) Uses 4) Applications 5) Limitations 6) Precautions & Safety 7) Medicine relevance if any. Teach clearly like a professor. Never say "no match". Reply in the user's language (Hindi/Hinglish if they write that way). Use plain text with short headings, no markdown asterisks.`;

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chem-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { messages?: Msg[] } | null;
        const messages = (body?.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
        if (!messages.length) return Response.json({ error: "Empty question" }, { status: 400 });
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "AI key is not configured" }, { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "fetch",
          },
          signal: request.signal,
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            reasoning_effort: "low",
            stream: true,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          let msg = `AI error ${upstream.status}`;
          try {
            const j = (await upstream.json()) as { message?: string; error?: { message?: string } | string };
            msg = j.message ?? (typeof j.error === "string" ? j.error : j.error?.message) ?? msg;
          } catch {
            /* keep default */
          }
          return Response.json({ error: msg }, { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
