import { useMemo } from "react";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import type { ReactFlowGraph } from "../api/client";

function autoLayout(nodes: Node[]): Node[] {
  const COLS = Math.ceil(Math.sqrt(nodes.length)) || 1;
  const GAP_X = 200;
  const GAP_Y = 100;
  return nodes.map((n, i) => ({
    ...n,
    position: {
      x: (i % COLS) * GAP_X,
      y: Math.floor(i / COLS) * GAP_Y,
    },
  }));
}

function emptyState(message: string) {
  return (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-300">
      {message}
    </div>
  );
}

export default function DependencyGraph({ graph }: { graph?: ReactFlowGraph }) {
  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    if (!graph) return { nodes: [], edges: [] };
    const laid = autoLayout(
      (graph.nodes || []).map((n) => ({ ...n, position: n.position ?? { x: 0, y: 0 } })),
    );
    return { nodes: laid, edges: (graph.edges || []) as Edge[] };
  }, [graph]);

  if (!graph) return emptyState("No dependency graph yet. Run analysis to load it.");
  if (nodes.length === 0) return emptyState("Graph is empty — no files were found.");

  return (
    <div className="relative h-[420px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {graph.meta ? (
        <div className="absolute bottom-2 right-2 rounded bg-slate-950/80 px-2 py-1 text-xs text-slate-400">
          {graph.meta.node_count} nodes · {graph.meta.edge_count} edges
        </div>
      ) : null}
    </div>
  );
}
