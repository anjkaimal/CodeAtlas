from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from openai import OpenAI


DEFAULT_MODEL = os.getenv("CODEATLAS_OPENAI_MODEL", "gpt-4.1-mini")


def suggest_feature_location(
    *,
    feature_request: str,
    repo_structure: Dict[str, Any],
    api_key: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    """
    Given a feature request and a repository structure, suggest where to implement it.

    Returns a JSON-like dict with suggested file(s) and insertion location(s) suitable
    for driving a "feature location assistant" UI.
    """
    if not feature_request or not feature_request.strip():
        raise ValueError("feature_request must be a non-empty string")

    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("Missing OpenAI API key. Set OPENAI_API_KEY or pass api_key=...")

    client = OpenAI(api_key=key)

    structure_json = _compact_json(repo_structure, max_chars=120_000)

    system = (
        "You are a senior software engineer helping a developer implement a new feature. "
        "You must propose the most likely file(s) to modify and a precise insertion point "
        "(function name, class method name, or approximate line anchor). "
        "Be explicit about uncertainty; do not invent files that are not present."
    )

    user = (
        "Feature request:\n"
        f"{feature_request}\n\n"
        "Repository structure JSON:\n"
        f"{structure_json}\n\n"
        "Return ONLY valid JSON with this schema:\n"
        "{\n"
        '  \"suggestions\": [\n'
        "    {\n"
        '      \"file_path\": string,\n'
        '      \"insertion\": {\n'
        '        \"type\": \"function\" | \"method\" | \"class\" | \"line_anchor\" | \"file_level\",\n'
        '        \"name\": string | null,\n'
        '        \"line\": number | null,\n'
        '        \"anchor\": string | null\n'
        "      },\n"
        '      \"explanation\": string,\n'
        '      \"confidence\": \"high\" | \"medium\" | \"low\"\n'
        "    }\n"
        "  ],\n"
        '  \"questions\": string[],\n'
        '  \"notes\": string[]\n'
        "}\n\n"
        "Rules:\n"
        "- file_path must match an existing path in repo_structure.\n"
        "- Prefer a function/method name when available; otherwise provide a line_anchor like "
        "\"near FastAPI router definition\" or \"inside main request handler\".\n"
        "- If you need clarification, add items to questions (but still return best-effort suggestions).\n"
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
            "suggestions": [],
            "questions": [],
            "notes": ["Model did not return valid JSON; see raw output."],
        }

    return {
        **parsed,
        "raw": content,
        "model": model,
    }


def _compact_json(value: Any, *, max_chars: int) -> str:
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 20] + "...TRUNCATED..."

