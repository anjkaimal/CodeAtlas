import { useMemo, useState } from "react";
import Panel from "./ui/Panel";

export default function FeatureAssistantPanel(props: { disabled?: boolean }) {
  const [request, setRequest] = useState("");
  const [result, setResult] = useState<any>(null);

  const canRun = useMemo(() => !props.disabled && request.trim().length > 0, [props.disabled, request]);

  async function onSuggest() {
    if (!canRun) return;
    // Placeholder: we’ll call the backend feature assistant endpoint next.
    setResult({
      suggestions: [
        {
          file_path: "—",
          insertion: { type: "line_anchor", name: null, line: null, anchor: "Connect backend endpoint first" },
          explanation: "Feature assistant is not wired yet.",
          confidence: "low"
        }
      ],
      questions: [],
      notes: []
    });
  }

  return (
    <Panel
      title="Feature assistant"
      right={props.disabled ? <span className="text-xs text-slate-400">Run analysis first</span> : null}
    >
      <div className="space-y-3">
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          disabled={props.disabled}
          rows={3}
          placeholder='Describe a feature to add, e.g. "Add rate limiting to login requests"'
          className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-60"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onSuggest}
            disabled={!canRun}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Suggest location
          </button>
          <div className="text-xs text-slate-400">
            Returns a file + insertion point + explanation.
          </div>
        </div>

        {result ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs font-semibold text-slate-300">Suggestion</div>
            <pre className="mt-2 overflow-auto text-xs text-slate-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

