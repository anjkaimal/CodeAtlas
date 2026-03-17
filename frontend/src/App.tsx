import { useState, type ReactNode } from "react";
import RepoSummary from "./components/RepoSummary";
import DependencyGraph from "./components/DependencyGraph";
import ChatBox from "./components/ChatBox";
import FeatureAssistantPanel from "./components/FeatureAssistantPanel";
import {
  analyzeRepoByUrl,
  generateSummary,
  type AnalyzeRepoResponse,
  type RepoSummary as RepoSummaryType,
} from "./api/client";

type Tab = "home" | "graph" | "feature" | "chat";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "graph",
    label: "Dependency Graph",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: "feature",
    label: "Feature Assistant",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "chat",
    label: "CodeAtlas AI",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeRepoResponse | null>(null);
  const [summary, setSummary] = useState<RepoSummaryType | null>(null);

  const workspacePath = analysis?.workspace_path ?? null;
  const hasAnalysis = Boolean(workspacePath);

  async function onAnalyze() {
    setError(null);
    setSummaryError(null);
    setLoading(true);
    setAnalysis(null);
    setSummary(null);
    try {
      const out = await analyzeRepoByUrl(repoUrl.trim());
      setAnalysis(out);

      if (out.workspace_path) {
        setSummaryLoading(true);
        try {
          const s = await generateSummary(out.workspace_path);
          setSummary(s);
        } catch (e: any) {
          setSummaryError(e?.message || String(e));
        } finally {
          setSummaryLoading(false);
        }
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const isAnalyzing = loading || summaryLoading;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-100">CodeAtlas</div>
              <div className="text-xs text-slate-500">AI-powered repo explorer</div>
            </div>
          </div>

          {hasAnalysis && (
            <div className="ml-auto flex items-center gap-2 rounded-full border border-green-800/60 bg-green-950/40 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-green-300 truncate max-w-[280px]">{repoUrl}</span>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-7xl px-5">
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors " +
                    (active
                      ? "border-indigo-500 text-slate-100"
                      : "border-transparent text-slate-500 hover:border-slate-700 hover:text-slate-300")
                  }
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id !== "home" && !hasAnalysis && (
                    <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                      locked
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex flex-1 flex-col">
        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Left: Analyze input */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <h2 className="mb-4 text-sm font-semibold text-slate-100">Analyze Repository</h2>
                  <div className="space-y-3">
                    <label className="text-xs text-slate-400">GitHub repository URL</label>
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isAnalyzing && repoUrl.trim()) onAnalyze();
                      }}
                      placeholder="https://github.com/owner/repo"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      onClick={onAnalyze}
                      disabled={isAnalyzing || repoUrl.trim().length === 0}
                      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading
                        ? "Cloning & scanning…"
                        : summaryLoading
                        ? "Generating summary…"
                        : "Start Analysis"}
                    </button>

                    {error && (
                      <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300">
                        {error}
                      </div>
                    )}
                  </div>

                  {hasAnalysis && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setActiveTab("graph")}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        View Graph →
                      </button>
                      <button
                        onClick={() => setActiveTab("chat")}
                        className="flex-1 rounded-lg border border-indigo-700/60 bg-indigo-950/40 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-950/60 transition-colors"
                      >
                        Ask AI →
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats card */}
                {analysis?.scan?.stats && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Scan stats</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Files", value: analysis.scan.stats.file_count },
                        { label: "Python", value: analysis.scan.stats.python_file_count },
                        { label: "Deps", value: analysis.scan.stats.dependency_edge_count },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-slate-950/50 p-3 text-center">
                          <div className="text-lg font-bold text-indigo-400">{value}</div>
                          <div className="text-xs text-slate-500">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Repo summary */}
              <div className="lg:col-span-3">
                <RepoSummary
                  summary={summary}
                  summaryLoading={summaryLoading}
                  summaryError={summaryError}
                  repoUrl={repoUrl}
                  workspacePath={workspacePath}
                />
              </div>
            </div>
          </div>
        )}

        {/* DEPENDENCY GRAPH TAB */}
        {activeTab === "graph" && (
          <div className="flex flex-1 flex-col px-5 py-4">
            {!hasAnalysis ? (
              <LockedTabState
                label="Dependency Graph"
                description="Analyze a repository on the Home tab to visualize its file dependency graph."
                onGoHome={() => setActiveTab("home")}
              />
            ) : (
              <div style={{ height: "calc(100vh - 148px)" }}>
                <DependencyGraph scan={analysis?.scan} />
              </div>
            )}
          </div>
        )}

        {/* FEATURE ASSISTANT TAB */}
        {activeTab === "feature" && (
          <div className="flex flex-1 flex-col px-5 py-4">
            {!hasAnalysis ? (
              <LockedTabState
                label="Feature Assistant"
                description="Analyze a repository on the Home tab first. The AI will then suggest which files to modify for any feature you describe."
                onGoHome={() => setActiveTab("home")}
              />
            ) : (
              <div className="mx-auto w-full max-w-3xl flex-1">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-slate-100">Feature Assistant</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Describe a feature and the AI will identify which files and insertion points to modify.
                  </p>
                </div>
                <FeatureAssistantPanel workspacePath={workspacePath} />
              </div>
            )}
          </div>
        )}

        {/* CODEATLAS AI TAB */}
        {activeTab === "chat" && (
          <div className="flex flex-1 flex-col px-5 py-4">
            {!hasAnalysis ? (
              <LockedTabState
                label="CodeAtlas AI"
                description="Analyze a repository on the Home tab first. Then ask the AI anything about the codebase."
                onGoHome={() => setActiveTab("home")}
              />
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-slate-100">CodeAtlas AI</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ask questions about the repository — architecture, patterns, entry points, anything.
                  </p>
                </div>
                <ChatBox workspacePath={workspacePath} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
      {label}
    </span>
  );
}

function LockedTabState({
  label,
  description,
  onGoHome,
}: {
  label: string;
  description: string;
  onGoHome: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
        <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-300">{label} is locked</div>
        <div className="mt-1 max-w-sm text-xs text-slate-500">{description}</div>
      </div>
      <button
        onClick={onGoHome}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        Go to Home
      </button>
    </div>
  );
}
