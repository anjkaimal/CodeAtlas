import { useMemo, useState } from "react";
import Panel from "./ui/Panel";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBox(props: { disabled?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask a question about the repo (we’ll connect this to the backend next)."
    }
  ]);
  const [input, setInput] = useState("");

  const canSend = useMemo(() => !props.disabled && input.trim().length > 0, [props.disabled, input]);

  function onSend() {
    if (!canSend) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "Not wired yet." }]);
  }

  return (
    <Panel
      title="Q&A"
      right={props.disabled ? <span className="text-xs text-slate-400">Run analysis first</span> : null}
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
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
            disabled={props.disabled}
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

