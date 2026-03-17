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

const COL_W = 192;
const COL_GAP = 72;
const NODE_H = 82;
const NODE_GAP = 12;
const HEADER_H = 40;
const HEADER_GAP = 20;
const COL_PAD_X = 0;

function colX(idx: number) {
  return idx * (COL_W + COL_GAP);
}

function nodeY(indexInCol: number) {
  return HEADER_H + HEADER_GAP + indexInCol * (NODE_H + NODE_GAP);
}

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

function langDot(language: string) {
  return LANG_COLOR[language.toLowerCase()] ?? "#64748b";
}

const LaneHeaderNode: React.FC<NodeProps> = ({ data }) => {
  const { label, color, borderColor, bgColor } = data as {
    label: string;
    color: string;
    borderColor: string;
    bgColor: string;
  };
  return (
    <div
      style={{
        width: COL_W,
        height: HEADER_H,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.07em",
        textTransform: "uppercase" as const,
        color,
        userSelect: "none" as const,
      }}
    >
      {label}
    </div>
  );
};

const ArchFileNode: React.FC<NodeProps> = ({ data }) => {
  const node = data.node as ArchNode;
  const { color, borderColor, bgColor } = LAYER_CONFIG[node.layer];
  const dot = langDot(node.language);

  return (
    <div
      style={{
        width: COL_W,
        minHeight: NODE_H,
        background: "rgba(15,23,42,0.85)",
        border: `1.5px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        backdropFilter: "blur(4px)",
        cursor: "default",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: borderColor, width: 8, height: 8, border: "none" }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dot,
            marginTop: 4,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#f1f5f9",
            lineHeight: 1.3,
            wordBreak: "break-word" as const,
          }}
        >
          {node.label}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, paddingLeft: 12 }}>
        {node.isEntryPoint && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              padding: "1px 5px",
              borderRadius: 4,
              background: `${color}22`,
              color,
              border: `1px solid ${color}44`,
            }}
          >
            entry
          </span>
        )}
        <span
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 4,
            background: "rgba(71,85,105,0.4)",
            color: "#94a3b8",
          }}
        >
          {node.language}
        </span>
        {node.inDegree > 0 && (
          <span style={{ fontSize: 9, color: "#64748b" }}>
            ↙ {node.inDegree}
          </span>
        )}
        {node.outDegree > 0 && (
          <span style={{ fontSize: 9, color: "#64748b" }}>
            ↗ {node.outDegree}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: borderColor, width: 8, height: 8, border: "none" }}
      />
    </div>
  );
};

const nodeTypes = {
  laneHeader: LaneHeaderNode,
  archFile: ArchFileNode,
};

function emptyState(title: string, hint: string) {
  return (
    <div
      style={{ height: "100%", width: "100%" }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center"
    >
      <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <div className="text-sm font-medium text-slate-400">{title}</div>
      {hint && <div className="text-xs text-slate-600 max-w-xs">{hint}</div>}
    </div>
  );
}

interface Props {
  scan?: {
    files?: unknown[];
    dependencies?: unknown[];
    [key: string]: unknown;
  };
}

export default function DependencyGraph({ scan }: Props) {
  const archGraph = useMemo(() => {
    if (!scan) return null;
    return buildArchGraph(scan as Parameters<typeof buildArchGraph>[0]);
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
        position: { x: colX(colIdx) + COL_PAD_X, y: 0 },
        data: { label: cfg.label, color: cfg.color, borderColor: cfg.borderColor, bgColor: cfg.bgColor },
        draggable: false,
        selectable: false,
        connectable: false,
      });
      layerCounts[layer] = 0;
    }

    for (const node of archGraph.nodes) {
      const colIdx = layerToCol[node.layer] ?? 0;
      const idxInCol = layerCounts[node.layer] ?? 0;
      layerCounts[node.layer] = idxInCol + 1;

      rfNodes.push({
        id: node.id,
        type: "archFile",
        position: { x: colX(colIdx) + COL_PAD_X, y: nodeY(idxInCol) },
        data: { node },
        draggable: true,
        selectable: true,
      });
    }

    const rfEdges: Edge[] = archGraph.edges.map((e, i) => {
      const srcLayer = archGraph.nodes.find(n => n.id === e.from)?.layer ?? "other";
      const color = LAYER_CONFIG[srcLayer].borderColor;
      return {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        type: "smoothstep",
        animated: srcLayer === "entry",
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.7 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 12,
          height: 12,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [archGraph]);

  if (!scan) return emptyState("No data", "Analyze a repository first.");
  if (!archGraph || archGraph.nodes.length === 0)
    return emptyState("Graph is empty", "No architectural files were found in this repository.");

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <SummaryCard archGraph={archGraph} />
      <div style={{ flex: 1 }} className="rounded-xl overflow-hidden border border-slate-800">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.25}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={24} size={1} />
          <Controls
            style={{ background: "rgba(15,23,42,0.8)", border: "1px solid #1e293b", borderRadius: 8 }}
            showInteractive={false}
          />
          <MiniMap
            style={{ background: "rgba(15,23,42,0.9)", border: "1px solid #1e293b", borderRadius: 8 }}
            nodeColor={(n) => {
              if (n.type === "laneHeader") return "transparent";
              const node = n.data?.node as ArchNode | undefined;
              return node ? LAYER_CONFIG[node.layer].borderColor : "#475569";
            }}
            maskColor="rgba(2,6,23,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function SummaryCard({ archGraph }: { archGraph: ReturnType<typeof buildArchGraph> }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-slate-200">Architecture Overview</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">
            {archGraph.stats.shownFiles} of {archGraph.stats.totalFiles} files
          </span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">{archGraph.stats.shownEdges} connections</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{archGraph.summary}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0 max-w-xs">
        {archGraph.layers.map(layer => {
          const cfg = LAYER_CONFIG[layer];
          const count = archGraph.nodes.filter(n => n.layer === layer).length;
          return (
            <span
              key={layer}
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 99,
                background: cfg.bgColor,
                border: `1px solid ${cfg.borderColor}66`,
                color: cfg.color,
                fontWeight: 600,
                whiteSpace: "nowrap" as const,
              }}
            >
              {cfg.label} · {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
