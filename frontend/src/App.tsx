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
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Top Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-sm tracking-tight">CodeAtlas</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-gray-500 font-medium">
          <button onClick={() => setActiveTab("home")} className={`hover:text-gray-800 transition-colors ${activeTab === "home" ? "text-gray-800" : ""}`}>Home</button>
          <button
            onClick={() => hasAnalysis && setActiveTab("graph")}
            className={`hover:text-gray-800 transition-colors ${!hasAnalysis ? "opacity-40 cursor-default" : ""} ${activeTab === "graph" ? "text-gray-800" : ""}`}
          >
            Dependency Graph
          </button>
          <button
            onClick={() => hasAnalysis && setActiveTab("feature")}
            className={`hover:text-gray-800 transition-colors ${!hasAnalysis ? "opacity-40 cursor-default" : ""} ${activeTab === "feature" ? "text-gray-800" : ""}`}
          >
            Feature Assistant
          </button>
          <button
            onClick={() => hasAnalysis && setActiveTab("chat")}
            className={`hover:text-gray-800 transition-colors ${!hasAnalysis ? "opacity-40 cursor-default" : ""} ${activeTab === "chat" ? "text-gray-800" : ""}`}
          >
            CodeAtlas AI
          </button>
        </div>

        {hasAnalysis && (
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-xs text-green-700 font-medium">Analyzed</span>
          </div>
        )}
      </nav>

      {/* HOME TAB */}
      {activeTab === "home" && (
        <main className="flex-1 flex flex-col">
          {/* Hero */}
          <section className="text-center px-6 pt-8 pb-10 max-w-3xl mx-auto w-full">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-600 mb-6 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />
              BETA ACCESS NOW LIVE
            </div>

            <h1 className="text-6xl font-extrabold tracking-tight mb-4">
              <span className="purple-gradient-text">CodeAtlas</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-8">
              Navigate complex codebases with ease. Our AI maps your repository,
              understands dependencies, and explains logic in seconds.
            </p>

            {/* URL Input */}
            <div className="relative max-w-xl mx-auto input-glow rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center">
              <div className="pl-4 pr-2 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAnalyzing && repoUrl.trim()) onAnalyze();
                }}
                placeholder="Paste GitHub repository URL..."
                className="flex-1 py-3.5 px-2 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent focus:outline-none"
              />
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || repoUrl.trim().length === 0}
                className="m-1.5 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition-colors"
              >
                {loading ? "Cloning…" : summaryLoading ? "Summarizing…" : "Start Analysis"}
              </button>
            </div>

            {error && (
              <div className="mt-3 max-w-xl mx-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}
          </section>

          {/* Stats row */}
          {analysis?.scan?.stats && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon={
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  }
                  iconBg="bg-blue-50"
                  label="Total Files"
                  value={analysis.scan.stats.file_count?.toLocaleString?.() ?? analysis.scan.stats.file_count}
                  sub={<span className="text-green-500 text-xs font-medium">↑ scanned today</span>}
                />
                <StatCard
                  icon={
                    <svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                    </svg>
                  }
                  iconBg="bg-teal-50"
                  label="Primary Stack"
                  value={summary?.tech_stack?.[0] ?? "Detected"}
                  sub={<span className="text-gray-400 text-xs">{analysis.scan.stats.python_file_count} Python files</span>}
                />
                <StatCard
                  icon={
                    <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  }
                  iconBg="bg-violet-50"
                  label="Dependencies"
                  value={`${analysis.scan.stats.dependency_edge_count} Edges`}
                  sub={<span className="text-gray-400 text-xs">Dependency connections</span>}
                />
              </div>
            </section>
          )}

          {/* Main content: Repo Summary + Chat */}
          {(hasAnalysis || summaryLoading) && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Repo Summary */}
                <div className="lg:col-span-3">
                  <RepoSummary
                    summary={summary}
                    summaryLoading={summaryLoading}
                    summaryError={summaryError}
                    repoUrl={repoUrl}
                    workspacePath={workspacePath}
                  />
                </div>

                {/* Chat */}
                <div className="lg:col-span-2">
                  <ChatBox workspacePath={workspacePath} />
                </div>
              </div>
            </section>
          )}

          {/* Dependency Visualizer (teaser on home) */}
          {hasAnalysis && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-10">
              <div className="bg-white card-shadow rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Live Dependency Visualizer</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Interactive graph of module relationships</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("graph")}
                    className="flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-xs font-semibold px-3 py-1.5 hover:bg-violet-100 transition-colors"
                  >
                    Open Full Graph →
                  </button>
                </div>
                <div style={{ height: 280 }}>
                  <DependencyGraph scan={analysis?.scan} compact />
                </div>
              </div>
            </section>
          )}

          {/* Empty state CTA */}
          {!hasAnalysis && !isAnalyzing && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: "🗺️", title: "Dependency Maps", desc: "Visualize how files and modules connect across your entire repository." },
                  { icon: "🤖", title: "AI Code Chat", desc: "Ask questions about architecture, patterns, and specific code sections." },
                  { icon: "💡", title: "Feature Assistant", desc: "Describe a feature and get exact file locations where to implement it." },
                ].map((f) => (
                  <div key={f.title} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 card-shadow p-5">
                    <div className="text-2xl mb-3">{f.icon}</div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* DEPENDENCY GRAPH TAB */}
      {activeTab === "graph" && (
        <main className="flex flex-1 flex-col px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setActiveTab("home")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
              ← Back to Home
            </button>
            <h2 className="text-sm font-bold text-gray-800">Dependency Graph</h2>
          </div>
          {!hasAnalysis ? (
            <LockedTabState label="Dependency Graph" description="Analyze a repository on the Home tab to visualize its file dependency graph." onGoHome={() => setActiveTab("home")} />
          ) : (
            <div className="bg-white card-shadow rounded-2xl border border-gray-100 overflow-hidden flex-1" style={{ minHeight: "calc(100vh - 200px)" }}>
              <DependencyGraph scan={analysis?.scan} />
            </div>
          )}
        </main>
      )}

      {/* FEATURE ASSISTANT TAB */}
      {activeTab === "feature" && (
        <main className="flex flex-1 flex-col px-6 py-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setActiveTab("home")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to Home
            </button>
            <h2 className="text-sm font-bold text-gray-800">Feature Assistant</h2>
          </div>
          {!hasAnalysis ? (
            <LockedTabState label="Feature Assistant" description="Analyze a repository on the Home tab first." onGoHome={() => setActiveTab("home")} />
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-4">Describe a feature and the AI will identify which files and insertion points to modify.</p>
              <FeatureAssistantPanel workspacePath={workspacePath} />
            </>
          )}
        </main>
      )}

      {/* CHAT TAB */}
      {activeTab === "chat" && (
        <main className="flex flex-1 flex-col px-6 py-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setActiveTab("home")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to Home
            </button>
            <h2 className="text-sm font-bold text-gray-800">CodeAtlas AI</h2>
          </div>
          {!hasAnalysis ? (
            <LockedTabState label="CodeAtlas AI" description="Analyze a repository on the Home tab first." onGoHome={() => setActiveTab("home")} />
          ) : (
            <div className="flex flex-1 flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
              <ChatBox workspacePath={workspacePath} fullPage />
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">CodeAtlas</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
          <p className="text-xs text-gray-600">© 2024 CodeAtlas AI Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, sub }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="bg-white card-shadow rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <div className="mt-1">{sub}</div>
      </div>
      <div className={`h-12 w-12 ${iconBg} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  );
}

function LockedTabState({ label, description, onGoHome }: { label: string; description: string; onGoHome: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
        <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <div className="text-base font-semibold text-gray-700">{label} is locked</div>
        <div className="mt-1 max-w-sm text-sm text-gray-400">{description}</div>
      </div>
      <button onClick={onGoHome} className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors shadow-sm">
        Go to Home
      </button>
    </div>
  );
}
