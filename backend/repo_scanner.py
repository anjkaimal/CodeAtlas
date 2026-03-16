from __future__ import annotations

import ast
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


SKIP_DIRS = {
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "build",
}


@dataclass(frozen=True)
class ImportRef:
    kind: str  # "import" | "from"
    module: Optional[str]
    name: Optional[str]
    level: int


def scan_repo(repo_root: str | Path) -> Dict[str, Any]:
    """
    Walk a repository folder and return structured JSON describing:
    - files
    - python imports/classes/functions
    - best-effort dependency edges between in-repo python modules
    """
    root = Path(repo_root).resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError(f"repo_root must be an existing directory: {root}")

    python_module_index = _build_python_module_index(root)

    files: List[Dict[str, Any]] = []
    dependency_edges: List[Dict[str, str]] = []

    for file_path in _iter_files(root):
        rel = _rel_posix(file_path, root)
        ext = file_path.suffix.lower()

        if ext == ".py":
            parsed = _scan_python_file(file_path)
            resolved_import_targets = _resolve_python_imports(
                file_path=file_path,
                repo_root=root,
                imports=parsed["imports"],
                module_index=python_module_index,
            )
            for target in resolved_import_targets:
                dependency_edges.append({"from": rel, "to": target})

            files.append(
                {
                    "path": rel,
                    "language": "python",
                    **parsed,
                }
            )
        else:
            # MVP: still include non-python files in the report,
            # but don't attempt deep parsing yet.
            files.append(
                {
                    "path": rel,
                    "language": _guess_language_from_ext(ext),
                    "imports": [],
                    "classes": [],
                    "functions": [],
                }
            )

    return {
        "repo_root": str(root),
        "files": sorted(files, key=lambda f: f["path"]),
        "dependencies": _dedupe_edges(dependency_edges),
        "stats": {
            "file_count": len(files),
            "python_file_count": sum(1 for f in files if f["language"] == "python"),
            "dependency_edge_count": len(_dedupe_edges(dependency_edges)),
        },
    }


def _iter_files(root: Path) -> Iterable[Path]:
    for dirpath, dirnames, filenames in os.walk(root):
        # prune skipped dirs in-place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            yield Path(dirpath) / name


def _scan_python_file(path: Path) -> Dict[str, Any]:
    try:
        source = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        source = path.read_text(encoding="latin-1", errors="ignore")

    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return {"imports": [], "classes": [], "functions": []}

    imports: List[Dict[str, Any]] = []
    classes: List[Dict[str, Any]] = []
    functions: List[Dict[str, Any]] = []

    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(
                    {
                        "kind": "import",
                        "module": alias.name,
                        "name": None,
                        "asname": alias.asname,
                        "level": 0,
                    }
                )
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                imports.append(
                    {
                        "kind": "from",
                        "module": node.module,
                        "name": alias.name,
                        "asname": alias.asname,
                        "level": node.level or 0,
                    }
                )
        elif isinstance(node, ast.ClassDef):
            classes.append(
                {
                    "name": node.name,
                    "line": getattr(node, "lineno", None),
                    "bases": [_expr_to_name(b) for b in node.bases],
                    "methods": [
                        {
                            "name": f.name,
                            "line": getattr(f, "lineno", None),
                            "args": _function_arg_names(f),
                            "is_async": isinstance(f, ast.AsyncFunctionDef),
                        }
                        for f in node.body
                        if isinstance(f, (ast.FunctionDef, ast.AsyncFunctionDef))
                    ],
                }
            )
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append(
                {
                    "name": node.name,
                    "line": getattr(node, "lineno", None),
                    "args": _function_arg_names(node),
                    "is_async": isinstance(node, ast.AsyncFunctionDef),
                }
            )

    return {"imports": imports, "classes": classes, "functions": functions}


def _function_arg_names(fn: ast.FunctionDef | ast.AsyncFunctionDef) -> List[str]:
    args = []
    for a in fn.args.posonlyargs:
        args.append(a.arg)
    for a in fn.args.args:
        args.append(a.arg)
    if fn.args.vararg is not None:
        args.append("*" + fn.args.vararg.arg)
    for a in fn.args.kwonlyargs:
        args.append(a.arg)
    if fn.args.kwarg is not None:
        args.append("**" + fn.args.kwarg.arg)
    return args


