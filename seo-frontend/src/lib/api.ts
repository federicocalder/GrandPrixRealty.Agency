/**
 * SEO Lab API Client
 */

const API_BASE = import.meta.env.VITE_SEO_API_URL || '/seo-api'

export interface DashboardSummary {
  total_posts: number
  published_posts: number
  draft_posts: number
  avg_score: number
  excellent_posts: number
  good_posts: number
  needs_work_posts: number
  poor_posts: number
  total_words: number
  avg_word_count: number
  total_internal_links: number
  orphan_pages: number
  open_issues: number
  critical_issues: number
}

export interface PostSummary {
  id: string
  slug: string
  url: string
  title: string
  description: string | null
  categories: string[]
  word_count: number
  internal_links_out: number
  internal_links_in: number
  overall_score: number
  is_draft: boolean
  has_wordpress_images: boolean
  published_at: string | null
  last_analyzed_at: string | null
}

export interface Issue {
  id: string
  post_slug: string
  issue_type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestion: string | null
  resolved: boolean
  created_at: string
}

export interface PostDetail extends PostSummary {
  seo_title: string | null
  target_keyword: string | null
  h1_count: number
  h2_count: number
  h3_count: number
  paragraph_count: number
  image_count: number
  images_with_alt: number
  external_links: number
  title_score: number
  description_score: number
  keyword_score: number
  content_score: number
  links_score: number
  readability_score: number
  featured_listing_type: string | null
  issues: Issue[]
  outbound_links: Array<{
    target_url: string
    target_slug: string | null
    anchor_text: string
  }>
  inbound_links: Array<{
    source_slug: string
    anchor_text: string
  }>
}

export interface CategoryStats {
  category: string
  post_count: number
  avg_score: number
  avg_word_count: number
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Dashboard
  getDashboard: () => fetchAPI<DashboardSummary>('/seo/dashboard'),

  // Categories
  getCategories: () => fetchAPI<CategoryStats[]>('/seo/categories'),

