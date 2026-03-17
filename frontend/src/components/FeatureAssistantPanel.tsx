import { useMemo, useState } from "react";
import { suggestFeature, type FeatureAssistantResponse, type FeatureSuggestion } from "../api/client";

const CONFIDENCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: "bg-green-50 border-green-200",    text: "text-green-600",   label: "High confidence" },
  medium: { bg: "bg-amber-50 border-amber-200",    text: "text-amber-600",   label: "Medium confidence" },
  low:    { bg: "bg-gray-50 border-gray-200",      text: "text-gray-500",    label: "Low confidence" },
};

function SuggestionCard({ s, index }: { s: FeatureSuggestion; index: number }) {
  const badge = CONFIDENCE_BADGE[s.confidence] ?? CONFIDENCE_BADGE.low;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white card-shadow p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
            {index + 1}
          </span>
          <code className="text-sm font-mono text-violet-600 break-all">{s.file_path}</code>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {(s.insertion?.name || s.insertion?.anchor) && (
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
          <span className="text-xs text-gray-500">
            {s.insertion.type}:{" "}
            <span className="text-gray-800 font-medium">{s.insertion.name || s.insertion.anchor}</span>
            {s.insertion.line && <span className="ml-1.5 text-gray-400">· line {s.insertion.line}</span>}
          </span>
        </div>
      )}

      <p className="text-sm text-gray-600 leading-relaxed">{s.explanation}</p>
    </div>
  );
}

const EXAMPLE_FEATURES = [
  "Add user authentication with JWT tokens",
  "Add rate limiting to all API endpoints",
  "Add a caching layer for expensive database queries",
  "Add logging and error tracking",
];

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
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-gray-100 bg-white card-shadow p-5">
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700">Describe the feature you want to implement</label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            disabled={disabled}
            rows={4}
            placeholder='e.g. "Add rate limiting to all API endpoints using Redis"'
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
          />

          {!request && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_FEATURES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setRequest(ex)}
                  className="rounded-full border border-gray-200 bg-gray-50 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 px-3 py-1.5 text-xs text-gray-500 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onSuggest}
            disabled={!canRun}
            className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing codebase…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Suggest implementation location
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              {result.suggestions?.length
                ? `${result.suggestions.length} suggested location${result.suggestions.length === 1 ? "" : "s"}`
                : "No suggestions returned"}
            </h3>
            {result.model && <span className="text-xs text-gray-400">via {result.model}</span>}
          </div>

          {(result.suggestions || []).map((s, i) => (
            <SuggestionCard key={i} s={s} index={i} />
          ))}

          {result.questions?.length ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                The AI has clarifying questions
              </div>
              <ul className="space-y-1.5">
                {result.questions.map((q, i) => (
                  <li key={i} className="text-xs text-blue-700 pl-2 border-l-2 border-blue-200">{q}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.notes?.length ? (
            <div className="text-xs text-gray-400 pl-1">{result.notes.join(" · ")}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
