#!/usr/bin/env python3
"""
Remap blog post categories to 5 silos:
1. Buyers - homebuyer content
2. Sellers - homeseller content
3. Property Management - landlord/rental content
4. Careers - realtor/agent content
5. Las Vegas - local market content

Category mapping logic:
- Buyer, Investor (buying focus), Loan Program -> Buyers
- Seller, Listings -> Sellers
- Landlord, Property Management, Rental, Short Term Rentals, tenants -> Property Management
- New Agent, Realtor content -> Careers
- Las Vegas -> Las Vegas
- Uncategorized, NewsFeed, Updates, Real Estate Learning Center -> determine by content keywords
"""

import os
import re
from pathlib import Path

BLOG_DIR = Path(__file__).parent.parent / "grandprixrealty.agency" / "content" / "blog"

# Category mapping rules
CATEGORY_MAP = {
    # Direct mappings
    "Buyer": "Buyers",
    "Loan Program": "Buyers",

    "Seller": "Sellers",
    "Listings": "Sellers",

    "Landlord": "Property Management",
    "Property Management": "Property Management",
    "Rental Listings": "Property Management",
    "Short Term Rentals": "Property Management",
    "tenants": "Property Management",
    "Real Wealth": "Property Management",  # Usually investment/rental focused

    "New Agent": "Careers",
    "Make Money Online": "Careers",
    "Real Estate": "Careers",  # Generic, likely agent-focused

    "Las Vegas": "Las Vegas",
    "Location": "Las Vegas",

    # Categories to ignore (will be determined by other categories or content)
    "Investor": None,  # Could be Buyers or Property Management - check context
    "NewsFeed": None,
    "Updates": None,
    "Real Estate Learning Center": None,
    "Uncategorized": None,
    "YT": None,
    "Case Study": None,
}

def parse_frontmatter(content):
    """Extract frontmatter from markdown file."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if match:
        return match.group(1), content[match.end():]
    return None, content

def extract_categories(frontmatter):
    """Extract categories from frontmatter."""
    match = re.search(r'categories:\s*\[(.*?)\]', frontmatter)
    if match:
        cats_str = match.group(1)
        # Parse the array
        cats = re.findall(r'"([^"]+)"', cats_str)
        return cats
    return []

def determine_primary_silo(old_categories, title, content):
    """Determine the primary silo based on categories and content.

    Returns categories with the PRIMARY silo first (this determines URL path).
    Primary category is based on the TITLE and original categories, not just content.
    """
    secondary = set()
    title_lower = title.lower()
    content_lower = content.lower()

    # Score-based approach: count keyword hits in TITLE (weighted 3x) and content
    scores = {
        "Buyers": 0,
        "Sellers": 0,
        "Property Management": 0,
        "Careers": 0,
        "Las Vegas": 0,
    }

    # Buyer keywords
    buyer_kw = ["buy", "buyer", "homebuyer", "mortgage", "loan", "first-time", "purchase", "down payment", "preapproval", "fha", "va loan", "conventional"]
    for kw in buyer_kw:
        if kw in title_lower:
            scores["Buyers"] += 3
        if kw in content_lower:
            scores["Buyers"] += 1

    # Seller keywords
    seller_kw = ["sell", "seller", "listing", "home value", "staging", "price your home", "curb appeal", "appraisal", "closing costs seller"]
    for kw in seller_kw:
        if kw in title_lower:
            scores["Sellers"] += 3
        if kw in content_lower:
            scores["Sellers"] += 1

    # Property Management keywords (be more specific)
    pm_kw = ["landlord", "property management", "tenant", "rental property", "lease agreement", "eviction", "section 8", "airbnb", "short-term rental", "cash flow", "rental income"]
    for kw in pm_kw:
        if kw in title_lower:
            scores["Property Management"] += 3
        if kw in content_lower:
            scores["Property Management"] += 1

    # Careers keywords
    career_kw = ["agent", "realtor", "broker", "commission", "career", "license", "new agent", "real estate agent"]
    for kw in career_kw:
        if kw in title_lower:
            scores["Careers"] += 3
        if kw in content_lower:
            scores["Careers"] += 1

    # Las Vegas keywords
    lv_kw = ["las vegas", "nevada", "henderson", "summerlin", "north las vegas"]
    for kw in lv_kw:
        if kw in title_lower:
            scores["Las Vegas"] += 3
        if kw in content_lower:
            scores["Las Vegas"] += 1

    # Boost from original categories
    if "Buyer" in old_categories:
        scores["Buyers"] += 5
    if "Seller" in old_categories:
        scores["Sellers"] += 5
    if "Landlord" in old_categories or "Property Management" in old_categories:
        scores["Property Management"] += 5
    if "New Agent" in old_categories:
        scores["Careers"] += 5
    if "Las Vegas" in old_categories:
        scores["Las Vegas"] += 2

    # Handle Investor - boost both Buyers and PM, let content decide
    if "Investor" in old_categories:
        scores["Buyers"] += 2
        scores["Property Management"] += 2

    # Determine primary by highest score
    primary = max(scores, key=scores.get)

    # If tied or low scores, default to Buyers
    if scores[primary] < 3:
        primary = "Buyers"

    # Add secondary categories (only if score > 3)
    for cat, score in scores.items():
        if cat != primary and score >= 3:
            secondary.add(cat)

    # Build final list with primary first
    result = [primary] + sorted(list(secondary))
    return result

def update_file(filepath):
    """Update a single markdown file with new categories."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter, body = parse_frontmatter(content)
    if not frontmatter:
        print(f"  SKIP (no frontmatter): {filepath.name}")
        return False

    old_categories = extract_categories(frontmatter)
    if not old_categories:
        print(f"  SKIP (no categories): {filepath.name}")
        return False

    # Get title
    title_match = re.search(r'title:\s*"([^"]+)"', frontmatter)
    title = title_match.group(1) if title_match else ""

    new_categories = determine_primary_silo(old_categories, title, body)

    # Format new categories
    new_cats_str = ', '.join(f'"{cat}"' for cat in new_categories)

    # Replace categories in frontmatter
    new_frontmatter = re.sub(
        r'categories:\s*\[.*?\]',
        f'categories: [{new_cats_str}]',
        frontmatter
    )

    # Reconstruct file
    new_content = f"---\n{new_frontmatter}\n---{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  {filepath.name}: {old_categories} -> {new_categories}")
    return True

def main():
    print(f"Processing blog posts in: {BLOG_DIR}")
    print("=" * 60)

    updated = 0
    skipped = 0

    for filepath in sorted(BLOG_DIR.glob("*.md")):
        if filepath.name == "_index.md":
            continue

        if update_file(filepath):
            updated += 1
        else:
            skipped += 1

    print("=" * 60)
    print(f"Updated: {updated}, Skipped: {skipped}")

if __name__ == "__main__":
    main()