def _expr_to_name(expr: ast.expr) -> str:
    if isinstance(expr, ast.Name):
        return expr.id
    if isinstance(expr, ast.Attribute):
        return f"{_expr_to_name(expr.value)}.{expr.attr}"
    if isinstance(expr, ast.Subscript):
        return _expr_to_name(expr.value)
    return expr.__class__.__name__


def _rel_posix(path: Path, base: Path) -> str:
    return str(path.relative_to(base)).replace("\\", "/")


def _guess_language_from_ext(ext: str) -> str:
    return {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".json": "json",
        ".md": "markdown",
        ".yml": "yaml",
        ".yaml": "yaml",
        ".toml": "toml",
        ".css": "css",
        ".html": "html",
        ".py": "python",
    }.get(ext, "unknown")


def _build_python_module_index(repo_root: Path) -> Dict[str, str]:
    """
    Build an index from module name -> relative file path for python files in the repo.
    Example: repo/pkg/util.py -> "pkg.util" and "pkg.util.__init__" mapping is not included.
    """
    index: Dict[str, str] = {}
    for file_path in _iter_files(repo_root):
        if file_path.suffix.lower() != ".py":
            continue
        rel = file_path.relative_to(repo_root)
        parts = list(rel.parts)
        parts[-1] = parts[-1][:-3]  # strip .py
        module = ".".join(parts)
        index[module] = _rel_posix(file_path, repo_root)
        if rel.name == "__init__.py" and len(parts) >= 1:
            pkg = ".".join(parts[:-1])
            index[pkg] = _rel_posix(file_path, repo_root)
    return index


def _resolve_python_imports(
    *,
    file_path: Path,
    repo_root: Path,
    imports: List[Dict[str, Any]],
    module_index: Dict[str, str],
) -> List[str]:
    """
    Resolve a file's imports to in-repo python file paths when possible.
    Returns a list of target paths (relative posix) for dependencies.
    """
    file_rel = file_path.relative_to(repo_root)
    file_mod = ".".join(list(file_rel.parts)[:-1] + [file_rel.stem])
    current_pkg = ".".join(file_mod.split(".")[:-1])

    resolved: List[str] = []
    for imp in imports:
        kind = imp.get("kind")
        module = imp.get("module")
        name = imp.get("name")
        level = int(imp.get("level") or 0)

        # Handle "import x.y"
        if kind == "import" and isinstance(module, str):
            # try exact module, then progressively shorten ("a.b.c" -> "a.b" -> "a")
            cand = module
            while cand:
                if cand in module_index:
                    resolved.append(module_index[cand])
                    break
                if "." not in cand:
                    break
                cand = cand.rsplit(".", 1)[0]
            continue

        # Handle "from x import y" / relative imports via level
        if kind == "from":
            base_mod = module or ""
            if level > 0:
                pkg_parts = current_pkg.split(".") if current_pkg else []
                pkg_parts = pkg_parts[: max(0, len(pkg_parts) - (level - 1))]
                prefix = ".".join([p for p in pkg_parts if p])
                base_mod = ".".join([p for p in [prefix, base_mod] if p])

            # candidate targets: the module itself, plus module.name
            candidates: List[str] = []
            if base_mod:
                candidates.append(base_mod)
            if base_mod and isinstance(name, str) and name != "*":
                candidates.append(f"{base_mod}.{name}")

            for cand in candidates:
                if cand in module_index:
                    resolved.append(module_index[cand])
                    break

    # filter self edges and de-dup while preserving order
    src_rel = _rel_posix(file_path, repo_root)
    out: List[str] = []
    seen = set()
    for t in resolved:
        if t == src_rel:
            continue
        if t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def _dedupe_edges(edges: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen: set[Tuple[str, str]] = set()
    out: List[Dict[str, str]] = []
    for e in edges:
        key = (e["from"], e["to"])
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out

