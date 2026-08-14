#!/usr/bin/env python3
"""Build Skill Shelf from a single skills.md into dist/. No third-party dependencies."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILLS_PATH = ROOT / "skills.md"
STATIC_DIR = ROOT / "static"
DIST_DIR = ROOT / "dist"
CONFIG_PATH = ROOT / "config.json"

H2_RE = re.compile(r"^##\s+(.+?)\s*$")
H3_RE = re.compile(r"^###\s+(.+?)\s*$")
FENCE_RE = re.compile(r"^(`{3,}|~{3,})\s*([^`]*)$")


def slugify(title: str) -> str:
    slug = title.strip().lower()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9\u4e00-\u9fff_-]+", "-", slug)
    return slug.strip("-") or "skill"


def short_description(content: str, limit: int = 92) -> str:
    one_line = re.sub(r"\s+", " ", content).strip()
    if len(one_line) <= limit:
        return one_line
    return one_line[: limit - 1].rstrip() + "…"


def extract_first_fence(lines: list[str], start: int, end: int) -> tuple[str | None, int | None]:
    """Return the first fenced block content between start/end and its opening line index."""
    for i in range(start, end):
        match = FENCE_RE.match(lines[i].rstrip())
        if not match:
            continue
        fence = match.group(1)
        fence_char = fence[0]
        fence_len = len(fence)
        content: list[str] = []
        for j in range(i + 1, end):
            closing = lines[j].strip()
            if re.fullmatch(re.escape(fence_char) + "{" + str(fence_len) + ",}", closing):
                return "\n".join(content).strip("\n"), i
            content.append(lines[j])
        # Unclosed fence: treat the rest of this section as the prompt rather than dropping it.
        return "\n".join(content).strip("\n"), i
    return None, None


def load_skills() -> list[dict]:
    if not SKILLS_PATH.exists():
        raise FileNotFoundError("skills.md not found")

    text = SKILLS_PATH.read_text(encoding="utf-8").replace("\r\n", "\n")
    lines = text.split("\n")

    # Track the nearest ## heading above each line. It is an optional category.
    categories_at_line: list[str] = []
    current_category = "其他"
    for line in lines:
        h2 = H2_RE.match(line)
        if h2:
            current_category = h2.group(1).strip()
        categories_at_line.append(current_category)

    h3_positions: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        h3 = H3_RE.match(line)
        if h3:
            h3_positions.append((i, h3.group(1).strip()))

    skills: list[dict] = []
    used_slugs: dict[str, int] = {}
    for idx, (line_no, title) in enumerate(h3_positions):
        section_end = h3_positions[idx + 1][0] if idx + 1 < len(h3_positions) else len(lines)
        content, fence_line = extract_first_fence(lines, line_no + 1, section_end)

        # Backward-compatible fallback: if there is no fence, use non-empty plain text
        # until the next heading. Fenced blocks are still the recommended format.
        if content is None:
            plain: list[str] = []
            for raw in lines[line_no + 1 : section_end]:
                if H2_RE.match(raw):
                    break
                plain.append(raw)
            content = "\n".join(plain).strip()

        if not content:
            continue

        base = slugify(title)
        used_slugs[base] = used_slugs.get(base, 0) + 1
        slug = base if used_slugs[base] == 1 else f"{base}-{used_slugs[base]}"
        category = categories_at_line[line_no] if line_no < len(categories_at_line) else "其他"

        skills.append(
            {
                "slug": slug,
                "title": title,
                "category": category,
                "description": short_description(content),
                "tags": [],
                "content": content,
                "source": f"skills.md#L{(fence_line if fence_line is not None else line_no) + 1}",
            }
        )
    return skills


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8")) if CONFIG_PATH.exists() else {}
    skills = load_skills()

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    shutil.copytree(STATIC_DIR, DIST_DIR)

    payload = {"config": config, "skills": skills}
    data_js = "window.SKILL_SHELF_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    (DIST_DIR / "skills-data.js").write_text(data_js, encoding="utf-8")
    (DIST_DIR / ".nojekyll").write_text("", encoding="utf-8")

    print(f"Built {len(skills)} skills from {SKILLS_PATH.name} -> {DIST_DIR}")


if __name__ == "__main__":
    main()
