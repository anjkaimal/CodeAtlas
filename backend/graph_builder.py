from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple


def build_react_flow_graph(repo_scan_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert the output of `repo_scanner.scan_repo()` into a React Flow-friendly graph.

    React Flow expects:
    - nodes: [{ id, data, position, ... }]
    - edges: [{ id, source, target, ... }]
    """
    files = repo_scan_json.get("files") or []
    dependencies = repo_scan_json.get("dependencies") or []

    # Use file paths as stable node IDs (React Flow IDs are strings).
    # This makes it easy to map a click in the UI back to a file.
    nodes: List[Dict[str, Any]] = []
    known_paths: Set[str] = set()

    for f in files:
        path = f.get("path")
        if not isinstance(path, str) or not path:
            continue
        known_paths.add(path)

        nodes.append(
            {
                "id": path,
                "type": "default",
                "data": {
                    "label": path.split("/")[-1],
                    "path": path,
                    "language": f.get("language") or "unknown",
                    "summary": {
                        "import_count": len(f.get("imports") or []),
                        "class_count": len(f.get("classes") or []),
                        "function_count": len(f.get("functions") or []),
                    },
                },
                # Layout is intentionally minimal here; the frontend can apply dagre/elk.
                "position": {"x": 0, "y": 0},
            }
        )

    edges: List[Dict[str, Any]] = []
    seen_edges: Set[Tuple[str, str]] = set()
    for dep in dependencies:
        src = dep.get("from")
        dst = dep.get("to")
        if not isinstance(src, str) or not isinstance(dst, str):
            continue
        if not src or not dst:
            continue
        if src == dst:
            continue
        if src not in known_paths or dst not in known_paths:
            # If the scanner ever yields edges to unknown targets, skip for now.
            continue
        key = (src, dst)
        if key in seen_edges:
            continue
        seen_edges.add(key)

        edges.append(
            {
                "id": f"{src}__DEPENDS_ON__{dst}",
                "source": src,
                "target": dst,
                "type": "smoothstep",
                "data": {"kind": "depends_on"},
            }
        )

    return {
        "nodes": nodes,
        "edges": edges,
        "meta": {
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
    }


def build_react_flow_subgraph_for_paths(
    repo_scan_json: Dict[str, Any], *, paths: List[str]
) -> Dict[str, Any]:
    """
    Build a React Flow graph filtered down to a set of file paths.
    Useful for MVP UI performance (e.g., show only python files or a selected folder).
    """
    allow = set(paths)
    filtered_files = [f for f in (repo_scan_json.get("files") or []) if f.get("path") in allow]
    filtered_deps = [
        d
        for d in (repo_scan_json.get("dependencies") or [])
        if d.get("from") in allow and d.get("to") in allow
    ]
    return build_react_flow_graph({**repo_scan_json, "files": filtered_files, "dependencies": filtered_deps})

