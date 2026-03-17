import { useMemo, useRef, useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBox({
  workspacePath,
}: {
  disabled?: boolean;
  workspacePath?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I've analyzed the repository. Ask me anything about its structure, patterns, entry points, or how specific parts work.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(
    () => !loading && input.trim().length > 0 && Boolean(workspacePath),
    [loading, input, workspacePath],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function onSend() {
    if (!canSend) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/repos/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_path: workspacePath, question: q }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const detail = json?.detail || `Error ${res.status}`;
        setMessages((m) => [...m, { role: "assistant", content: `Error: ${detail}` }]);
      } else {
        const data = await res.json();
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data?.answer || "No answer returned." },
        ]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Could not reach the backend: ${e?.message || String(e)}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "What is the main entry point?",
    "Which files handle data models?",
    "How are dependencies structured?",
    "What patterns does this codebase use?",
  ];

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {m.role === "assistant" && (
              <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 border border-indigo-500/30">
                <svg className="h-3 w-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
            )}
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                (m.role === "user"
                  ? "rounded-tr-sm bg-indigo-600 text-white"
                  : "rounded-tl-sm bg-slate-800 text-slate-100 border border-slate-700")
              }
              style={{ whiteSpace: "pre-wrap" }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 border border-indigo-500/30">
              <svg className="h-3 w-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700 px-4 py-3">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestion chips (only at start) */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s);
                }}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-indigo-600/60 hover:bg-indigo-950/40 hover:text-indigo-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-800 bg-slate-950/40 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask about the repository…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={onSend}
            disabled={!canSend}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