  // Posts
  getPosts: (params?: {
    category?: string
    min_score?: number
    max_score?: number
    is_draft?: boolean
    sort_by?: string
    sort_order?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PostSummary[]>(`/seo/posts${query ? `?${query}` : ''}`)
  },

  getPost: (slug: string) => fetchAPI<PostDetail>(`/seo/posts/${slug}`),

  // Issues
  getIssues: (params?: {
    severity?: string
    issue_type?: string
    resolved?: boolean
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<Issue[]>(`/seo/issues${query ? `?${query}` : ''}`)
  },

  getIssueTypes: () => fetchAPI<Array<{ issue_type: string; count: number; severity: string }>>('/seo/issues/types'),

  resolveIssue: (issueId: string) => fetchAPI<{ status: string }>(`/seo/issues/${issueId}/resolve`, { method: 'POST' }),

  // Links graph
  getLinksGraph: () => fetchAPI<{
    nodes: Array<{ slug: string; title: string; overall_score: number; internal_links_in: number; internal_links_out: number }>
    edges: Array<{ source_slug: string; target_slug: string; target_url: string; anchor_text: string }>
  }>('/seo/links'),

  // Posts needing attention
  getAttention: (limit?: number) => fetchAPI<Array<PostSummary & { critical_issues: number }>>(`/seo/attention${limit ? `?limit=${limit}` : ''}`),

  // Trigger analysis
  triggerAnalysis: () => fetchAPI<{ status: string; run_id: string; message: string }>('/seo/analyze', { method: 'POST' }),
}

// Helper to get score color class
export function getScoreClass(score: number): string {
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  if (score >= 40) return 'score-needs-work'
  return 'score-poor'
}

export function getScoreBgClass(score: number): string {
  if (score >= 80) return 'bg-score-excellent'
  if (score >= 60) return 'bg-score-good'
  if (score >= 40) return 'bg-score-needs-work'
  return 'bg-score-poor'
}

export function getSeverityClass(severity: string): string {
  return `severity-${severity}`
}

// AI Optimization Types
export interface OptimizationPreview {
  slug: string
  title: string
  original_meta: string | null
  suggested_meta: string | null
  meta_explanation: string | null
  original_title: string
  suggested_title: string | null
  title_explanation: string | null
  original_content: string | null
  suggested_content: string | null
  content_explanation: string | null
  internal_links: Array<{
    anchor_text: string
    target_url: string
    target_title: string
    context: string
    relevance_score: number
  }>
  confidence_scores: Record<string, number>
  // Keyword and category fields
  original_keyword: string | null
  suggested_keyword: string | null
  keyword_explanation: string | null
  original_categories: string[]
  suggested_category: string | null
  category_explanation: string | null
  // NEW: Unified SEO alignment indicators
  keyword_in_title: boolean
  keyword_in_description: boolean
  unified_seo_used: boolean
  // NEW: Content expansion info
  original_word_count: number
  expanded_word_count: number
  sections_added: string[]
}

export interface ApplyOptimizationRequest {
  slug: string
  apply_meta?: boolean
  new_meta?: string
  apply_title?: boolean
  new_title?: string
  apply_content?: boolean
  new_content?: string
  apply_links?: Array<{ anchor_text: string; target_url: string }>
  // New fields for keyword and category
  apply_keyword?: boolean
  new_keyword?: string
  apply_category?: boolean
  new_category?: string
}

// AI Optimization API
export const aiApi = {
  // Build content index for internal linking
  buildIndex: () => fetchAPI<{ status: string; indexed_posts: number }>('/seo/ai/build-index', { method: 'POST' }),

  // Optimize single post
  optimize: (params: {
    slug: string
    optimize_meta?: boolean
    optimize_title?: boolean
    optimize_content?: boolean
    suggest_links?: boolean
    suggest_keyword?: boolean
    suggest_category?: boolean
    use_unified_seo?: boolean  // NEW: Use coordinated keyword+title+description
    expand_content?: boolean   // NEW: Iteratively expand to 800+ words
  }) => fetchAPI<OptimizationPreview>('/seo/ai/optimize', {
    method: 'POST',
    body: JSON.stringify(params)
  }),

  // Apply optimizations
  apply: (request: ApplyOptimizationRequest) => fetchAPI<{
    status: string
    slug: string
    changes_applied: string[]
    message: string
  }>('/seo/ai/apply', {
    method: 'POST',
    body: JSON.stringify(request)
  }),

  // Batch optimize multiple posts
  batchOptimize: (params: {
    slugs: string[]
    optimize_meta?: boolean
    optimize_title?: boolean
    suggest_links?: boolean
  }) => fetchAPI<{
    total: number
    successful: number
    failed: number
    results: Array<{
      slug: string
      status: string
      preview?: OptimizationPreview
      error?: string
    }>
  }>('/seo/ai/batch-optimize', {
    method: 'POST',
    body: JSON.stringify(params)
  }),

  // Get related posts
  getRelated: (slug: string, limit?: number) => fetchAPI<{
    slug: string
    related_posts: Array<{
      slug: string
      title: string
      url: string
      similarity: number
    }>
  }>(`/seo/ai/related/${slug}${limit ? `?limit=${limit}` : ''}`),

  // Reanalyze single post (recalculate scores)
  reanalyze: (slug: string) => fetchAPI<{
    status: string
    slug: string
    message: string
    overall_score: number | null
    details?: string
  }>(`/seo/analyze/${slug}`, { method: 'POST' }),

  // Deploy changes (rebuild Hugo site)
  deploy: () => fetchAPI<DeployResponse>('/seo/deploy', { method: 'POST' }),

  // Get deploy status
  getDeployStatus: () => fetchAPI<{
    status: string
    message: string
    last_build?: string
    output_path?: string
  }>('/seo/deploy/status')
}

// Deploy response type
export interface DeployResponse {
  status: 'success' | 'error'
  message: string
  build_time_seconds?: number
  output_path?: string
  error?: string
  cache_purged?: boolean
}
