from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from openai import OpenAI


DEFAULT_MODEL = os.getenv("CODEATLAS_OPENAI_MODEL", "gpt-4.1-mini")


def generate_repo_summary(
    repo_structure: Dict[str, Any],
    *,
    api_key: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    """
    Generate a high-level architecture summary for a repository using OpenAI.

    Input:
      - repo_structure: JSON-like dict describing the repo (file tree and/or scan output)

    Output:
      - dict with: project_purpose, entry_points, tech_stack, major_modules, notes, raw
    """
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("Missing OpenAI API key. Set OPENAI_API_KEY or pass api_key=...")

    client = OpenAI(api_key=key)

    structure_json = _compact_json(repo_structure, max_chars=120_000)

    system = (
        "You are a senior software architect. "
        "Given a repository structure, infer what the project does and how it is organized. "
        "Be honest about uncertainty and only claim what is supported by the structure."
    )

    user = (
        "Analyze the repository structure JSON below and produce a concise summary.\n\n"
        "Return ONLY valid JSON with this schema:\n"
        "{\n"
        '  \"project_purpose\": string,\n'
        '  \"entry_points\": string[],\n'
        '  \"tech_stack\": string[],\n'
        '  \"major_modules\": [{\"name\": string, \"paths\": string[], \"reason\": string}],\n'
        '  \"notes\": string[]\n'
        "}\n\n"
        "Repository structure JSON:\n"
        f"{structure_json}\n"
    )

    resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )

    content = resp.choices[0].message.content or "{}"
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {
            "project_purpose": "",
            "entry_points": [],
            "tech_stack": [],
            "major_modules": [],
            "notes": ["Model did not return valid JSON; see raw output."],
        }

    return {
        **parsed,
        "raw": content,
        "model": model,
    }


def _compact_json(value: Any, *, max_chars: int) -> str:
    """
    Serialize JSON while keeping within a size budget.
    Best-effort truncation (keeps prefix) to avoid huge prompts for large repos.
    """
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 20] + "...TRUNCATED..."

