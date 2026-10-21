import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, X, Send, Loader2 } from "lucide-react";
import { streamChemAI, cleanAI } from "@/lib/chem-ai-client";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const STORAGE_KEY = "scv-chem-ai-chat";

function loadMessages(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Msg[];
  } catch {
    return [];
  }
}

export function ChemAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const h = (e: Event) => {
      setOpen(true);
      const d = (e as CustomEvent<string>).detail;
      if (typeof d === "string") setInput(d);
    };
    window.addEventListener("open-chem-ai", h);
    return () => window.removeEventListener("open-chem-ai", h);
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      await streamChemAI(next, (t) => setMessages([...next, { role: "assistant", content: t }]));
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `AI could not answer: ${(e as Error).message}`, error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Ask Chem AI"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-neon shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105"
      >
        <FlaskConical className="h-6 w-6 text-primary-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="glass fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border/60"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold">Chem AI — Pro Chemistry Expert</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Ask about any compound or element — Aspirin, Arsenic, Caffeine…
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      m.role === "user"
                        ? "inline-block max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-neon px-3 py-2 text-left text-sm text-primary-foreground"
                        : "inline-block max-w-[95%] px-1 text-sm leading-relaxed text-foreground"
                    }
                  >
                    <span className="whitespace-pre-wrap">
                      {cleanAI(m.content).trim()}
                    </span>
                  </div>
                </div>
              ))}
              {busy && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is thinking…
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-center gap-2 border-t border-border/60 p-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Chem AI…"
                className="flex-1 rounded-full bg-background/60 px-4 py-2 text-sm outline-none ring-1 ring-border/60 focus:ring-cyan-400/60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-neon text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
