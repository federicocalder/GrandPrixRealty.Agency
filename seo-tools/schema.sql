-- SEO Lab Database Schema for Grand Prix Realty
-- Run this in Supabase SQL Editor

-- Create SEO schema
CREATE SCHEMA IF NOT EXISTS seo;

-- ============================================
-- Posts Table - Main SEO metrics storage
-- ============================================
CREATE TABLE IF NOT EXISTS seo.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    seo_title TEXT,
    description TEXT,
    target_keyword TEXT,

    -- Content metrics
    word_count INTEGER DEFAULT 0,
    h1_count INTEGER DEFAULT 0,
    h2_count INTEGER DEFAULT 0,
    h3_count INTEGER DEFAULT 0,
    paragraph_count INTEGER DEFAULT 0,
    image_count INTEGER DEFAULT 0,
    images_with_alt INTEGER DEFAULT 0,

    -- Internal linking
    internal_links_out INTEGER DEFAULT 0,
    internal_links_in INTEGER DEFAULT 0,
    external_links INTEGER DEFAULT 0,

    -- SEO Scores (0-100)
    title_score INTEGER DEFAULT 0,
    description_score INTEGER DEFAULT 0,
    keyword_score INTEGER DEFAULT 0,
    content_score INTEGER DEFAULT 0,
    links_score INTEGER DEFAULT 0,
    readability_score INTEGER DEFAULT 0,
    overall_score INTEGER DEFAULT 0,

    -- Categorization
    section TEXT DEFAULT 'blog',
    categories TEXT[] DEFAULT '{}',
    featured_listing_type TEXT,

    -- Status
    is_draft BOOLEAN DEFAULT false,
    has_wordpress_images BOOLEAN DEFAULT false,

    -- Timestamps
    published_at TIMESTAMP,
    last_analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Internal Links Graph
-- ============================================
CREATE TABLE IF NOT EXISTS seo.internal_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_slug TEXT NOT NULL,
    target_url TEXT NOT NULL,
    target_slug TEXT,
    anchor_text TEXT,
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_source FOREIGN KEY (source_slug) REFERENCES seo.posts(slug) ON DELETE CASCADE
);

-- ============================================
-- SEO Issues Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS seo.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_slug TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    message TEXT NOT NULL,
    suggestion TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_post FOREIGN KEY (post_slug) REFERENCES seo.posts(slug) ON DELETE CASCADE
);

-- Issue types enum reference:
-- 'missing_description' - No meta description
-- 'short_description' - Description too short (<80 chars)
-- 'long_description' - Description too long (>160 chars)
-- 'missing_target_keyword' - No target keyword defined
-- 'keyword_not_in_title' - Target keyword not in title
-- 'keyword_not_in_description' - Target keyword not in description
-- 'short_content' - Content under 500 words
-- 'no_internal_links' - No internal links in content
-- 'few_internal_links' - Less than 3 internal links
-- 'orphan_page' - No inbound internal links
-- 'missing_alt_text' - Images without alt text
-- 'wordpress_images' - Still using WordPress image URLs
-- 'title_too_short' - Title under 30 chars
-- 'title_too_long' - Title over 60 chars
-- 'missing_h2' - No H2 headings
-- 'broken_internal_link' - Internal link to non-existent page

-- ============================================
-- Keyword Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS seo.keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT UNIQUE NOT NULL,
    search_volume INTEGER,
    difficulty INTEGER,
    posts_using INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Analysis History (for tracking progress)
-- ============================================
CREATE TABLE IF NOT EXISTS seo.analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    posts_analyzed INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    avg_score DECIMAL(5,2),
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    error_message TEXT
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_slug ON seo.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_score ON seo.posts(overall_score);
CREATE INDEX IF NOT EXISTS idx_posts_categories ON seo.posts USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_posts_section ON seo.posts(section);
CREATE INDEX IF NOT EXISTS idx_posts_draft ON seo.posts(is_draft);

CREATE INDEX IF NOT EXISTS idx_links_source ON seo.internal_links(source_slug);
CREATE INDEX IF NOT EXISTS idx_links_target ON seo.internal_links(target_slug);
CREATE INDEX IF NOT EXISTS idx_links_valid ON seo.internal_links(is_valid);

