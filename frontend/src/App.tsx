import { useState, useEffect, type ReactNode } from "react";
import RepoSummary from "./components/RepoSummary";
import DependencyGraph from "./components/DependencyGraph";
import ChatBox from "./components/ChatBox";
import FeatureAssistantPanel from "./components/FeatureAssistantPanel";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./AuthContext";
import {
  analyzeRepoByUrl,
  generateSummary,
  saveHistory,
  fetchHistory,
  type AnalyzeRepoResponse,
  type RepoSummary as RepoSummaryType,
  type HistoryEntry,
} from "./api/client";

type Tab = "home" | "graph" | "feature" | "chat" | "history";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeRepoResponse | null>(null);
  const [summary, setSummary] = useState<RepoSummaryType | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const workspacePath = analysis?.workspace_path ?? null;
  const hasAnalysis = Boolean(workspacePath);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const h = await fetchHistory();
      setHistory(h);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }

  async function onAnalyze(urlOverride?: string) {
    const url = (urlOverride ?? repoUrl).trim();
    if (!url) return;
    if (urlOverride) setRepoUrl(urlOverride);
    setError(null);
    setSummaryError(null);
    setIsLoadingAnalysis(true);
    setAnalysis(null);
    setSummary(null);
    setActiveTab("home");
    try {
      const out = await analyzeRepoByUrl(url);
      setAnalysis(out);
      if (out.workspace_path) {
        setSummaryLoading(true);
        try {
          const s = await generateSummary(out.workspace_path);
          setSummary(s);
          if (user) {
            try {
              await saveHistory(url, out.workspace_path, out.scan?.stats ?? null);
              loadHistory();
            } catch {}
          }
        } catch (e: any) {
          setSummaryError(e?.message || String(e));
        } finally {
          setSummaryLoading(false);
        }
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setIsLoadingAnalysis(false);
    }
  }

  const isAnalyzing = isLoadingAnalysis || summaryLoading;

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600 animate-pulse flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 font-medium">Loading CodeAtlas…</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthModal />;

  return (
    <div className="min-h-screen hero-gradient flex flex-col" onClick={() => setUserMenuOpen(false)}>
      {/* Top Nav */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm tracking-tight hidden sm:block">CodeAtlas</span>
          </button>

          {/* Centre tabs — always visible */}
          <div className="flex items-center">
            {(
              [
                { id: "home",    label: "Home",             always: true },
                { id: "graph",   label: "Dependency Graph",  always: false },
                { id: "chat",    label: "CodeAtlas Bot",     always: false },
                { id: "feature", label: "Feature Assistant", always: false },
                { id: "history", label: "History",           always: true },
              ] as { id: Tab; label: string; always: boolean }[]
            ).map(({ id, label, always }) => {
              const locked = !always && !hasAnalysis;
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (locked) return;
                    if (id === "history") loadHistory();
                    setActiveTab(id);
                  }}
                  title={locked ? "Analyze a repository first" : label}
                  className={[
                    "relative px-3 py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap h-14 flex items-center",
                    active
                      ? "text-violet-700"
                      : locked
                      ? "text-gray-300 cursor-default"
                      : "text-gray-500 hover:text-gray-800",
                  ].join(" ")}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right — status + user */}
          <div className="flex items-center gap-2 shrink-0">
            {hasAnalysis && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />
                <span className="text-xs text-green-700 font-medium">Analyzed</span>
              </div>
            )}

            {/* User avatar + dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-white border border-gray-200 pl-1 pr-2 sm:pr-3 py-1 shadow-sm hover:shadow-md transition-shadow"
              >
                <UserAvatar user={user} size={26} />
                <span className="text-xs font-semibold text-gray-700 max-w-[70px] truncate hidden sm:block">{user.name || user.email.split("@")[0]}</span>
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-800 truncate">{user.name || "User"}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab("history"); loadHistory(); setUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Search History
                  </button>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom mobile tab bar — 3 primary tabs always reachable on small screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {(
          [
            {
              id: "home", label: "Home",
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
              always: true,
            },
            {
              id: "graph", label: "Graph",
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />,
              always: false,
            },
            {
              id: "chat", label: "Bot",
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
              always: false,
            },
          ] as { id: Tab; label: string; icon: React.ReactNode; always: boolean }[]
        ).map(({ id, label, icon, always }) => {
          const locked = !always && !hasAnalysis;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => { if (!locked) setActiveTab(id); }}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                active ? "text-violet-600" : locked ? "text-gray-300" : "text-gray-500",
              ].join(" ")}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{icon}</svg>
              <span className="text-[10px] font-medium">{label}</span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 bg-violet-600 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* HOME TAB */}
      {activeTab === "home" && (
        <main className="flex-1 flex flex-col">
          <section className="text-center px-6 pt-8 pb-10 max-w-3xl mx-auto w-full">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-violet-200 px-4 py-1.5 text-xs font-semibold text-violet-600 mb-6 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse-dot" />
              AI-POWERED CODE INTELLIGENCE
            </div>
            <h1 className="text-6xl font-extrabold tracking-tight mb-4">
              <span className="purple-gradient-text">CodeAtlas</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-8">
              Navigate complex codebases with ease. Our AI maps your repository,
              understands dependencies, and explains logic in seconds.
            </p>

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
                onClick={() => onAnalyze()}
                disabled={isAnalyzing || repoUrl.trim().length === 0}
                className="m-1.5 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition-colors"
              >
                {isLoadingAnalysis ? "Cloning…" : summaryLoading ? "Summarizing…" : "Start Analysis"}
              </button>
            </div>

            {error && (
              <div className="mt-3 max-w-xl mx-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}
          </section>

          {analysis?.scan?.stats && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon={<svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
                  iconBg="bg-blue-50" label="Total Files"
                  value={analysis.scan.stats.file_count?.toLocaleString?.() ?? analysis.scan.stats.file_count}
                  sub={<span className="text-green-500 text-xs font-medium">↑ scanned today</span>}
                />
                <StatCard
                  icon={<svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>}
                  iconBg="bg-teal-50" label="Primary Stack"
                  value={summary?.tech_stack?.[0] ?? "Detected"}
                  sub={<span className="text-gray-400 text-xs">{analysis.scan.stats.python_file_count} Python files</span>}
                />
                <StatCard
                  icon={<svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>}
                  iconBg="bg-violet-50" label="Dependencies"
                  value={`${analysis.scan.stats.dependency_edge_count} Edges`}
                  sub={<span className="text-gray-400 text-xs">Dependency connections</span>}
                />
              </div>
            </section>
          )}

          {(hasAnalysis || summaryLoading) && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className="lg:col-span-3">
                  <RepoSummary summary={summary} summaryLoading={summaryLoading} summaryError={summaryError} repoUrl={repoUrl} workspacePath={workspacePath} />
                </div>
                <div className="lg:col-span-2">
                  <ChatBox workspacePath={workspacePath} />
                </div>
              </div>
            </section>
          )}

          {hasAnalysis && (
            <section className="max-w-6xl mx-auto w-full px-6 mb-10">
              <div className="bg-white card-shadow rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Live Dependency Visualizer</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Interactive graph of module relationships</p>
                  </div>
                  <button onClick={() => setActiveTab("graph")} className="flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-xs font-semibold px-3 py-1.5 hover:bg-violet-100 transition-colors">
                    Open Full Graph →
                  </button>
                </div>
                <div style={{ height: 280 }}>
                  <DependencyGraph scan={analysis?.scan} compact />
                </div>
              </div>
            </section>
          )}

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
        <main className="flex flex-1 flex-col px-4 sm:px-6 pt-4 pb-4 max-w-7xl mx-auto w-full gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">Dependency Graph</h2>
              {repoUrl && (
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{repoUrl}</p>
              )}
            </div>
            {hasAnalysis && analysis?.scan?.stats && (
              <div className="flex items-center gap-3 shrink-0 rounded-xl bg-white border border-gray-100 card-shadow px-3 py-2">
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900">{analysis.scan.stats.file_count?.toLocaleString?.() ?? "—"}</div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Files</div>
                </div>
                <div className="w-px h-6 bg-gray-100" />
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900">{analysis.scan.stats.dependency_edge_count?.toLocaleString?.() ?? "—"}</div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Edges</div>
                </div>
              </div>
            )}
          </div>

          {!hasAnalysis ? (
            <LockedTabState label="Dependency Graph" description="Analyze a repository on the Home tab to visualize its file dependency graph." onGoHome={() => setActiveTab("home")} />
          ) : (
            <div
              className="bg-white card-shadow rounded-2xl border border-gray-100"
              style={{ height: "calc(100vh - 148px)", overflow: "hidden" }}
            >
              <DependencyGraph scan={analysis?.scan} />
            </div>
          )}
        </main>
      )}

      {/* FEATURE ASSISTANT TAB */}
      {activeTab === "feature" && (
        <main className="flex flex-1 flex-col px-6 py-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setActiveTab("home")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back to Home</button>
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
            <button onClick={() => setActiveTab("home")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back to Home</button>
            <h2 className="text-sm font-bold text-gray-800">CodeAtlas Bot</h2>
          </div>
          {!hasAnalysis ? (
            <LockedTabState label="CodeAtlas Bot" description="Analyze a repository on the Home tab first." onGoHome={() => setActiveTab("home")} />
          ) : (
            <div className="flex flex-1 flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
              <ChatBox workspacePath={workspacePath} fullPage />
            </div>
          )}
        </main>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <main className="flex flex-1 flex-col px-6 py-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveTab("home")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back to Home</button>
            <h2 className="text-sm font-bold text-gray-800">Search History</h2>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold text-gray-700">No searches yet</div>
                <div className="mt-1 max-w-sm text-sm text-gray-400">Analyze a repository and it'll appear here.</div>
              </div>
              <button onClick={() => setActiveTab("home")} className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors shadow-sm">
                Analyze a Repo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((entry) => (
                <div key={entry.id} className="bg-white card-shadow rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{entry.repo_url.replace("https://github.com/", "")}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(entry.analyzed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.stats?.file_count && (
                      <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{entry.stats.file_count} files</span>
                    )}
                    <button
                      onClick={() => onAnalyze(entry.repo_url)}
                      className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-1.5 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Re-analyze
                    </button>
                  </div>
                </div>
              ))}
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
          <p className="text-xs text-gray-600">© 2026 CodeAtlas AI Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function UserAvatar({ user, size = 32 }: { user: { name: string; email: string; picture?: string }; size?: number }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  if (user.picture) {
    return <img src={user.picture} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "white" }}>{initials}</span>
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
      <div className={`h-12 w-12 ${iconBg} rounded-xl flex items-center justify-center`}>{icon}</div>
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
