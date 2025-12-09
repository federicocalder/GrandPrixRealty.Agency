import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, Check, X, ChevronDown, ChevronUp, ExternalLink, Link as LinkIcon, FileText, Type, AlignLeft } from 'lucide-react'
import { api, aiApi, OptimizationPreview, PostSummary } from '../lib/api'

export default function AIFixer() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [indexBuilding, setIndexBuilding] = useState(false)
  const [indexBuilt, setIndexBuilt] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Optimization options
  const [optimizeMeta, setOptimizeMeta] = useState(true)
  const [optimizeTitle, setOptimizeTitle] = useState(true)
  const [optimizeContent, setOptimizeContent] = useState(false)
  const [suggestLinks, setSuggestLinks] = useState(true)

  // Results
  const [previews, setPreviews] = useState<Record<string, OptimizationPreview>>({})
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState<string | null>(null)

  // Selection state for approvals
  const [approvals, setApprovals] = useState<Record<string, {
    meta: boolean
    title: boolean
    content: boolean
    links: string[] // array of anchor texts to apply
  }>>({})

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const data = await api.getPosts({ sort_by: 'overall_score', sort_order: 'asc', limit: 200 })
      setPosts(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const buildIndex = async () => {
    try {
      setIndexBuilding(true)
      setError('')
      const result = await aiApi.buildIndex()
      setIndexBuilt(true)
      setSuccessMessage(`Index built with ${result.indexed_posts} posts`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to build index')
    } finally {
      setIndexBuilding(false)
    }
  }

  const optimizeSelected = async () => {
    if (selectedPosts.length === 0) {
      setError('Please select at least one post')
      return
    }

    try {
      setOptimizing(true)
      setError('')
      setPreviews({})

      if (selectedPosts.length === 1) {
        // Single post optimization
        const result = await aiApi.optimize({
          slug: selectedPosts[0],
          optimize_meta: optimizeMeta,
          optimize_title: optimizeTitle,
          optimize_content: optimizeContent,
          suggest_links: suggestLinks
        })
        setPreviews({ [selectedPosts[0]]: result })
        setExpandedPosts(new Set([selectedPosts[0]]))
        initApprovals(selectedPosts[0], result)
      } else {
        // Batch optimization
        const result = await aiApi.batchOptimize({
          slugs: selectedPosts,
          optimize_meta: optimizeMeta,
          optimize_title: optimizeTitle,
          suggest_links: suggestLinks
        })

        const newPreviews: Record<string, OptimizationPreview> = {}
        result.results.forEach(r => {
          if (r.status === 'success' && r.preview) {
            newPreviews[r.slug] = r.preview
            initApprovals(r.slug, r.preview)
          }
        })
        setPreviews(newPreviews)
        setExpandedPosts(new Set(Object.keys(newPreviews).slice(0, 3)))
      }
    } catch (err: any) {
      setError(err.message || 'Optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  const initApprovals = (slug: string, preview: OptimizationPreview) => {
    setApprovals(prev => ({
      ...prev,
      [slug]: {
        meta: !!preview.suggested_meta,
        title: !!preview.suggested_title && preview.suggested_title !== preview.original_title,
        content: false, // Content requires explicit approval
        links: preview.internal_links.map(l => l.anchor_text)
      }
    }))
  }

  const togglePostExpanded = (slug: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  const togglePostSelected = (slug: string) => {
    setSelectedPosts(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    )
  }

  const selectAll = () => {
    setSelectedPosts(posts.map(p => p.slug))
  }

  const selectNone = () => {
    setSelectedPosts([])
  }

  const selectLowScore = () => {
    setSelectedPosts(posts.filter(p => p.overall_score < 60).map(p => p.slug))
  }

  const applyOptimizations = async (slug: string) => {
    const preview = previews[slug]
    const approval = approvals[slug]
    if (!preview || !approval) return

    try {
      setApplying(slug)
      setError('')

      await aiApi.apply({
        slug,
        apply_meta: approval.meta,
        new_meta: approval.meta ? preview.suggested_meta || undefined : undefined,
        apply_title: approval.title,
        new_title: approval.title ? preview.suggested_title || undefined : undefined,
        apply_content: approval.content,
        new_content: approval.content ? preview.suggested_content || undefined : undefined,
        apply_links: approval.links.map(anchor => {
          const link = preview.internal_links.find(l => l.anchor_text === anchor)
          return link ? { anchor_text: link.anchor_text, target_url: link.target_url } : null
        }).filter(Boolean) as Array<{ anchor_text: string; target_url: string }>
      })

      setSuccessMessage(`Applied changes to ${slug}`)
      setTimeout(() => setSuccessMessage(''), 3000)

      // Remove from previews
      setPreviews(prev => {
        const next = { ...prev }
        delete next[slug]
        return next
      })
    } catch (err: any) {
      setError(err.message || 'Failed to apply changes')
    } finally {
      setApplying(null)
    }
  }

  const toggleApproval = (slug: string, field: 'meta' | 'title' | 'content') => {
    setApprovals(prev => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        [field]: !prev[slug]?.[field]
      }
    }))
  }

  const toggleLinkApproval = (slug: string, anchor: string) => {
    setApprovals(prev => {
      const current = prev[slug]?.links || []
      const next = current.includes(anchor)
        ? current.filter(a => a !== anchor)
        : [...current, anchor]
      return {
        ...prev,
        [slug]: {
          ...prev[slug],
          links: next
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Sparkles className="text-grand-gold" size={24} />
            AI Content Optimizer
          </h1>
          <p className="text-grand-silver mt-1">Humanize & optimize your blog posts with Claude AI</p>
        </div>
        <button
          onClick={buildIndex}
          disabled={indexBuilding}
          className="px-4 py-2 bg-grand-steel/50 text-white rounded-lg hover:bg-grand-steel transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={16} className={indexBuilding ? 'animate-spin' : ''} />
          {indexBuilding ? 'Building...' : indexBuilt ? 'Rebuild Index' : 'Build Link Index'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400">
          {successMessage}
        </div>
      )}

      {/* Options */}
      <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
        <h2 className="font-display font-semibold text-lg text-white mb-4">Optimization Options</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={optimizeMeta}
              onChange={(e) => setOptimizeMeta(e.target.checked)}
              className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
            />
            <span className="text-white flex items-center gap-1">
              <FileText size={16} />
              Meta Description
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={optimizeTitle}
              onChange={(e) => setOptimizeTitle(e.target.checked)}
              className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
            />
            <span className="text-white flex items-center gap-1">
              <Type size={16} />
              Title
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={optimizeContent}
              onChange={(e) => setOptimizeContent(e.target.checked)}
              className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
            />
            <span className="text-white flex items-center gap-1">
              <AlignLeft size={16} />
              Content (Sonnet)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={suggestLinks}
              onChange={(e) => setSuggestLinks(e.target.checked)}
              className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
            />
            <span className="text-white flex items-center gap-1">
              <LinkIcon size={16} />
              Internal Links
            </span>
          </label>
        </div>
      </div>

      {/* Post Selection */}
      <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">
            Select Posts ({selectedPosts.length} selected)
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-sm text-grand-gold hover:underline">All</button>
            <span className="text-grand-silver">|</span>
            <button onClick={selectNone} className="text-sm text-grand-gold hover:underline">None</button>
            <span className="text-grand-silver">|</span>
            <button onClick={selectLowScore} className="text-sm text-grand-gold hover:underline">Score &lt; 60</button>
          </div>
        </div>

        {/* Optimize Button - Above post list */}
        <div className="mb-4 pb-4 border-b border-grand-steel/30">
          <button
            onClick={optimizeSelected}
            disabled={optimizing || selectedPosts.length === 0}
            className="w-full py-3 bg-grand-gold text-white font-semibold rounded-lg hover:bg-grand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            {optimizing ? 'Optimizing...' : `Optimize ${selectedPosts.length} Post${selectedPosts.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-grand-silver"></div>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {posts.map(post => (
              <label
                key={post.slug}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-grand-steel/30 ${
                  selectedPosts.includes(post.slug) ? 'bg-grand-steel/20' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPosts.includes(post.slug)}
                  onChange={() => togglePostSelected(post.slug)}
                  className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
                />
                <span className={`text-xs px-2 py-0.5 rounded ${
                  post.overall_score >= 80 ? 'bg-green-500/20 text-green-400' :
                  post.overall_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {post.overall_score}
                </span>
                <span className="text-white truncate flex-1">{post.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {Object.keys(previews).length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-xl text-white">
            Optimization Results ({Object.keys(previews).length})
          </h2>

          {Object.entries(previews).map(([slug, preview]) => (
            <div key={slug} className="bg-grand-charcoal rounded-xl border border-grand-steel/30 overflow-hidden">
              {/* Header */}
              <button
                onClick={() => togglePostExpanded(slug)}
                className="w-full p-4 flex items-center justify-between hover:bg-grand-steel/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{preview.title}</span>
                  <a
                    href={`https://grandprixrealty.agency/blog/${slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-grand-gold hover:text-grand-gold/80"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                {expandedPosts.has(slug) ? <ChevronUp size={20} className="text-grand-silver" /> : <ChevronDown size={20} className="text-grand-silver" />}
              </button>

              {/* Expanded Content */}
              {expandedPosts.has(slug) && (
                <div className="p-4 pt-0 space-y-4">
                  {/* Meta Description */}
                  {preview.suggested_meta && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-grand-silver flex items-center gap-2">
                          <FileText size={14} />
                          Meta Description
                          <span className="text-xs text-grand-silver/60">
                            ({preview.suggested_meta.length} chars)
                          </span>
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={approvals[slug]?.meta || false}
                            onChange={() => toggleApproval(slug, 'meta')}
                            className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
                          />
                          <span className="text-sm text-grand-silver">Apply</span>
                        </label>
                      </div>
                      {preview.original_meta && (
                        <div className="text-sm text-red-400/70 line-through bg-red-500/5 p-2 rounded">
                          {preview.original_meta}
                        </div>
                      )}
                      <div className="text-sm text-green-400 bg-green-500/10 p-2 rounded">
                        {preview.suggested_meta}
                      </div>
                      {preview.meta_explanation && (
                        <p className="text-xs text-grand-silver/60">{preview.meta_explanation}</p>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  {preview.suggested_title && preview.suggested_title !== preview.original_title && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-grand-silver flex items-center gap-2">
                          <Type size={14} />
                          Title
                          <span className="text-xs text-grand-silver/60">
                            ({preview.suggested_title.length} chars)
                          </span>
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={approvals[slug]?.title || false}
                            onChange={() => toggleApproval(slug, 'title')}
                            className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
                          />
                          <span className="text-sm text-grand-silver">Apply</span>
                        </label>
                      </div>
                      <div className="text-sm text-red-400/70 line-through bg-red-500/5 p-2 rounded">
                        {preview.original_title}
                      </div>
                      <div className="text-sm text-green-400 bg-green-500/10 p-2 rounded">
                        {preview.suggested_title}
                      </div>
                      {preview.title_explanation && (
                        <p className="text-xs text-grand-silver/60">{preview.title_explanation}</p>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  {preview.suggested_content && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-grand-silver flex items-center gap-2">
                          <AlignLeft size={14} />
                          Content Optimization
                          <span className="text-xs text-grand-silver/60">
                            (uses Sonnet - review carefully)
                          </span>
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={approvals[slug]?.content || false}
                            onChange={() => toggleApproval(slug, 'content')}
                            className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
                          />
                          <span className="text-sm text-grand-silver">Apply</span>
                        </label>
                      </div>
                      <div className="bg-grand-dark/50 p-3 rounded-lg">
                        <p className="text-xs text-grand-silver/60 mb-2">
                          Content has been humanized and optimized. Click "Show Preview" to review the changes.
                        </p>
                        <details className="group">
                          <summary className="text-sm text-grand-gold cursor-pointer hover:underline">
                            Show Preview
                          </summary>
                          <div className="mt-3 space-y-3 border-t border-grand-steel/30 pt-3">
                            <div>
                              <p className="text-xs text-grand-silver/60 mb-1">Original:</p>
                              <div className="text-sm text-red-400/70 bg-red-500/5 p-3 rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {preview.original_content?.substring(0, 1000) || 'Not available'}
                                {preview.original_content && preview.original_content.length > 1000 && '...'}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-grand-silver/60 mb-1">Optimized:</p>
                              <div className="text-sm text-green-400 bg-green-500/10 p-3 rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {preview.suggested_content?.substring(0, 1000) || 'Not available'}
                                {preview.suggested_content && preview.suggested_content.length > 1000 && '...'}
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                      {preview.content_explanation && (
                        <p className="text-xs text-grand-silver/60">{preview.content_explanation}</p>
                      )}
                    </div>
                  )}

                  {/* Internal Links */}
                  {preview.internal_links.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-grand-silver flex items-center gap-2">
                        <LinkIcon size={14} />
                        Suggested Internal Links ({preview.internal_links.length})
                      </h3>
                      <div className="space-y-2">
                        {preview.internal_links.map((link, idx) => (
                          <div key={idx} className="bg-grand-dark/50 p-3 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-grand-gold font-medium">"{link.anchor_text}"</span>
                                  <span className="text-grand-silver">→</span>
                                  <Link
                                    to={`/posts/${link.target_url.replace('/blog/', '').replace('/', '')}`}
                                    className="text-white hover:text-grand-silver"
                                  >
                                    {link.target_title}
                                  </Link>
                                </div>
                                {link.context && (
                                  <p className="text-xs text-grand-silver/60 mt-1 italic">"{link.context}"</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-grand-silver/40">
                                    Relevance: {Math.round(link.relevance_score * 100)}%
                                  </span>
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={approvals[slug]?.links.includes(link.anchor_text) || false}
                                  onChange={() => toggleLinkApproval(slug, link.anchor_text)}
                                  className="w-4 h-4 rounded border-grand-steel bg-grand-dark text-grand-gold focus:ring-grand-gold"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply Button */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-grand-steel/30">
                    <button
                      onClick={() => {
                        setPreviews(prev => {
                          const next = { ...prev }
                          delete next[slug]
                          return next
                        })
                      }}
                      className="px-4 py-2 text-grand-silver hover:text-white transition-colors flex items-center gap-2"
                    >
                      <X size={16} />
                      Dismiss
                    </button>
                    <button
                      onClick={() => applyOptimizations(slug)}
                      disabled={applying === slug}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Check size={16} />
                      {applying === slug ? 'Applying...' : 'Apply Selected Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
