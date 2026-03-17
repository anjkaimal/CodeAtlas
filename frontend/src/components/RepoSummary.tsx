import Panel from "./ui/Panel";
import type { RepoSummary as RepoSummaryType } from "../api/client";

type Props = {
  summary?: RepoSummaryType | null;
  summaryLoading?: boolean;
  summaryError?: string | null;
  repoUrl?: string;
  workspacePath?: string | null;
};

export default function RepoSummary({ summary, summaryLoading, summaryError, repoUrl, workspacePath }: Props) {
  return (
    <Panel
      title="Repository Summary"
      right={
        repoUrl ? (
          <a href={repoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-violet-600 hover:text-violet-500 transition-colors">
            Full Documentation →
          </a>
        ) : null
      }
    >
      {summaryLoading ? (
        <div className="flex items-center gap-3 py-4 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-violet-500" />
          Generating AI summary…
        </div>
      ) : summaryError ? (
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
            {summaryError}
          </div>
          {workspacePath && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-600">Workspace path</div>
              <div className="mt-1 break-all text-xs text-gray-400">{workspacePath}</div>
            </div>
          )}
        </div>
      ) : !summary ? (
        <div className="py-6 text-center text-sm text-gray-400">
          <div className="text-3xl mb-3">📦</div>
          <div className="font-medium text-gray-600 mb-1">No AI summary yet.</div>
          <div className="text-gray-400 text-xs max-w-xs mx-auto">
            Analyze a repository above to generate an AI-powered architectural summary.
          </div>
        </div>
      ) : (
        <div className="space-y-5 text-sm">
          <p className="text-gray-600 leading-relaxed">{summary.project_purpose || "—"}</p>

          {(summary.major_modules?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.major_modules.slice(0, 2).map((m, idx) => (
                <div
                  key={m?.name || idx}
                  className={`rounded-xl p-4 border ${idx === 0 ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-2 w-2 rounded-full ${idx === 0 ? "bg-green-500" : "bg-amber-500"}`} />
                    <span className="font-semibold text-gray-800 text-xs">{m?.name || "—"}</span>
                  </div>
                  {m?.reason && <p className="text-xs text-gray-500 leading-relaxed">{m.reason}</p>}
                  {Array.isArray(m?.paths) && m.paths.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400 font-mono break-all">{m.paths.slice(0, 2).join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {summary.tech_stack?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Tech Stack</div>
              <div className="flex flex-wrap gap-2">
                {summary.tech_stack.slice(0, 10).map((t) => (
                  <span key={t} className="rounded-full bg-violet-50 border border-violet-100 text-violet-600 px-2.5 py-1 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.entry_points?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Entry Points</div>
              <div className="space-y-1">
                {summary.entry_points.slice(0, 5).map((p) => (
                  <div key={p} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                    <code className="font-mono break-all">{p}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.notes?.length > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <div className="text-xs font-semibold text-blue-600 mb-1.5">Notes</div>
              <ul className="space-y-1">
                {summary.notes.map((n, i) => (
                  <li key={i} className="text-xs text-blue-700 leading-relaxed">{n}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-300">Model: {summary.model}</div>
        </div>
      )}
    </Panel>
  );
}
