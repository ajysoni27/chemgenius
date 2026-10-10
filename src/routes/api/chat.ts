import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM = `You are Chem AI, the assistant inside SmartChemVision. Explain chemistry simply and accurately — like a brilliant teacher.
Use short paragraphs, markdown, and balanced equations with → arrows. Use subscripts in formulas where helpful (H₂O).
For "what happens if I mix X + Y" questions: give the reaction, products, type, energy change, and any SAFETY warning first if dangerous.
For drugs: explain mechanism of action plainly. Never give instructions for making weapons, explosives or illegal drugs.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { makeProvider, CHAT_MODEL, reasoningOptions } = await import("@/server/gateway.server");
        const { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } = await import(
          "@/server/run-id"
        );
        let body: { messages?: UIMessage[] };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });
        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = makeProvider(runIdFetch.fetch as typeof fetch);
        const result = streamText({
          model: provider.responses(CHAT_MODEL),
          system: SYSTEM,
          messages: await convertToModelMessages(body.messages),
          abortSignal: request.signal,
          providerOptions: reasoningOptions,
        });
        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: body.messages,
            sendReasoning: true,
            onError: (e) => {
              const m = e instanceof Error ? e.message : String(e);
              if (/402/.test(m)) return "AI credits are used up. Add credits to keep chatting.";
              if (/429/.test(m)) return "Too many requests — please wait a moment.";
              return "Chem AI hit an error. Please try again.";
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