CREATE INDEX IF NOT EXISTS idx_issues_slug ON seo.issues(post_slug);
CREATE INDEX IF NOT EXISTS idx_issues_type ON seo.issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON seo.issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_unresolved ON seo.issues(post_slug) WHERE resolved = FALSE;

-- ============================================
-- Views for Dashboard
-- ============================================

-- Dashboard summary view
CREATE OR REPLACE VIEW seo.dashboard_summary AS
SELECT
    COUNT(*) as total_posts,
    COUNT(*) FILTER (WHERE is_draft = false) as published_posts,
    COUNT(*) FILTER (WHERE is_draft = true) as draft_posts,
    ROUND(AVG(overall_score)::numeric, 1) as avg_score,
    COUNT(*) FILTER (WHERE overall_score >= 80) as excellent_posts,
    COUNT(*) FILTER (WHERE overall_score >= 60 AND overall_score < 80) as good_posts,
    COUNT(*) FILTER (WHERE overall_score >= 40 AND overall_score < 60) as needs_work_posts,
    COUNT(*) FILTER (WHERE overall_score < 40) as poor_posts,
    SUM(word_count) as total_words,
    ROUND(AVG(word_count)::numeric, 0) as avg_word_count,
    SUM(internal_links_out) as total_internal_links,
    COUNT(*) FILTER (WHERE internal_links_in = 0 AND is_draft = false) as orphan_pages,
    (SELECT COUNT(*) FROM seo.issues WHERE resolved = false) as open_issues,
    (SELECT COUNT(*) FROM seo.issues WHERE resolved = false AND severity = 'critical') as critical_issues
FROM seo.posts;

-- Category breakdown view
CREATE OR REPLACE VIEW seo.category_stats AS
SELECT
    unnest(categories) as category,
    COUNT(*) as post_count,
    ROUND(AVG(overall_score)::numeric, 1) as avg_score,
    ROUND(AVG(word_count)::numeric, 0) as avg_word_count
FROM seo.posts
WHERE is_draft = false
GROUP BY unnest(categories)
ORDER BY post_count DESC;

-- Posts needing attention view
CREATE OR REPLACE VIEW seo.posts_needing_attention AS
SELECT
    p.slug,
    p.title,
    p.overall_score,
    p.url,
    p.categories,
    COUNT(i.id) as issue_count,
    COUNT(i.id) FILTER (WHERE i.severity = 'critical') as critical_count,
    ARRAY_AGG(DISTINCT i.issue_type) as issue_types
FROM seo.posts p
LEFT JOIN seo.issues i ON p.slug = i.post_slug AND i.resolved = false
WHERE p.is_draft = false AND (p.overall_score < 60 OR EXISTS (
    SELECT 1 FROM seo.issues WHERE post_slug = p.slug AND resolved = false
))
GROUP BY p.id
ORDER BY critical_count DESC, p.overall_score ASC
LIMIT 50;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE seo.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo.analysis_runs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (broker/admin)
-- Read access
CREATE POLICY "Allow authenticated read on posts" ON seo.posts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on links" ON seo.internal_links
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on issues" ON seo.issues
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on keywords" ON seo.keywords
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on runs" ON seo.analysis_runs
    FOR SELECT TO authenticated USING (true);

-- Service role can do everything (for analyzer script)
CREATE POLICY "Service role full access on posts" ON seo.posts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on links" ON seo.internal_links
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on issues" ON seo.issues
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on keywords" ON seo.keywords
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on runs" ON seo.analysis_runs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Functions
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION seo.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts
DROP TRIGGER IF EXISTS posts_updated_at ON seo.posts;
CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON seo.posts
    FOR EACH ROW
    EXECUTE FUNCTION seo.update_updated_at();

-- Function to recalculate inbound links
CREATE OR REPLACE FUNCTION seo.recalculate_inbound_links()
RETURNS void AS $$
BEGIN
    UPDATE seo.posts p
    SET internal_links_in = (
        SELECT COUNT(*)
        FROM seo.internal_links l
        WHERE l.target_slug = p.slug AND l.is_valid = true
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA seo TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA seo TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA seo TO authenticated;

-- Service role gets full access
GRANT ALL ON SCHEMA seo TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA seo TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA seo TO service_role;
