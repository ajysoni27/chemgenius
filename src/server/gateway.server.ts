import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { z } from "zod";

export const CHAT_MODEL = "openai/gpt-6-astra";

export function makeProvider(fetchImpl?: typeof fetch) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
}

export const reasoningOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

/** Streams a structured JSON answer and returns the parsed object. */
export async function aiObject<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
  const provider = makeProvider();
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    system,
    prompt,
    output: Output.object({ schema }),
    providerOptions: reasoningOptions,
  });
  try {
    return (await result.output) as T;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const m = error.text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]) as T;
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (/402/.test(msg)) throw new Error("AI credits are used up for this workspace. Add credits to continue.");
    if (/429/.test(msg)) throw new Error("Too many AI requests right now. Please wait a moment and try again.");
    throw new Error(`AI request failed: ${msg}`);
  }
}
