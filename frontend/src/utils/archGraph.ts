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
  entry:       { label: "Entry Points",    color: "#a5b4fc", borderColor: "#6366f1", bgColor: "rgba(99,102,241,0.07)",  order: 0 },
  routes:      { label: "Routes / API",    color: "#60a5fa", borderColor: "#3b82f6", bgColor: "rgba(59,130,246,0.07)",  order: 1 },
  controllers: { label: "Controllers",     color: "#34d399", borderColor: "#10b981", bgColor: "rgba(16,185,129,0.07)",  order: 2 },
  services:    { label: "Services",        color: "#fbbf24", borderColor: "#f59e0b", bgColor: "rgba(245,158,11,0.07)",  order: 3 },
  database:    { label: "Database / Data", color: "#f87171", borderColor: "#ef4444", bgColor: "rgba(239,68,68,0.07)",   order: 4 },
  config:      { label: "Config",          color: "#c084fc", borderColor: "#a855f7", bgColor: "rgba(168,85,247,0.07)",  order: 5 },
  utils:       { label: "Utilities",       color: "#94a3b8", borderColor: "#64748b", bgColor: "rgba(100,116,139,0.07)", order: 6 },
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

export function buildArchGraph(scan: RawScan, maxNodes = 22): ArchGraph {
  const files = scan?.files ?? [];
  const deps = scan?.dependencies ?? [];

  const inDeg: Record<string, number> = {};
  const outDeg: Record<string, number> = {};
  for (const f of files) { inDeg[f.path] = 0; outDeg[f.path] = 0; }
  for (const d of deps) {
    outDeg[d.from] = (outDeg[d.from] ?? 0) + 1;
    inDeg[d.to] = (inDeg[d.to] ?? 0) + 1;
  }

  const skipRe = /test_|_test\.|\.test\.|\.spec\.|\/tests?\/|__tests__|__pycache__|node_modules/;

  const candidates = files
    .filter(f => !skipRe.test(f.path.toLowerCase()))
    .map(f => {
      const layer = classifyFile(f.path, f.language);
      const inD = inDeg[f.path] ?? 0;
      const outD = outDeg[f.path] ?? 0;
      const score = inD * 3 + outD * 1.5 + LAYER_BONUS[layer];
      return {
        path: f.path,
        language: f.language,
        layer,
        score,
        inDegree: inD,
        outDegree: outD,
        isEntryPoint: layer === "entry",
        classCount: (f.classes ?? []).length,
        functionCount: (f.functions ?? []).length,
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected = candidates.slice(0, maxNodes);
  const selectedPaths = new Set(selected.map(n => n.path));
  const pathToLayer: Record<string, ArchLayer> = {};
  for (const n of selected) pathToLayer[n.path] = n.layer;

  const importantLayers = new Set<ArchLayer>(["entry", "routes", "controllers", "services", "database"]);

  const edgeSeen = new Set<string>();
  const edges: ArchEdge[] = [];
  for (const d of deps) {
    if (!selectedPaths.has(d.from) || !selectedPaths.has(d.to)) continue;
    const key = `${d.from}|${d.to}`;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);
    const sl = pathToLayer[d.from];
    const dl = pathToLayer[d.to];
    if (sl !== dl || importantLayers.has(sl) || importantLayers.has(dl)) {
      edges.push({ from: d.from, to: d.to });
    }
  }

  const presentLayers = new Set(selected.map(n => n.layer));
  const layers = (Object.keys(LAYER_ORDER) as ArchLayer[])
    .filter(l => presentLayers.has(l))
    .sort((a, b) => LAYER_ORDER[a] - LAYER_ORDER[b]);

  const nodes: ArchNode[] = selected.map(n => ({
    id: n.path,
    path: n.path,
    label: n.path.split("/").pop() ?? n.path,
    language: n.language,
    layer: n.layer,
    score: n.score,
    inDegree: n.inDegree,
    outDegree: n.outDegree,
    isEntryPoint: n.isEntryPoint,
    classCount: n.classCount,
    functionCount: n.functionCount,
  }));

  return {
    nodes,
    edges,
    layers,
    summary: generateSummary(layers, nodes),
    stats: {
      totalFiles: files.length,
      shownFiles: selected.length,
      shownEdges: edges.length,
    },
  };
}

function generateSummary(layers: ArchLayer[], nodes: ArchNode[]): string {
  const has = (l: ArchLayer) => layers.includes(l);

  if (has("entry") && has("routes") && has("controllers") && has("services") && has("database"))
    return "Full-stack layered architecture: entry points route to controllers, controllers delegate to services, and services manage the data layer.";

  if (has("routes") && has("controllers") && has("services") && has("database"))
    return "MVC-style architecture: routes call controllers, which delegate business logic to services that interact with the database.";

  if (has("entry") && has("routes") && has("services") && has("database"))
    return "API architecture: entry points mount routes that call services, which read and write to the data layer.";

  if (has("entry") && has("services") && has("database"))
    return "Service-oriented structure: entry points orchestrate services that interact with the data layer.";

  if (has("routes") && has("services"))
    return "Routes delegate business logic to services — a clean separation between HTTP handling and core functionality.";

  if (has("entry") && has("services"))
    return "Entry points coordinate service modules with clear separation of concerns.";

  const labels = layers
    .filter(l => l !== "other")
    .map(l => LAYER_CONFIG[l].label)
    .join(", ");

  if (labels)
    return `Showing ${nodes.length} key files across: ${labels}.`;

  return `Showing the ${nodes.length} most connected files in this repository.`;
}
