import { useMemo, useState } from "react";
import Panel from "./ui/Panel";
import { suggestFeature, type FeatureAssistantResponse, type FeatureSuggestion } from "../api/client";

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400",
  medium: "text-yellow-400",
  low: "text-slate-400",
};

function SuggestionCard({ s }: { s: FeatureSuggestion }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <code className="text-xs font-mono text-indigo-300 break-all">{s.file_path}</code>
        <span className={`text-xs font-semibold shrink-0 ${CONFIDENCE_COLORS[s.confidence] || "text-slate-400"}`}>
          {s.confidence}
        </span>
      </div>
      {s.insertion?.name || s.insertion?.anchor ? (
        <div className="text-xs text-slate-400">
          {s.insertion.type}: <span className="text-slate-300">{s.insertion.name || s.insertion.anchor}</span>
          {s.insertion.line ? <span className="ml-1 text-slate-500">(line {s.insertion.line})</span> : null}
        </div>
      ) : null}
      <div className="text-xs text-slate-300">{s.explanation}</div>
    </div>
  );
}

export default function FeatureAssistantPanel({
  disabled,
  workspacePath,
}: {
  disabled?: boolean;
  workspacePath?: string | null;
}) {
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeatureAssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(
    () => !disabled && !loading && request.trim().length > 0,
    [disabled, loading, request],
  );

  async function onSuggest() {
    if (!canRun || !workspacePath) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await suggestFeature(workspacePath, request.trim());
      setResult(r);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title="Feature assistant"
      right={disabled ? <span className="text-xs text-slate-400">Run analysis first</span> : null}
    >
      <div className="space-y-3">
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          disabled={disabled}
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
            {loading ? "Thinking…" : "Suggest location"}
          </button>
          <div className="text-xs text-slate-400">
            Returns a file + insertion point + explanation.
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              {result.suggestions?.length
                ? `${result.suggestions.length} suggestion${result.suggestions.length === 1 ? "" : "s"}`
                : "No suggestions"}
            </div>
            {(result.suggestions || []).map((s, i) => (
              <SuggestionCard key={i} s={s} />
            ))}
            {result.questions?.length ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs font-semibold text-slate-300 mb-1">Clarifying questions</div>
                <ul className="list-disc pl-4 space-y-1">
                  {result.questions.map((q, i) => (
                    <li key={i} className="text-xs text-slate-400">{q}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.notes?.length ? (
              <div className="text-xs text-slate-500">{result.notes.join(" · ")}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
