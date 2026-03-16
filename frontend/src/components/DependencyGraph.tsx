import React, { useMemo } from "react";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

export type ReactFlowGraph = {
  nodes: Node[];
  edges: Edge[];
  meta?: any;
};

function emptyState(message: string) {
  return (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-300">
      {message}
    </div>
  );
}

export default function DependencyGraph(props: { graph?: ReactFlowGraph }) {
  const { nodes, edges } = useMemo(() => {
    const g = props.graph;
    return {
      nodes: (g?.nodes || []).map((n) => ({ ...n, position: n.position ?? { x: 0, y: 0 } })),
      edges: g?.edges || []
    };
  }, [props.graph]);

  if (!props.graph) return emptyState("No dependency graph yet. Run analysis to load it.");
  if (nodes.length === 0) return emptyState("Graph is empty.");

  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

