#!/usr/bin/env python3
"""
Organize blog posts into silo-based content sections.

This moves posts from /content/blog/ to their primary category section:
- /content/homebuyer/
- /content/homeseller/
- /content/propertymanagement/
- /content/realtors/
- /content/lasvegas/

The first category in each post's frontmatter determines its section.
"""

import os
import re
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent / "grandprixrealty.agency" / "content"
BLOG_DIR = BASE_DIR / "blog"

# Map category names to section folders
CATEGORY_TO_SECTION = {
    "Buyers": "homebuyer",
    "Sellers": "homeseller",
    "Property Management": "propertymanagement",
    "Careers": "realtors",
    "Las Vegas": "lasvegas",
}

def parse_frontmatter(content):
    """Extract frontmatter from markdown file."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if match:
        return match.group(1), content[match.end():]
    return None, content

def get_primary_category(frontmatter):
    """Get the first (primary) category from frontmatter."""
    match = re.search(r'categories:\s*\["([^"]+)"', frontmatter)
    if match:
        return match.group(1)
    return None

def ensure_section_index(section_path, title):
    """Create _index.md for section if it doesn't exist."""
    index_path = section_path / "_index.md"
    if not index_path.exists():
        content = f"""---
title: "{title}"
description: "Grand Prix Realty {title} Resources"
---
"""
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Created {index_path}")

def move_post(filepath, section):
    """Move a post to its section folder."""
    section_path = BASE_DIR / section
    section_path.mkdir(exist_ok=True)

    dest_path = section_path / filepath.name
    shutil.move(str(filepath), str(dest_path))
    return dest_path

def main():
    print(f"Organizing blog posts by silo...")
    print(f"Source: {BLOG_DIR}")
    print("=" * 60)

    # Create section folders and indexes
    section_titles = {
        "homebuyer": "Home Buyers Guide",
        "homeseller": "Home Sellers Guide",
        "propertymanagement": "Property Management",
        "realtors": "Real Estate Careers",
        "lasvegas": "Las Vegas Market",
    }

    for section, title in section_titles.items():
        section_path = BASE_DIR / section
        section_path.mkdir(exist_ok=True)
        ensure_section_index(section_path, title)

    moved = 0
    skipped = 0
    by_section = {s: 0 for s in CATEGORY_TO_SECTION.values()}

    for filepath in sorted(BLOG_DIR.glob("*.md")):
        if filepath.name == "_index.md":
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        frontmatter, _ = parse_frontmatter(content)
        if not frontmatter:
            print(f"  SKIP (no frontmatter): {filepath.name}")
            skipped += 1
            continue

        primary_cat = get_primary_category(frontmatter)
        if not primary_cat:
            print(f"  SKIP (no category): {filepath.name}")
            skipped += 1
            continue

        section = CATEGORY_TO_SECTION.get(primary_cat)
        if not section:
            print(f"  SKIP (unknown category '{primary_cat}'): {filepath.name}")
            skipped += 1
            continue

        dest = move_post(filepath, section)
        by_section[section] += 1
        moved += 1
        print(f"  {filepath.name} -> /{section}/")

    print("=" * 60)
    print(f"Moved: {moved}, Skipped: {skipped}")
    print("\nBy section:")
    for section, count in by_section.items():
        print(f"  /{section}/: {count} posts")

if __name__ == "__main__":
    main()
