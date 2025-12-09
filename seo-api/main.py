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
- POST /seo/ai/optimize - AI-powered optimization
"""

import os
from datetime import datetime
from typing import Optional, List
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import frontmatter

# Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://supabase.grandprixrealty.agency')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
CONTENT_PATH = Path(os.environ.get('CONTENT_PATH', '/content/blog'))

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
            # Handle None values from the view when there's no data
            sanitized = {
                'total_posts': data.get('total_posts') or 0,
                'published_posts': data.get('published_posts') or 0,
                'draft_posts': data.get('draft_posts') or 0,
                'avg_score': data.get('avg_score') or 0.0,
                'excellent_posts': data.get('excellent_posts') or 0,
                'good_posts': data.get('good_posts') or 0,
                'needs_work_posts': data.get('needs_work_posts') or 0,
                'poor_posts': data.get('poor_posts') or 0,
                'total_words': data.get('total_words') or 0,
                'avg_word_count': data.get('avg_word_count') or 0,
                'total_internal_links': data.get('total_internal_links') or 0,
                'orphan_pages': data.get('orphan_pages') or 0,
                'open_issues': data.get('open_issues') or 0,
                'critical_issues': data.get('critical_issues') or 0,
            }
            return DashboardSummary(**sanitized)

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


# Trigger analysis - runs the analyzer script
@app.post("/seo/analyze")
async def trigger_analysis(
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase)
):
    """Trigger a re-analysis of all posts."""
    import subprocess
    from pathlib import Path

    content_path = Path(os.environ.get('CONTENT_PATH', '/content/blog'))

    if not content_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Content path not found: {content_path}. Ensure the Hugo content directory is mounted."
        )

    # Count markdown files
    md_files = list(content_path.glob("*.md"))
    md_files = [f for f in md_files if f.name != "_index.md"]

    if not md_files:
        raise HTTPException(
            status_code=404,
            detail="No blog posts found to analyze"
        )

    try:
        # Run the analyzer script in subprocess
        result = subprocess.run(
            ["python", "/app/analyzer.py"],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            env={
                **os.environ,
                'CONTENT_PATH': str(content_path),
                'SUPABASE_URL': SUPABASE_URL,
                'SUPABASE_SERVICE_KEY': SUPABASE_SERVICE_KEY
            }
        )

        if result.returncode != 0:
            return {
                "status": "error",
                "message": f"Analyzer completed with errors",
                "details": result.stderr or result.stdout
            }

        return {
            "status": "completed",
            "message": f"Successfully analyzed {len(md_files)} blog posts",
            "details": result.stdout[-1000:] if len(result.stdout) > 1000 else result.stdout
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Analysis timed out after 5 minutes")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# AI OPTIMIZATION ENDPOINTS
# ==========================================

from ai_optimizer import get_optimizer, SEOOptimizer, InternalLinkSuggestion


class OptimizeRequest(BaseModel):
    slug: str
    optimize_meta: bool = True
    optimize_title: bool = True
    optimize_content: bool = False  # Expensive, off by default
    suggest_links: bool = True


class OptimizationPreview(BaseModel):
    slug: str
    title: str
    original_meta: Optional[str]
    suggested_meta: Optional[str]
    meta_explanation: Optional[str]
    original_title: str
    suggested_title: Optional[str]
    title_explanation: Optional[str]
    original_content: Optional[str]
    suggested_content: Optional[str]
    content_explanation: Optional[str]
    internal_links: List[dict]
    confidence_scores: dict


class ApplyOptimizationRequest(BaseModel):
    slug: str
    apply_meta: bool = False
    new_meta: Optional[str] = None
    apply_title: bool = False
    new_title: Optional[str] = None
    apply_content: bool = False
    new_content: Optional[str] = None
    apply_links: List[dict] = []  # [{anchor_text, target_url}]


class BatchOptimizeRequest(BaseModel):
    slugs: List[str]
    optimize_meta: bool = True
    optimize_title: bool = True
    suggest_links: bool = True


def read_post_file(slug: str) -> tuple[dict, str]:
    """Read a blog post markdown file and return frontmatter + content."""
    file_path = CONTENT_PATH / f"{slug}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Post file not found: {slug}")

    with open(file_path, 'r', encoding='utf-8') as f:
        post = frontmatter.load(f)

    return dict(post.metadata), post.content


def write_post_file(slug: str, metadata: dict, content: str):
    """Write updated blog post to markdown file."""
    file_path = CONTENT_PATH / f"{slug}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Post file not found: {slug}")

    post = frontmatter.Post(content, **metadata)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(frontmatter.dumps(post))


@app.post("/seo/ai/build-index")
async def build_content_index(supabase: Client = Depends(get_supabase)):
    """Build the content index for internal linking suggestions."""
    try:
        # Get all posts from database
        result = seo_table(supabase, 'posts').select(
            'slug, title, description, target_keyword, categories'
        ).execute()

        posts = []
        for row in (result.data or []):
            # Read content from file
            try:
                _, content = read_post_file(row['slug'])
                posts.append({
                    'slug': row['slug'],
                    'title': row['title'],
                    'content': content,
                    'target_keyword': row.get('target_keyword', ''),
                    'categories': row.get('categories', [])
                })
            except Exception:
                continue  # Skip files that can't be read

        optimizer = get_optimizer()
        optimizer.build_content_index(posts)

        return {
            "status": "success",
            "message": f"Built index for {len(posts)} posts",
            "indexed_posts": len(posts)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/seo/ai/optimize", response_model=OptimizationPreview)
async def optimize_post(
    request: OptimizeRequest,
    supabase: Client = Depends(get_supabase)
):
    """Generate AI optimization suggestions for a single post."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Optimize request: slug={request.slug}, meta={request.optimize_meta}, title={request.optimize_title}, content={request.optimize_content}, links={request.suggest_links}")
    try:
        # Get post data from database
        post_result = seo_table(supabase, 'posts').select('*').eq('slug', request.slug).execute()
        if not post_result.data:
            raise HTTPException(status_code=404, detail="Post not found in database")

        post_data = post_result.data[0]

        # Read content from file
        metadata, content = read_post_file(request.slug)

        optimizer = get_optimizer()

        result = OptimizationPreview(
            slug=request.slug,
            title=post_data['title'],
            original_meta=post_data.get('description'),
            suggested_meta=None,
            meta_explanation=None,
            original_title=post_data['title'],
            suggested_title=None,
            title_explanation=None,
            original_content=content if request.optimize_content else None,
            suggested_content=None,
            content_explanation=None,
            internal_links=[],
            confidence_scores={}
        )

        target_keyword = post_data.get('target_keyword', '')

        # Generate meta description
        if request.optimize_meta:
            meta_result = await optimizer.generate_meta_description(
                title=post_data['title'],
                content=content,
                target_keyword=target_keyword
            )
            result.suggested_meta = meta_result.optimized
            result.meta_explanation = meta_result.explanation
            result.confidence_scores['meta'] = meta_result.confidence

        # Optimize title
        if request.optimize_title:
            title_result = await optimizer.optimize_title(
                current_title=post_data['title'],
                content=content,
                target_keyword=target_keyword
            )
            result.suggested_title = title_result.optimized
            result.title_explanation = title_result.explanation
            result.confidence_scores['title'] = title_result.confidence

        # Improve content (expensive, use Sonnet)
        if request.optimize_content:
            logger.info(f"Starting content optimization for {request.slug}")
            try:
                content_result = await optimizer.improve_content(
                    content=content,
                    title=post_data['title'],
                    target_keyword=target_keyword
                )
                result.suggested_content = content_result.optimized
                result.content_explanation = content_result.explanation
                result.confidence_scores['content'] = content_result.confidence
                logger.info(f"Content optimization completed for {request.slug}, result length: {len(content_result.optimized) if content_result.optimized else 0}")
            except Exception as content_error:
                logger.error(f"Content optimization failed for {request.slug}: {str(content_error)}")
                raise

        # Suggest internal links
        if request.suggest_links:
            # Get existing internal links
            links_result = seo_table(supabase, 'internal_links').select(
                'target_url'
            ).eq('source_slug', request.slug).execute()
            existing_links = [l['target_url'] for l in (links_result.data or [])]

            link_suggestions = await optimizer.suggest_internal_links(
                slug=request.slug,
                content=content,
                existing_links=existing_links
            )

            result.internal_links = [
                {
                    'anchor_text': s.anchor_text,
                    'target_url': s.target_url,
                    'target_title': s.target_title,
                    'context': s.context_sentence,
                    'relevance_score': s.relevance_score
                }
                for s in link_suggestions
            ]

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/seo/ai/apply")
async def apply_optimization(
    request: ApplyOptimizationRequest,
    supabase: Client = Depends(get_supabase)
):
    """Apply approved optimizations to a blog post file and update database."""
    try:
        # Read current file
        metadata, content = read_post_file(request.slug)
        changes_made = []
        db_updates = {}

        # Apply meta description
        if request.apply_meta and request.new_meta:
            metadata['description'] = request.new_meta
            changes_made.append('meta_description')
            db_updates['description'] = request.new_meta

        # Apply title
        if request.apply_title and request.new_title:
            metadata['title'] = request.new_title
            changes_made.append('title')
            db_updates['title'] = request.new_title

        # Apply content
        if request.apply_content and request.new_content:
            content = request.new_content
            changes_made.append('content')
            # Update word count in database
            import re
            words = re.findall(r'\b\w+\b', content)
            db_updates['word_count'] = len(words)

        # Apply internal links
        if request.apply_links:
            optimizer = get_optimizer()
            for link in request.apply_links:
                content = optimizer.apply_internal_link(
                    content=content,
                    anchor_text=link['anchor_text'],
                    target_url=link['target_url']
                )
            changes_made.append(f'internal_links ({len(request.apply_links)})')
            # Update internal links count in database
            db_updates['internal_links_out'] = len(request.apply_links)

        # Write updated file
        if changes_made:
            write_post_file(request.slug, metadata, content)

            # Update Supabase database with changes
            if db_updates:
                db_updates['last_analyzed_at'] = datetime.utcnow().isoformat()
                try:
                    seo_table(supabase, 'posts').update(db_updates).eq('slug', request.slug).execute()
                except Exception as db_err:
                    # Log but don't fail - file was written successfully
                    import logging
                    logging.warning(f"Failed to update database for {request.slug}: {db_err}")

        return {
            "status": "success",
            "slug": request.slug,
            "changes_applied": changes_made,
            "message": f"Applied {len(changes_made)} changes to {request.slug}",
            "database_updated": bool(db_updates)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/seo/ai/batch-optimize")
async def batch_optimize(
    request: BatchOptimizeRequest,
    supabase: Client = Depends(get_supabase)
):
    """Generate optimization suggestions for multiple posts."""
    results = []

    for slug in request.slugs:
        try:
            opt_request = OptimizeRequest(
                slug=slug,
                optimize_meta=request.optimize_meta,
                optimize_title=request.optimize_title,
                optimize_content=False,  # Never batch content optimization
                suggest_links=request.suggest_links
            )
            result = await optimize_post(opt_request, supabase)
            results.append({
                "slug": slug,
                "status": "success",
                "preview": result
            })
        except Exception as e:
            results.append({
                "slug": slug,
                "status": "error",
                "error": str(e)
            })

    return {
        "total": len(request.slugs),
        "successful": len([r for r in results if r['status'] == 'success']),
        "failed": len([r for r in results if r['status'] == 'error']),
        "results": results
    }


@app.get("/seo/ai/related/{slug}")
async def get_related_posts(
    slug: str,
    limit: int = Query(5, description="Number of related posts"),
    supabase: Client = Depends(get_supabase)
):
    """Get semantically related posts for a given slug."""
    try:
        optimizer = get_optimizer()

        # Check if index is built
        if not optimizer.post_index:
            raise HTTPException(
                status_code=400,
                detail="Content index not built. Call /seo/ai/build-index first."
            )

        related = optimizer.find_related_posts(slug, top_n=limit)

        return {
            "slug": slug,
            "related_posts": related
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# DEPLOYMENT ENDPOINTS
# ==========================================

HUGO_SITE_PATH = Path(os.environ.get('HUGO_SITE_PATH', '/hugo-site'))
HUGO_OUTPUT_PATH = Path(os.environ.get('HUGO_OUTPUT_PATH', '/output'))


class DeployResponse(BaseModel):
    status: str
    message: str
    build_time_seconds: Optional[float] = None
    output_path: Optional[str] = None
    error: Optional[str] = None


@app.post("/seo/deploy", response_model=DeployResponse)
async def deploy_changes():
    """
    Rebuild the Hugo site after content changes.
    This runs `hugo --minify` to regenerate the static site.
    """
    import subprocess
    import time

    # Check Hugo site path exists
    if not HUGO_SITE_PATH.exists():
        return DeployResponse(
            status="error",
            message="Hugo site directory not found",
            error=f"Path does not exist: {HUGO_SITE_PATH}"
        )

    # Check for config file
    config_file = HUGO_SITE_PATH / "hugo.toml"
    if not config_file.exists():
        config_file = HUGO_SITE_PATH / "config.toml"
    if not config_file.exists():
        return DeployResponse(
            status="error",
            message="Hugo configuration not found",
            error="Neither hugo.toml nor config.toml found in site directory"
        )

    # Ensure output directory exists
    HUGO_OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

    start_time = time.time()

    try:
        # Run Hugo build
        result = subprocess.run(
            [
                "hugo",
                "--minify",
                "--source", str(HUGO_SITE_PATH),
                "--destination", str(HUGO_OUTPUT_PATH),
                "--baseURL", "https://grandprixrealty.agency/"
            ],
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
            cwd=str(HUGO_SITE_PATH)
        )

        build_time = time.time() - start_time

        if result.returncode != 0:
            return DeployResponse(
                status="error",
                message="Hugo build failed",
                build_time_seconds=round(build_time, 2),
                error=result.stderr or result.stdout
            )

        # Parse build stats from output
        output_lines = result.stdout.strip().split('\n') if result.stdout else []
        build_summary = output_lines[-1] if output_lines else "Build completed"

        return DeployResponse(
            status="success",
            message=f"Site rebuilt successfully. {build_summary}",
            build_time_seconds=round(build_time, 2),
            output_path=str(HUGO_OUTPUT_PATH)
        )

    except subprocess.TimeoutExpired:
        return DeployResponse(
            status="error",
            message="Build timed out",
            error="Hugo build exceeded 2 minute timeout"
        )
    except FileNotFoundError:
        return DeployResponse(
            status="error",
            message="Hugo not installed",
            error="Hugo executable not found in container"
        )
    except Exception as e:
        return DeployResponse(
            status="error",
            message="Build failed with unexpected error",
            error=str(e)
        )


@app.get("/seo/deploy/status")
async def deploy_status():
    """Check the current deployment status and last build time."""
    import os

    # Check if output directory exists and has content
    if not HUGO_OUTPUT_PATH.exists():
        return {
            "status": "not_built",
            "message": "No build output found",
            "output_path": str(HUGO_OUTPUT_PATH)
        }

    # Check for index.html
    index_file = HUGO_OUTPUT_PATH / "index.html"
    if not index_file.exists():
        return {
            "status": "incomplete",
            "message": "Build output exists but index.html not found",
            "output_path": str(HUGO_OUTPUT_PATH)
        }

    # Get last modified time
    last_modified = datetime.fromtimestamp(os.path.getmtime(index_file))

    return {
        "status": "ready",
        "message": "Site is built and ready",
        "last_build": last_modified.isoformat(),
        "output_path": str(HUGO_OUTPUT_PATH)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
