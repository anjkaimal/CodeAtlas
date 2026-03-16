import { useMemo, useState } from "react";
import Panel from "./components/ui/Panel";
import RepoSummary from "./components/RepoSummary";
import DependencyGraph from "./components/DependencyGraph";
import ChatBox from "./components/ChatBox";
import FeatureAssistantPanel from "./components/FeatureAssistantPanel";
import { analyzeRepoByUrl, type AnalyzeRepoResponse } from "./api/client";

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeRepoResponse | null>(null);

  const hasAnalysis = useMemo(() => Boolean(analysis?.workspace_path), [analysis]);

  async function onAnalyze() {
    setError(null);
    setLoading(true);
    setAnalysis(null);
    try {
      const out = await analyzeRepoByUrl(repoUrl.trim());
      setAnalysis(out);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-100">CodeAtlas</div>
            <div className="text-xs text-slate-400">AI-powered repo insight & dependency mapping</div>
          </div>
          <div className="text-xs text-slate-500">Backend: FastAPI</div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-6 lg:grid-cols-12">
        <section className="lg:col-span-4">
          <Panel title="Analyze repository">
            <div className="space-y-3">
              <div className="text-sm text-slate-300">
                Paste a GitHub repo URL to clone and scan.
              </div>

              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={onAnalyze}
                  disabled={loading || repoUrl.trim().length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Analyzing…" : "Start analysis"}
                </button>
                <div className="text-xs text-slate-400">
                  Calls <code className="text-slate-300">/api/repos/analyze</code>
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {analysis?.tree ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-xs font-semibold text-slate-300">File tree</div>
                  <pre className="mt-2 max-h-[240px] overflow-auto text-xs text-slate-200">
                    {JSON.stringify(analysis.tree, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="mt-5">
            <FeatureAssistantPanel disabled={!hasAnalysis} />
          </div>
        </section>

        <section className="lg:col-span-8 space-y-5">
          <RepoSummary summary={analysis?.summary} repoUrl={repoUrl} workspacePath={analysis?.workspace_path} />

          <Panel title="Dependency graph">
            <DependencyGraph graph={analysis?.graph as any} />
            {!analysis?.graph ? (
              <div className="mt-3 text-xs text-slate-400">
                Graph data isn’t returned by the backend yet. Next step: we’ll update the backend to run
                <code className="mx-1 text-slate-300">repo_scanner</code> + <code className="text-slate-300">graph_builder</code>
                and return a React Flow graph.
              </div>
            ) : null}
          </Panel>

          <ChatBox disabled={!hasAnalysis} />
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-slate-500">
        MVP UI scaffold — next we’ll connect AI summary, Q&A, and feature assistant endpoints.
      </footer>
    </div>
  );
}

