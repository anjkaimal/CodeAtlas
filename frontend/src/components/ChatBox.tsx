import { useMemo, useRef, useEffect, useState } from "react";
import Panel from "./ui/Panel";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBox({
  disabled,
  workspacePath,
}: {
  disabled?: boolean;
  workspacePath?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask a question about the analyzed repository.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(
    () => !disabled && !loading && input.trim().length > 0,
    [disabled, loading, input],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSend() {
    if (!canSend) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/api/repos/chat`, {
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
        setMessages((m) => [...m, { role: "assistant", content: data?.answer || "No answer returned." }]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Could not reach the backend: ${e?.message || String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title="Q&A"
      right={disabled ? <span className="text-xs text-slate-400">Run analysis first</span> : null}
    >
      <div className="flex flex-col gap-3">
        <div className="max-h-[240px] overflow-auto rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    "inline-block max-w-[90%] rounded-2xl px-3 py-2 text-sm " +
                    (m.role === "user"
                      ? "bg-indigo-600/70 text-white"
                      : "bg-slate-900 text-slate-100 border border-slate-800")
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="text-left">
                <div className="inline-block rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-400">
                  Thinking…
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
            disabled={disabled}
            placeholder="Where is authentication handled?"
            className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-60"
          />
          <button
            onClick={onSend}
            disabled={!canSend}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
    </Panel>
  );
}
