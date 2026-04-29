"use client";

import { useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string };

/**
 * Cross-cut B: floating chat sidebar on /discover. Streams responses from the
 * /api/app/discover/chat route via SSE.
 */
export function DiscoveryChatSidebar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", text }, { role: "assistant", text: "" }];
    setMessages(next);
    setPending(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/app/discover/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: messages.slice(-6),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", text: errBody.error ?? "Request failed." };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const data = dataLine.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { text?: string };
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { role: "assistant", text: last.text + parsed.text };
                }
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      console.error(err);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-primary position-fixed d-inline-flex align-items-center gap-2"
        style={{ bottom: "1rem", right: "1rem", zIndex: 1050 }}
        onClick={() => setOpen(true)}
        aria-label="Open discovery chat"
      >
        <MessageSquare size={16} aria-hidden="true" />
        Ask
      </button>
    );
  }

  return (
    <aside
      className="border border-secondary-subtle bg-body shadow position-fixed d-flex flex-column rounded-3"
      style={{ bottom: "1rem", right: "1rem", width: "min(420px, 90vw)", height: "min(60vh, 600px)", zIndex: 1050 }}
      aria-label="Discovery chat"
    >
      <div className="d-flex align-items-center justify-content-between p-2 border-bottom">
        <h2 className="h6 mb-0 d-flex align-items-center gap-2">
          <MessageSquare size={14} aria-hidden="true" />
          Discovery chat
        </h2>
        <button type="button" className="btn btn-link btn-sm p-1" onClick={() => setOpen(false)} aria-label="Close">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-grow-1 overflow-auto p-2">
        {messages.length === 0 ? (
          <p className="small text-body-secondary mb-0">
            Ask about themes in P1 bugs, draft a survey for a problem, or summarise a cluster of feedback.
            Cites sources like [insight 12].
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`mb-2 ${m.role === "user" ? "text-end" : ""}`}>
              <div
                className={`d-inline-block rounded-3 px-2 py-1 small ${
                  m.role === "user" ? "bg-primary text-white" : "bg-body-secondary text-body"
                }`}
                style={{ maxWidth: "85%", whiteSpace: "pre-wrap" }}
              >
                {m.text || (pending && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="d-flex align-items-center gap-1 p-2 border-top"
      >
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || input.trim().length === 0} aria-label="Send">
          <Send size={14} aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
