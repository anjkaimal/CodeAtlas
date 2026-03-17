export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children: FileTreeNode[];
};

export type ReactFlowGraph = {
  nodes: Array<{ id: string; type: string; data: any; position: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string; type: string; data?: any }>;
  meta?: { node_count: number; edge_count: number };
};

export type AnalyzeRepoResponse = {
  workspace_path: string;
  tree: FileTreeNode;
  scan?: any;
  graph?: ReactFlowGraph;
};

export type RepoSummary = {
  project_purpose: string;
  entry_points: string[];
  tech_stack: string[];
  major_modules: Array<{ name: string; paths: string[]; reason: string }>;
  notes: string[];
  model: string;
  raw: string;
};

export type FeatureSuggestion = {
  file_path: string;
  insertion: {
    type: "function" | "method" | "class" | "line_anchor" | "file_level";
    name: string | null;
    line: number | null;
    anchor: string | null;
  };
  explanation: string;
  confidence: "high" | "medium" | "low";
};

export type FeatureAssistantResponse = {
  suggestions: FeatureSuggestion[];
  questions: string[];
  notes: string[];
  model: string;
  raw: string;
};

export type HistoryEntry = {
  id: number;
  user_id: number;
  repo_url: string;
  workspace_path: string | null;
  analyzed_at: string;
  stats: any;
};

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) detail = text;
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function analyzeRepoByUrl(repoUrl: string): Promise<AnalyzeRepoResponse> {
  const fd = new FormData();
  fd.append("repo_url", repoUrl);
  const res = await fetch("/api/repos/analyze", {
    method: "POST",
    body: fd,
  });
  return handleResponse<AnalyzeRepoResponse>(res);
}

export async function generateSummary(workspacePath: string): Promise<RepoSummary> {
  const res = await fetch("/api/repos/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_path: workspacePath }),
  });
  return handleResponse<RepoSummary>(res);
}

export async function suggestFeature(
  workspacePath: string,
  featureRequest: string,
): Promise<FeatureAssistantResponse> {
  const res = await fetch("/api/repos/feature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_path: workspacePath, feature_request: featureRequest }),
  });
  return handleResponse<FeatureAssistantResponse>(res);
}

export async function loginWithEmail(email: string, password: string) {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token: string; user: any }>(res);
}

export async function registerWithEmail(email: string, name: string, password: string) {
  const res = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  return handleResponse<{ token: string; user: any }>(res);
}

export async function saveHistory(
  repoUrl: string,
  workspacePath: string | null,
  stats: any,
): Promise<HistoryEntry> {
  const res = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ repo_url: repoUrl, workspace_path: workspacePath, stats }),
  });
  return handleResponse<HistoryEntry>(res);
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await fetch("/api/history", {
    headers: { ...authHeaders() },
  });
  return handleResponse<HistoryEntry[]>(res);
}
