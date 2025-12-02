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
