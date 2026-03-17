export type ArchLayer =
  | "entry"
  | "routes"
  | "controllers"
  | "services"
  | "database"
  | "config"
  | "utils"
  | "other";

export interface LayerMeta {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  order: number;
}

export const LAYER_CONFIG: Record<ArchLayer, LayerMeta> = {
  entry:       { label: "Entry Points",    color: "#a5b4fc", borderColor: "#6366f1", bgColor: "rgba(99,102,241,0.08)",  order: 0 },
  routes:      { label: "Routes / API",    color: "#60a5fa", borderColor: "#3b82f6", bgColor: "rgba(59,130,246,0.08)",  order: 1 },
  controllers: { label: "Controllers",     color: "#34d399", borderColor: "#10b981", bgColor: "rgba(16,185,129,0.08)",  order: 2 },
  services:    { label: "Services",        color: "#fbbf24", borderColor: "#f59e0b", bgColor: "rgba(245,158,11,0.08)",  order: 3 },
  database:    { label: "Database / Data", color: "#f87171", borderColor: "#ef4444", bgColor: "rgba(239,68,68,0.08)",   order: 4 },
  config:      { label: "Config",          color: "#c084fc", borderColor: "#a855f7", bgColor: "rgba(168,85,247,0.08)",  order: 5 },
  utils:       { label: "Utilities",       color: "#94a3b8", borderColor: "#64748b", bgColor: "rgba(100,116,139,0.08)", order: 6 },
  other:       { label: "Other",           color: "#64748b", borderColor: "#475569", bgColor: "rgba(71,85,105,0.05)",   order: 7 },
};

export interface ArchNode {
  id: string;
  path: string;
  label: string;
  language: string;
  layer: ArchLayer;
  score: number;
  inDegree: number;
  outDegree: number;
  isEntryPoint: boolean;
  classCount: number;
  functionCount: number;
}

export interface ArchEdge {
  from: string;
  to: string;
}

export interface ArchGraph {
  nodes: ArchNode[];
  edges: ArchEdge[];
  layers: ArchLayer[];
  summary: string;
  stats: {
    totalFiles: number;
    shownFiles: number;
    shownEdges: number;
  };
}

export function classifyFile(path: string, language: string): ArchLayer {
  const lower = path.toLowerCase();
  const parts = lower.split("/");
  const filename = parts[parts.length - 1] ?? "";
  const stem = filename.replace(/\.\w+$/, "");

  if (/test_|_test\.|\.test\.|\.spec\.|\/tests?\/|__tests__|__pycache__/.test(lower))
    return "other";

  const entryStems = new Set([
    "main", "app", "server", "index", "__main__", "manage",
    "wsgi", "asgi", "run", "start", "bootstrap", "init",
  ]);
  if (entryStems.has(stem)) return "entry";

  if (
    /\/routes?\/|\/router\/|\/routers\//.test(lower) ||
    /urls?\.py$|routes?\.py$|router\./.test(lower) ||
    /route|router|endpoint/.test(stem)
  ) return "routes";

  if (
    /\/controllers?\/|\/handlers?\//.test(lower) ||
    /controller|handler/.test(stem)
  ) return "controllers";

  if (language === "python" && (/\/views?\/|views?\.py$/.test(lower) || /view/.test(stem)))
    return "controllers";

  if (
    /\/services?\//.test(lower) ||
    /service\./.test(lower) ||
    /service$/.test(stem)
  ) return "services";

  if (
    /\/models?\/|\/db\/|\/database\/|\/repositories?\/|\/schemas?\/|\/migrations?\/|\/orm\//.test(lower) ||
    /model|schema|migration|repository|dao|orm|prisma|sequelize|mongoose|sqlalchemy/.test(stem)
  ) return "database";

  if (
    /\/config\/|\/settings\/|\/configuration\//.test(lower) ||
    /config\.py$|settings\.py$|constants?\.|env\./.test(lower) ||
    /config|setting|constant$|env$/.test(stem)
  ) return "config";

  if (
    /\/utils?\/|\/helpers?\/|\/lib\/|\/common\/|\/shared\/|\/core\//.test(lower) ||
    /util|helper|lib|common|shared|base/.test(stem)
  ) return "utils";

  return "other";
}

interface RawFile {
  path: string;
  language: string;
  imports?: unknown[];
  classes?: unknown[];
  functions?: unknown[];
}

interface RawScan {
  files?: RawFile[];
  dependencies?: { from: string; to: string }[];
}

const LAYER_BONUS: Record<ArchLayer, number> = {
  entry: 100,
  routes: 60,
  controllers: 50,
  services: 50,
  database: 45,
  config: 20,
  utils: 15,
  other: 0,
};

const LAYER_ORDER: Record<ArchLayer, number> = {
  entry: 0, routes: 1, controllers: 2, services: 3,
  database: 4, config: 5, utils: 6, other: 7,
};

