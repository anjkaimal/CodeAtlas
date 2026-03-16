export type AnalyzeRepoResponse = {
  workspace_path: string;
  tree: unknown;
  // Future fields we can add backend-side:
  scan?: unknown;
  graph?: { nodes: any[]; edges: any[]; meta?: any };
  summary?: any;
};

const DEFAULT_API_BASE = "http://127.0.0.1:8000";

export function getApiBase(): string {
  return import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
}

export async function analyzeRepoByUrl(repoUrl: string): Promise<AnalyzeRepoResponse> {
  const fd = new FormData();
  fd.append("repo_url", repoUrl);
  const res = await fetch(`${getApiBase()}/api/repos/analyze`, {
    method: "POST",
    body: fd
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as AnalyzeRepoResponse;
}

