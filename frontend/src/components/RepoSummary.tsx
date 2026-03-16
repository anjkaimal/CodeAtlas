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
      title="Repo summary"
      right={
        repoUrl ? (
          <span className="text-xs text-slate-400 truncate max-w-[240px]">{repoUrl}</span>
        ) : null
      }
    >
      {summaryLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
          Generating AI summary…
        </div>
      ) : summaryError ? (
        <div className="space-y-2 text-sm">
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-amber-200">
            {summaryError}
          </div>
          {workspacePath ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs font-semibold text-slate-300">Workspace</div>
              <div className="mt-1 break-all text-xs text-slate-400">{workspacePath}</div>
            </div>
          ) : null}
        </div>
      ) : !summary ? (
        <div className="text-sm text-slate-300">
          <div className="font-medium text-slate-100">No AI summary yet.</div>
          <div className="mt-2 text-slate-400">
            Analyze a repository to generate an AI-powered architectural summary.
          </div>
          {workspacePath ? (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs font-semibold text-slate-300">Workspace</div>
              <div className="mt-1 break-all text-xs text-slate-400">{workspacePath}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-300">Project purpose</div>
            <div className="mt-1 text-slate-100">{summary.project_purpose || "—"}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-300">Entry points</div>
              <ul className="mt-1 list-disc pl-5 text-slate-200">
                {(summary.entry_points || []).slice(0, 8).map((p) => (
                  <li key={p} className="break-all">{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">Tech stack</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(summary.tech_stack || []).slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">Major modules</div>
            <div className="mt-2 space-y-2">
              {(summary.major_modules || []).slice(0, 6).map((m, idx) => (
                <div key={m?.name || idx} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <div className="font-semibold text-slate-100">{m?.name || "—"}</div>
                  {Array.isArray(m?.paths) && m.paths.length ? (
                    <div className="mt-1 text-xs text-slate-400 break-all">{m.paths.join(", ")}</div>
                  ) : null}
                  {m?.reason ? <div className="mt-2 text-xs text-slate-300">{m.reason}</div> : null}
                </div>
              ))}
            </div>
          </div>
          {summary.notes?.length ? (
            <div>
              <div className="text-xs font-semibold text-slate-300">Notes</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-400">
                {summary.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="text-xs text-slate-500">Model: {summary.model}</div>
        </div>
      )}
    </Panel>
  );
}
