import Panel from "./ui/Panel";

export default function RepoSummary(props: { summary?: any; repoUrl?: string; workspacePath?: string }) {
  const s = props.summary;
  return (
    <Panel
      title="Repo summary"
      right={
        props.repoUrl ? (
          <span className="text-xs text-slate-400 truncate max-w-[240px]">{props.repoUrl}</span>
        ) : null
      }
    >
      {!s ? (
        <div className="text-sm text-slate-300">
          <div className="font-medium text-slate-100">No AI summary yet.</div>
          <div className="mt-2 text-slate-400">
            We’ll hook this up to the backend AI summary endpoint next.
          </div>
          {props.workspacePath ? (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs font-semibold text-slate-300">Workspace</div>
              <div className="mt-1 break-all text-xs text-slate-400">{props.workspacePath}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-300">Project purpose</div>
            <div className="mt-1 text-slate-100">{s.project_purpose || "—"}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-300">Entry points</div>
              <ul className="mt-1 list-disc pl-5 text-slate-200">
                {(s.entry_points || []).slice(0, 8).map((p: string) => (
                  <li key={p} className="break-all">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">Tech stack</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(s.tech_stack || []).slice(0, 12).map((t: string) => (
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
              {(s.major_modules || []).slice(0, 6).map((m: any, idx: number) => (
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
        </div>
      )}
    </Panel>
  );
}

