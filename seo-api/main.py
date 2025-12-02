"""
SEO Lab API for Grand Prix Realty
FastAPI backend for SEO monitoring and analysis

Endpoints:
- GET /seo/dashboard - Dashboard summary stats
- GET /seo/posts - List all posts with scores
- GET /seo/posts/{slug} - Single post details
- GET /seo/issues - List all issues
- GET /seo/links - Internal links graph data
- POST /seo/analyze - Trigger re-analysis
"""

import os
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://supabase.grandprixrealty.agency')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

app = FastAPI(
    title="Grand Prix Realty SEO Lab API",
    description="Internal API for blog SEO monitoring and analysis",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://grandprixrealty.agency",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class DashboardSummary(BaseModel):
    total_posts: int
    published_posts: int
    draft_posts: int
    avg_score: float
    excellent_posts: int
    good_posts: int
    needs_work_posts: int
    poor_posts: int
    total_words: int
    avg_word_count: int
    total_internal_links: int
    orphan_pages: int
    open_issues: int
    critical_issues: int


class CategoryStats(BaseModel):
    category: str
    post_count: int
    avg_score: float
    avg_word_count: int


class PostSummary(BaseModel):
    id: str
    slug: str
    url: str
    title: str
    description: Optional[str]
    categories: List[str]
    word_count: int
    internal_links_out: int
    internal_links_in: int
    overall_score: int
    is_draft: bool
    has_wordpress_images: bool
    published_at: Optional[str]
    last_analyzed_at: Optional[str]


class PostDetail(BaseModel):
    id: str
    slug: str
    url: str
    title: str
    seo_title: Optional[str]
    description: Optional[str]
    target_keyword: Optional[str]
    word_count: int
    h1_count: int
    h2_count: int
    h3_count: int
    paragraph_count: int
    image_count: int
    images_with_alt: int
    internal_links_out: int
    internal_links_in: int
    external_links: int
    title_score: int
    description_score: int
    keyword_score: int
    content_score: int
    links_score: int
    readability_score: int
    overall_score: int
    categories: List[str]
    featured_listing_type: Optional[str]
    is_draft: bool
    has_wordpress_images: bool
    published_at: Optional[str]
    last_analyzed_at: Optional[str]
    issues: List[dict]
    outbound_links: List[dict]
    inbound_links: List[dict]


class IssueSummary(BaseModel):
    id: str
    post_slug: str
    post_title: Optional[str]
    issue_type: str
    severity: str
    message: str
    suggestion: Optional[str]
    resolved: bool
    created_at: str


class LinkData(BaseModel):
    source_slug: str
    target_slug: Optional[str]
    target_url: str
    anchor_text: Optional[str]


# Dependency: Get Supabase client with SEO schema
def get_supabase() -> Client:
    if not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return client

# Helper to query SEO schema tables
def seo_table(supabase: Client, table_name: str):
    """Query a table in the seo schema."""
    return supabase.schema('seo').table(table_name)


# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "seo-api"}


# Dashboard summary
@app.get("/seo/dashboard", response_model=DashboardSummary)
async def get_dashboard(supabase: Client = Depends(get_supabase)):
    """Get dashboard summary statistics."""
    try:
        # Query the dashboard view
        result = seo_table(supabase, 'dashboard_summary').select('*').execute()

        if result.data and len(result.data) > 0:
            data = result.data[0]
            return DashboardSummary(**data)

        # Fallback: calculate manually
        posts = seo_table(supabase, 'posts').select('*').execute()
        issues = seo_table(supabase, 'issues').select('*').eq('resolved', False).execute()

        if not posts.data:
            return DashboardSummary(
                total_posts=0, published_posts=0, draft_posts=0,
                avg_score=0, excellent_posts=0, good_posts=0,
                needs_work_posts=0, poor_posts=0, total_words=0,
                avg_word_count=0, total_internal_links=0,
                orphan_pages=0, open_issues=0, critical_issues=0
            )

        all_posts = posts.data
        published = [p for p in all_posts if not p.get('is_draft')]
        drafts = [p for p in all_posts if p.get('is_draft')]

        scores = [p.get('overall_score', 0) for p in all_posts]
        words = [p.get('word_count', 0) for p in all_posts]
        links = [p.get('internal_links_out', 0) for p in all_posts]
        orphans = [p for p in published if p.get('internal_links_in', 0) == 0]

        critical = [i for i in (issues.data or []) if i.get('severity') == 'critical']

        return DashboardSummary(
            total_posts=len(all_posts),
            published_posts=len(published),
            draft_posts=len(drafts),
            avg_score=round(sum(scores) / len(scores), 1) if scores else 0,
            excellent_posts=len([s for s in scores if s >= 80]),
            good_posts=len([s for s in scores if 60 <= s < 80]),
            needs_work_posts=len([s for s in scores if 40 <= s < 60]),
            poor_posts=len([s for s in scores if s < 40]),
            total_words=sum(words),
            avg_word_count=int(sum(words) / len(words)) if words else 0,
            total_internal_links=sum(links),
            orphan_pages=len(orphans),
            open_issues=len(issues.data or []),
            critical_issues=len(critical)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Category stats
@app.get("/seo/categories", response_model=List[CategoryStats])
async def get_category_stats(supabase: Client = Depends(get_supabase)):
    """Get statistics by category."""
    try:
        result = seo_table(supabase, 'category_stats').select('*').execute()
        return [CategoryStats(**row) for row in (result.data or [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# List posts
@app.get("/seo/posts", response_model=List[PostSummary])
async def list_posts(
    category: Optional[str] = Query(None, description="Filter by category"),
    min_score: Optional[int] = Query(None, description="Minimum overall score"),
    max_score: Optional[int] = Query(None, description="Maximum overall score"),
    has_issues: Optional[bool] = Query(None, description="Filter posts with issues"),
    is_draft: Optional[bool] = Query(None, description="Filter by draft status"),
    sort_by: str = Query("overall_score", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    limit: int = Query(100, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination"),
    supabase: Client = Depends(get_supabase)
):
    """List posts with optional filtering and sorting."""
    try:
        query = seo_table(supabase, 'posts').select(
            'id, slug, url, title, description, categories, word_count, '
            'internal_links_out, internal_links_in, overall_score, is_draft, '
            'has_wordpress_images, published_at, last_analyzed_at'
        )

        # Apply filters
        if category:
            query = query.contains('categories', [category])

        if min_score is not None:
            query = query.gte('overall_score', min_score)

        if max_score is not None:
            query = query.lte('overall_score', max_score)

        if is_draft is not None:
            query = query.eq('is_draft', is_draft)

        # Sort
        ascending = sort_order.lower() == 'asc'
        query = query.order(sort_by, desc=not ascending)

        # Pagination
        query = query.range(offset, offset + limit - 1)

        result = query.execute()

        return [PostSummary(**row) for row in (result.data or [])]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get single post
@app.get("/seo/posts/{slug}", response_model=PostDetail)
async def get_post(slug: str, supabase: Client = Depends(get_supabase)):
    """Get detailed SEO data for a single post."""
    try:
        # Get post
        post_result = seo_table(supabase, 'posts').select('*').eq('slug', slug).execute()

        if not post_result.data:
            raise HTTPException(status_code=404, detail="Post not found")

        post = post_result.data[0]

        # Get issues
        issues_result = seo_table(supabase, 'issues').select('*').eq('post_slug', slug).execute()

        # Get outbound links
        outbound_result = seo_table(supabase, 'internal_links').select('*').eq('source_slug', slug).execute()

        # Get inbound links
        inbound_result = seo_table(supabase, 'internal_links').select('*').eq('target_slug', slug).execute()

        return PostDetail(
            **post,
            issues=issues_result.data or [],
            outbound_links=outbound_result.data or [],
            inbound_links=inbound_result.data or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# List issues
@app.get("/seo/issues", response_model=List[IssueSummary])
async def list_issues(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    issue_type: Optional[str] = Query(None, description="Filter by issue type"),
    resolved: bool = Query(False, description="Include resolved issues"),
    limit: int = Query(100, description="Limit results"),
    supabase: Client = Depends(get_supabase)
):
    """List SEO issues across all posts."""
    try:
        query = seo_table(supabase, 'issues').select(
            'id, post_slug, issue_type, severity, message, suggestion, resolved, created_at'
        )

        if not resolved:
            query = query.eq('resolved', False)

        if severity:
            query = query.eq('severity', severity)

        if issue_type:
            query = query.eq('issue_type', issue_type)

        query = query.order('severity', desc=False).limit(limit)

        result = query.execute()

        # Get post titles
        issues = result.data or []
        if issues:
            slugs = list(set(i['post_slug'] for i in issues))
            posts_result = seo_table(supabase, 'posts').select('slug, title').in_('slug', slugs).execute()
            slug_to_title = {p['slug']: p['title'] for p in (posts_result.data or [])}

            for issue in issues:
                issue['post_title'] = slug_to_title.get(issue['post_slug'])

        return [IssueSummary(**row) for row in issues]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get issue types summary
@app.get("/seo/issues/types")
async def get_issue_types(supabase: Client = Depends(get_supabase)):
    """Get summary of issue types and counts."""
    try:
        result = seo_table(supabase, 'issues').select('issue_type, severity').eq('resolved', False).execute()

        if not result.data:
            return []

        # Count by type
        type_counts = {}
        for issue in result.data:
            key = issue['issue_type']
            if key not in type_counts:
                type_counts[key] = {'issue_type': key, 'count': 0, 'severity': issue['severity']}
            type_counts[key]['count'] += 1

        return sorted(type_counts.values(), key=lambda x: (-x['count']))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Internal links graph
@app.get("/seo/links")
async def get_links_graph(supabase: Client = Depends(get_supabase)):
    """Get internal links data for graph visualization."""
    try:
        # Get all posts (nodes)
        posts = seo_table(supabase, 'posts').select(
            'slug, title, overall_score, internal_links_in, internal_links_out, categories'
        ).eq('is_draft', False).execute()

        # Get all links (edges)
        links = seo_table(supabase, 'internal_links').select('*').execute()

        return {
            "nodes": posts.data or [],
            "edges": links.data or []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Posts needing attention
@app.get("/seo/attention")
async def get_posts_needing_attention(
    limit: int = Query(20, description="Limit results"),
    supabase: Client = Depends(get_supabase)
):
    """Get posts that need the most attention."""
    try:
        # Get posts with low scores or critical issues
        posts = seo_table(supabase, 'posts').select(
            'slug, title, url, overall_score, categories'
        ).eq('is_draft', False).lt('overall_score', 60).order('overall_score', desc=False).limit(limit).execute()

        # Get critical issues count per post
        issues = seo_table(supabase, 'issues').select(
            'post_slug'
        ).eq('resolved', False).eq('severity', 'critical').execute()

        critical_counts = {}
        for issue in (issues.data or []):
            slug = issue['post_slug']
            critical_counts[slug] = critical_counts.get(slug, 0) + 1

        # Enrich posts with issue counts
        result = []
        for post in (posts.data or []):
            post['critical_issues'] = critical_counts.get(post['slug'], 0)
            result.append(post)

        # Sort by critical issues then score
        result.sort(key=lambda x: (-x['critical_issues'], x['overall_score']))

        return result[:limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Resolve issue
@app.post("/seo/issues/{issue_id}/resolve")
async def resolve_issue(issue_id: str, supabase: Client = Depends(get_supabase)):
    """Mark an issue as resolved."""
    try:
        result = seo_table(supabase, 'issues').update({
            'resolved': True,
            'resolved_at': datetime.utcnow().isoformat()
        }).eq('id', issue_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Issue not found")

        return {"status": "resolved", "id": issue_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Trigger analysis (would call the analyzer script)
@app.post("/seo/analyze")
async def trigger_analysis(supabase: Client = Depends(get_supabase)):
    """Trigger a re-analysis of all posts."""
    try:
        # Create analysis run record
        run = seo_table(supabase, 'analysis_runs').insert({
            'started_at': datetime.utcnow().isoformat(),
            'status': 'running'
        }).execute()

        # In a real setup, this would trigger the analyzer script
        # For now, return the run ID
        return {
            "status": "started",
            "run_id": run.data[0]['id'] if run.data else None,
            "message": "Analysis started. Run the analyzer.py script to complete."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
