import { useMemo, useRef, useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBox({
  workspacePath,
  fullPage,
}: {
  disabled?: boolean;
  workspacePath?: string | null;
  fullPage?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "features" | "history">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I've finished analyzing your repo. Where would you like to start? I can explain the data flow, find security leaks, or suggest refactors.",
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
        setMessages((m) => [...m, { role: "assistant", content: data?.answer || "No answer returned." }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Could not reach the backend: ${e?.message || String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Can you explain the authentication flow in the `/v1/auth/` module?",
    "What is the main entry point?",
    "How are dependencies structured?",
    "Which files handle data models?",
  ];

  const containerClass = fullPage
    ? "flex flex-col bg-white card-shadow rounded-2xl border border-gray-100 overflow-hidden flex-1"
    : "flex flex-col bg-white card-shadow rounded-2xl border border-gray-100 overflow-hidden";

  const height = fullPage ? undefined : 480;

  return (
    <div className={containerClass} style={height ? { height } : undefined}>
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <span className="font-bold text-gray-900 text-sm">CodeAtlas AI</span>
        </div>
        <div className="flex items-center rounded-lg bg-gray-50 border border-gray-100 p-0.5 text-xs font-medium">
          {(["chat", "features", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 rounded-md transition-colors capitalize ${activeTab === t ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
            >
              {t === "chat" ? "AI Chat" : t === "features" ? "Features" : "History"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "chat" && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start items-start gap-2"}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-xs font-bold text-violet-600">
                    CA
                  </div>
                )}
                <div
                  className={
                    "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                    (m.role === "user"
                      ? "rounded-tr-sm bg-violet-600 text-white"
                      : "rounded-tl-sm bg-gray-50 text-gray-700 border border-gray-100")
                  }
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-start gap-2">
                <div className="h-7 w-7 shrink-0 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-xs font-bold text-violet-600">
                  CA
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="space-y-2 pt-1">
                {suggestions.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="w-full text-left rounded-xl border border-gray-100 bg-gray-50 hover:bg-violet-50 hover:border-violet-100 px-3 py-2.5 text-xs text-gray-600 hover:text-violet-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
                }}
                placeholder="Ask anything about the code..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                onClick={onSend}
                disabled={!canSend}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "features" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-3xl mb-3">💡</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Feature Suggestions</p>
            <p className="text-xs text-gray-400">Use the Feature Assistant tab for detailed implementation suggestions.</p>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-3xl mb-3">🕒</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Conversation History</p>
            <p className="text-xs text-gray-400">Your previous sessions will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
