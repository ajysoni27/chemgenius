import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Atom, X, RotateCcw } from "lucide-react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const KEY = "scv-chat-v1";
const SUGGESTIONS = ["Why does Aspirin work?", "What happens if I mix baking soda + vinegar?", "Explain sp³ hybridization simply", "Why is water polar?"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    try {
      setInitial(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      setInitial([]);
    }
    const h = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string>).detail;
      if (q) window.dispatchEvent(new CustomEvent("scv-chat-send", { detail: q }));
    };
    window.addEventListener("scv-open-chat", h);
    return () => window.removeEventListener("scv-open-chat", h);
  }, []);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-neon px-5 py-3 font-semibold text-primary-foreground shadow-glow"
        aria-label="Ask Chem AI"
      >
        <Atom className="size-5 animate-spin [animation-duration:6s]" />
        <span className="hidden sm:inline">Ask Chem AI</span>
      </motion.button>
      <AnimatePresence>
        {open && initial && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            className="glass-strong fixed inset-x-3 bottom-20 z-50 flex h-[70vh] flex-col overflow-hidden rounded-3xl shadow-violet sm:inset-x-auto sm:right-5 sm:w-[420px]"
          >
            <ChatBody initial={initial} onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatBody({ initial, onClose }: { initial: UIMessage[]; onClose: () => void }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const [error, setError] = useState("");
  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: "chem-ai",
    messages: initial,
    transport,
    onError: (e) => setError(e.message || "Network error — please try again."),
  });
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") localStorage.setItem(KEY, JSON.stringify(messages));
  }, [messages, status]);

  useEffect(() => {
    const h = (e: Event) => send((e as CustomEvent<string>).detail);
    window.addEventListener("scv-chat-send", h);
    return () => window.removeEventListener("scv-chat-send", h);
  });

  function send(t: string) {
    if (!t.trim() || busy) return;
    setError("");
    sendMessage({ text: t });
    setText("");
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-neon">
            <Atom className="size-4 text-primary-foreground" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">Chem AI</p>
            <p className="text-[11px] text-muted-foreground">Your chemistry tutor</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              stop();
              setMessages([]);
              localStorage.removeItem(KEY);
            }}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
            aria-label="New conversation"
            title="New conversation"
          >
            <RotateCcw className="size-4" />
          </button>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState title="Ask Chem AI anything" description="Concepts, reactions, medicines, safety.">
              <div className="mt-2 flex flex-col gap-2">
                <Atom className="mx-auto size-10 text-neon" />
                <p className="font-display font-semibold">Ask Chem AI anything</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="glass rounded-full px-3 py-1.5 text-xs hover:bg-secondary">
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((p, i) =>
                    p.type === "text" ? (
                      m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <span key={i}>{p.text}</span>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer className="text-sm">Thinking about the chemistry…</Shimmer>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3">
        <PromptInput onSubmit={() => send(text)}>
          <PromptInputTextarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. What happens if I mix HCl + NaOH?" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!text.trim() && !busy} onClick={busy ? (e) => (e.preventDefault(), stop()) : undefined} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}

export function askChemAI(q?: string) {
  window.dispatchEvent(new CustomEvent("scv-open-chat", { detail: q }));
}
