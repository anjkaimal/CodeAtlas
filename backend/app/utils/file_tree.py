from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Literal, TypedDict


NodeType = Literal["file", "directory"]


class FileTreeNode(TypedDict, total=True):
    name: str
    path: str
    type: NodeType
    children: List["FileTreeNode"]


def build_file_tree(root: Path) -> FileTreeNode:
    """
    Build a nested file tree starting at `root`.
    """
    root = root.resolve()

    def _build(node_path: Path, base: Path) -> FileTreeNode:
        rel_path = node_path.relative_to(base)
        if node_path.is_dir():
            children: List[FileTreeNode] = sorted(
                (
                    _build(child, base)
                    for child in node_path.iterdir()
                    if not child.name.startswith(".") and child.name != "__pycache__"
                ),
                key=lambda n: (0 if n["type"] == "directory" else 1, n["name"].lower()),
            )
            return FileTreeNode(
                name=node_path.name,
                path=str(rel_path).replace("\\", "/"),
                type="directory",
                children=children,
            )
        else:
            return FileTreeNode(
                name=node_path.name,
                path=str(rel_path).replace("\\", "/"),
                type="file",
                children=[],
            )

    return _build(root, root)

