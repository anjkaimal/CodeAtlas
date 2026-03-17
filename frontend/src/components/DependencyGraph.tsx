import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  Position,
  Handle,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  buildArchGraph,
  LAYER_CONFIG,
  type ArchLayer,
  type ArchNode,
} from "../utils/archGraph";

const NODE_W = 200;
const NODE_H = 88;
const COL_GAP = 88;
const ROW_GAP = 16;
const HEADER_H = 36;

function colX(idx: number) { return idx * (NODE_W + COL_GAP); }
function nodeY(indexInCol: number) { return HEADER_H + 20 + indexInCol * (NODE_H + ROW_GAP); }

const LANG_COLOR: Record<string, string> = {
  python: "#3b82f6",
  typescript: "#60a5fa",
  javascript: "#fbbf24",
  go: "#34d399",
  rust: "#f87171",
  java: "#fb923c",
  ruby: "#f472b6",
  csharp: "#a78bfa",
};
function langDot(language: string) { return LANG_COLOR[language.toLowerCase()] ?? "#94a3b8"; }

const LaneHeaderNode: React.FC<NodeProps> = ({ data }) => {
  const { label, color, borderColor, bgColor } = data as {
    label: string; color: string; borderColor: string; bgColor: string;
  };
  return (
    <div style={{
      width: NODE_W, height: HEADER_H,
      background: bgColor, border: `1.5px solid ${borderColor}`,
      borderRadius: 8, display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700, fontSize: 10,
      letterSpacing: "0.07em", textTransform: "uppercase" as const,
      color, userSelect: "none" as const,
    }}>
      {label}
    </div>
  );
};

const ArchFileNode: React.FC<NodeProps> = ({ data }) => {
  const node = data.node as ArchNode;
  const { color, borderColor, bgColor } = LAYER_CONFIG[node.layer];
  const dot = langDot(node.language);
  const hasConnections = node.inDegree > 0 || node.outDegree > 0;

  return (
    <div style={{
      width: NODE_W, minHeight: NODE_H,
      background: "white",
      border: `1.5px solid ${borderColor}`,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 8, padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 5,
      boxShadow: hasConnections
        ? `0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px ${borderColor}22`
        : "0 1px 3px rgba(0,0,0,0.06)",
      cursor: "default",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ background: borderColor, width: 9, height: 9, border: "2px solid white" }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: dot, marginTop: 4, flexShrink: 0,
        }} />
        <div style={{
          fontSize: 12, fontWeight: 600, color: "#1e293b",
          lineHeight: 1.3, wordBreak: "break-word" as const,
        }}>
          {node.label}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, paddingLeft: 13 }}>
        {node.isEntryPoint && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase" as const, padding: "1px 5px",
            borderRadius: 4, background: `${color}22`, color,
            border: `1px solid ${color}55`,
          }}>entry</span>
        )}
        <span style={{
          fontSize: 9, padding: "1px 5px", borderRadius: 4,
          background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0",
        }}>{node.language}</span>
        {node.inDegree > 0 && (
          <span style={{
            fontSize: 9, padding: "1px 5px", borderRadius: 4,
            background: `${borderColor}12`, color: borderColor,
            border: `1px solid ${borderColor}30`, fontWeight: 600,
          }}>↙ {node.inDegree} in</span>
        )}
        {node.outDegree > 0 && (
          <span style={{
            fontSize: 9, padding: "1px 5px", borderRadius: 4,
            background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0",
          }}>↗ {node.outDegree} out</span>
        )}
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: borderColor, width: 9, height: 9, border: "2px solid white" }} />
    </div>
  );
};

const nodeTypes = { laneHeader: LaneHeaderNode, archFile: ArchFileNode };

function emptyState(title: string, hint: string) {
  return (
    <div style={{ height: "100%", width: "100%" }}
      className="flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="h-14 w-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-500">{title}</div>
        {hint && <div className="text-xs text-gray-400 mt-1 max-w-xs">{hint}</div>}
      </div>
    </div>
  );
}

interface Props {
  scan?: {
    files?: unknown[];
    dependencies?: unknown[];
    [key: string]: unknown;
  };
  compact?: boolean;
}

