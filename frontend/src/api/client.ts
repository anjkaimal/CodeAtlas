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
