#!/usr/bin/env python3
"""Build Skill Shelf from skills/*.md into dist/. No third-party dependencies."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILLS_DIR = ROOT / "skills"
STATIC_DIR = ROOT / "static"
DIST_DIR = ROOT / "dist"
CONFIG_PATH = ROOT / "config.json"


def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    text = text.replace("\r\n", "\n")
    if not text.startswith("---\n"):
        return {}, text.strip()

    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text.strip()

    raw_meta = text[4:end]
    body = text[end + 5 :].strip()
    meta: dict[str, str] = {}
    for line in raw_meta.splitlines():
        if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"').strip("'")
    return meta, body


def slugify(filename: str, title: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"^\d+[-_. ]*", "", stem)
    slug = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff_-]+", "-", stem).strip("-")
    if slug:
        return slug.lower()
    fallback = re.sub(r"\s+", "-", title.strip())
    return fallback or "skill"


def load_skills() -> list[dict]:
    skills: list[dict] = []
    for path in sorted(SKILLS_DIR.glob("*.md")):
        meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        title = meta.get("title") or path.stem
        tags = [tag.strip() for tag in meta.get("tags", "").split(",") if tag.strip()]
        skills.append(
            {
                "slug": meta.get("slug") or slugify(path.name, title),
                "title": title,
                "category": meta.get("category", "其他"),
                "description": meta.get("description", ""),
                "tags": tags,
                "content": body,
                "source": f"skills/{path.name}",
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

    print(f"Built {len(skills)} skills -> {DIST_DIR}")


if __name__ == "__main__":
    main()