export default function DependencyGraph({ scan, compact }: Props) {
  const archGraph = useMemo(() => {
    if (!scan) return null;
    return buildArchGraph(scan as Parameters<typeof buildArchGraph>[0], 20);
  }, [scan]);

  const { nodes: rfNodes, edges: rfEdges } = useMemo(() => {
    if (!archGraph || archGraph.nodes.length === 0) return { nodes: [], edges: [] };

    const layerToCol: Record<string, number> = {};
    archGraph.layers.forEach((l, i) => { layerToCol[l] = i; });

    const layerCounts: Record<string, number> = {};
    const rfNodes: Node[] = [];

    for (const layer of archGraph.layers) {
      const colIdx = layerToCol[layer];
      const cfg = LAYER_CONFIG[layer];
      rfNodes.push({
        id: `lane-${layer}`,
        type: "laneHeader",
        position: { x: colX(colIdx), y: 0 },
        data: { label: cfg.label, color: cfg.color, borderColor: cfg.borderColor, bgColor: cfg.bgColor },
        draggable: false, selectable: false, connectable: false,
      });
      layerCounts[layer] = 0;
    }

    for (const node of archGraph.nodes) {
      const colIdx = layerToCol[node.layer] ?? 0;
      const idxInCol = layerCounts[node.layer] ?? 0;
      layerCounts[node.layer] = idxInCol + 1;
      rfNodes.push({
        id: node.id, type: "archFile",
        position: { x: colX(colIdx), y: nodeY(idxInCol) },
        data: { node }, draggable: true, selectable: true,
      });
    }

    const nodeSet = new Set(archGraph.nodes.map(n => n.id));

    const rfEdges: Edge[] = archGraph.edges
      .filter(e => nodeSet.has(e.from) && nodeSet.has(e.to))
      .map((e, i) => {
        const srcNode = archGraph.nodes.find(n => n.id === e.from);
        const srcLayer = srcNode?.layer ?? "other";
        const color = LAYER_CONFIG[srcLayer].borderColor;
        const isMainFlow = ["entry", "routes", "controllers", "services"].includes(srcLayer);
        const isSynth = !!e.synthetic;

        return {
          id: `e${i}`,
          source: e.from,
          target: e.to,
          type: "smoothstep",
          animated: !isSynth && isMainFlow,
          style: {
            stroke: isSynth ? "#94a3b8" : color,
            strokeWidth: isSynth ? 1.5 : isMainFlow ? 2.5 : 1.8,
            opacity: isSynth ? 0.45 : isMainFlow ? 0.9 : 0.72,
            strokeDasharray: isSynth ? "5 4" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSynth ? "#94a3b8" : color,
            width: isSynth ? 10 : 14,
            height: isSynth ? 10 : 14,
          },
        };
      });

    return { nodes: rfNodes, edges: rfEdges };
  }, [archGraph]);

  if (!scan) return emptyState("No data", "Analyze a repository first.");
  if (!archGraph || archGraph.nodes.length === 0)
    return emptyState("Graph is empty", "No architectural files were detected in this repository.");

  const hasSyntheticEdges = archGraph.edges.some(e => e.synthetic);

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {!compact && <SummaryCard archGraph={archGraph} edgeCount={rfEdges.length} isSynthetic={hasSyntheticEdges} />}

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={24} size={1} />
          <Controls
            style={{
              background: "white", border: "1px solid #e2e8f0",
              borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
            showInteractive={false}
          />
          {!compact && (
            <MiniMap
              style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8 }}
              nodeColor={(n) => {
                if (n.type === "laneHeader") return "transparent";
                const node = n.data?.node as ArchNode | undefined;
                return node ? LAYER_CONFIG[node.layer].borderColor : "#94a3b8";
              }}
              maskColor="rgba(241,245,249,0.7)"
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

function SummaryCard({ archGraph, edgeCount, isSynthetic }: {
  archGraph: ReturnType<typeof buildArchGraph>;
  edgeCount: number;
  isSynthetic: boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm mx-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">Architecture Overview</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">
            {archGraph.stats.shownFiles} of {archGraph.stats.totalFiles} files shown
          </span>
          <span className="text-xs text-gray-300">·</span>
          {edgeCount > 0 ? (
            <span className={`text-xs font-medium ${isSynthetic ? "text-amber-500" : "text-violet-600"}`}>
              {edgeCount} {isSynthetic ? "inferred structural connections" : "real import connections"}
            </span>
          ) : (
            <span className="text-xs text-gray-400">no connections</span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{archGraph.summary}</p>
        {isSynthetic && (
          <p className="text-xs text-amber-600 mt-1">
            ⟶ Dashed lines show inferred architectural flow. Re-analyze a Python or TypeScript repo for exact import edges.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0 max-w-xs">
        {archGraph.layers.map(layer => {
          const cfg = LAYER_CONFIG[layer];
          const count = archGraph.nodes.filter(n => n.layer === layer).length;
          return (
            <span key={layer} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 99,
              background: cfg.bgColor, border: `1px solid ${cfg.borderColor}66`,
              color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" as const,
            }}>
              {cfg.label} · {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