export function buildArchGraph(scan: RawScan, maxNodes = 30): ArchGraph {
  const files = scan?.files ?? [];
  const deps = scan?.dependencies ?? [];

  const skipRe = /test_|_test\.|\.test\.|\.spec\.|\/tests?\/|__tests__|__pycache__|node_modules/;

  const fileMap: Record<string, RawFile> = {};
  for (const f of files) fileMap[f.path] = f;

  const inDeg: Record<string, number> = {};
  const outDeg: Record<string, number> = {};
  const outEdges: Record<string, string[]> = {};
  const inEdges: Record<string, string[]> = {};

  for (const f of files) {
    inDeg[f.path] = 0;
    outDeg[f.path] = 0;
    outEdges[f.path] = [];
    inEdges[f.path] = [];
  }

  for (const d of deps) {
    if (skipRe.test(d.from) || skipRe.test(d.to)) continue;
    outDeg[d.from] = (outDeg[d.from] ?? 0) + 1;
    inDeg[d.to] = (inDeg[d.to] ?? 0) + 1;
    if (outEdges[d.from]) outEdges[d.from].push(d.to);
    if (inEdges[d.to]) inEdges[d.to].push(d.from);
  }

  const allScores: Record<string, number> = {};
  for (const f of files) {
    if (skipRe.test(f.path.toLowerCase())) continue;
    const layer = classifyFile(f.path, f.language);
    allScores[f.path] = (inDeg[f.path] ?? 0) * 3 + (outDeg[f.path] ?? 0) * 1.5 + LAYER_BONUS[layer];
  }

  const sortedPaths = Object.entries(allScores)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  // Phase 1: Seed with top architectural-layer files
  const selected = new Set<string>();
  const bfsQueue: string[] = [];

  for (const path of sortedPaths) {
    if (selected.size >= Math.ceil(maxNodes * 0.55)) break;
    const layer = classifyFile(path, fileMap[path]?.language ?? "unknown");
    if (layer !== "other") {
      selected.add(path);
      bfsQueue.push(path);
    }
  }

  // Phase 2: BFS along dependency edges — prefer adding nodes connected to existing selection
  while (selected.size < maxNodes && bfsQueue.length > 0) {
    const current = bfsQueue.shift()!;
    const neighbors = [
      ...(outEdges[current] ?? []),
      ...(inEdges[current] ?? []),
    ].filter(p => allScores[p] !== undefined && !selected.has(p));

    neighbors.sort((a, b) => (allScores[b] ?? 0) - (allScores[a] ?? 0));

    for (const n of neighbors) {
      if (selected.size >= maxNodes) break;
      selected.add(n);
      bfsQueue.push(n);
    }
  }

  // Phase 3: Fill remaining slots with highest-score files not yet selected
  for (const path of sortedPaths) {
    if (selected.size >= maxNodes) break;
    if (!selected.has(path)) selected.add(path);
  }

  const pathToLayer: Record<string, ArchLayer> = {};
  for (const path of selected) {
    pathToLayer[path] = classifyFile(path, fileMap[path]?.language ?? "unknown");
  }

  const edgeSeen = new Set<string>();
  const edges: ArchEdge[] = [];
  for (const d of deps) {
    if (!selected.has(d.from) || !selected.has(d.to)) continue;
    const key = `${d.from}|${d.to}`;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);
    edges.push({ from: d.from, to: d.to });
  }

  const selectedArr = Array.from(selected).sort(
    (a, b) => (allScores[b] ?? 0) - (allScores[a] ?? 0)
  );

  const presentLayers = new Set(selectedArr.map(p => pathToLayer[p]));
  const layers = (Object.keys(LAYER_ORDER) as ArchLayer[])
    .filter(l => presentLayers.has(l))
    .sort((a, b) => LAYER_ORDER[a] - LAYER_ORDER[b]);

  const nodes: ArchNode[] = selectedArr.map(path => {
    const f = fileMap[path];
    return {
      id: path,
      path,
      label: path.split("/").pop() ?? path,
      language: f?.language ?? "unknown",
      layer: pathToLayer[path],
      score: allScores[path] ?? 0,
      inDegree: inDeg[path] ?? 0,
      outDegree: outDeg[path] ?? 0,
      isEntryPoint: pathToLayer[path] === "entry",
      classCount: (f?.classes ?? []).length,
      functionCount: (f?.functions ?? []).length,
    };
  });

  return {
    nodes,
    edges,
    layers,
    summary: generateSummary(layers, nodes, edges.length),
    stats: {
      totalFiles: files.length,
      shownFiles: nodes.length,
      shownEdges: edges.length,
    },
  };
}

function generateSummary(layers: ArchLayer[], nodes: ArchNode[], edgeCount: number): string {
  const has = (l: ArchLayer) => layers.includes(l);

  const edgeNote = edgeCount > 0 ? ` with ${edgeCount} import connections shown.` : ".";

  if (has("entry") && has("routes") && has("controllers") && has("services") && has("database"))
    return `Full-stack layered architecture: entry points route to controllers, controllers delegate to services, and services manage the data layer${edgeNote}`;

  if (has("routes") && has("controllers") && has("services") && has("database"))
    return `MVC-style architecture: routes call controllers, which delegate business logic to services that interact with the database${edgeNote}`;

  if (has("entry") && has("routes") && has("services") && has("database"))
    return `API architecture: entry points mount routes that call services, which read and write to the data layer${edgeNote}`;

  if (has("entry") && has("services") && has("database"))
    return `Service-oriented structure: entry points orchestrate services that interact with the data layer${edgeNote}`;

  if (has("routes") && has("services"))
    return `Routes delegate business logic to services — a clean separation between HTTP handling and core functionality${edgeNote}`;

  const labels = layers
    .filter(l => l !== "other")
    .map(l => LAYER_CONFIG[l].label)
    .join(", ");

  if (labels) return `Showing ${nodes.length} key files across: ${labels}${edgeNote}`;
  return `Showing the ${nodes.length} most connected files${edgeNote}`;
}
