import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, aiApi, PostDetail as PostDetailType, OptimizationPreview, getScoreClass, getScoreBgClass, getSeverityClass } from '../lib/api'

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<PostDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Optimizer state
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [preview, setPreview] = useState<OptimizationPreview | null>(null)
  const [applying, setApplying] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [optimizerMessage, setOptimizerMessage] = useState('')

  // Checkboxes for applying changes
  const [applyTitle, setApplyTitle] = useState(false)
  const [applyMeta, setApplyMeta] = useState(false)
  const [applyKeyword, setApplyKeyword] = useState(false)
  const [applyCategory, setApplyCategory] = useState(false)
  const [applyContent, setApplyContent] = useState(false)
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set())

  // Content optimization toggles
  const [includeContent, setIncludeContent] = useState(false)
  const [expandContent, setExpandContent] = useState(false)

  useEffect(() => {
    if (slug) loadPost()
  }, [slug])

  const loadPost = async () => {
    if (!slug) return
    try {
      setLoading(true)
      const data = await api.getPost(slug)
      setPost(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const copyForClaude = () => {
    if (!post) return

    const prompt = `Fix SEO issues for blog post "${post.title}":

Current scores:
- Title: ${post.title_score}/100
- Description: ${post.description_score}/100
- Keyword: ${post.keyword_score}/100
- Content: ${post.content_score}/100
- Links: ${post.links_score}/100
- Overall: ${post.overall_score}/100

Issues to fix:
${post.issues.map(i => `- [${i.severity.toUpperCase()}] ${i.message}\n  Suggestion: ${i.suggestion || 'N/A'}`).join('\n')}

File: /grandprixrealty.agency/content/blog/${post.slug}.md

Please fix these SEO issues.`

    navigator.clipboard.writeText(prompt)
    alert('Copied to clipboard!')
  }

  // Run AI optimization
  const runOptimize = async () => {
    if (!slug) return
    setOptimizing(true)
    setOptimizerMessage('')
    setPreview(null)

    // Reset checkboxes
    setApplyTitle(false)
    setApplyMeta(false)
    setApplyKeyword(false)
    setApplyCategory(false)
    setApplyContent(false)
    setSelectedLinks(new Set())

    try {
      const result = await aiApi.optimize({
        slug,
        optimize_meta: true,
        optimize_title: true,
        optimize_content: includeContent,
        suggest_links: true,
        suggest_keyword: true,
        suggest_category: true,
        use_unified_seo: true,  // Always use unified SEO for better keyword alignment
        expand_content: expandContent
      })
      setPreview(result)
      // Show alignment status in message
      if (result.unified_seo_used) {
        const alignStatus = result.keyword_in_title && result.keyword_in_description
          ? 'Keyword aligned in title & description'
          : result.keyword_in_title
          ? 'Keyword in title (missing from description)'
          : result.keyword_in_description
          ? 'Keyword in description (missing from title)'
          : 'Keyword alignment needs review'
        setOptimizerMessage(`AI optimization complete! ${alignStatus}`)
      } else {
        setOptimizerMessage('AI optimization complete! Review suggestions below.')
      }
    } catch (err: any) {
      setOptimizerMessage(`Error: ${err.message || 'Failed to optimize'}`)
    } finally {
      setOptimizing(false)
    }
  }

  // Apply selected changes
  const applyChanges = async () => {
    if (!slug || !preview) return

    const hasChanges = applyTitle || applyMeta || applyKeyword || applyCategory || applyContent || selectedLinks.size > 0
    if (!hasChanges) {
      setOptimizerMessage('Please select at least one change to apply')
      return
    }

    setApplying(true)
    setOptimizerMessage('')

    try {
      const linksToApply = preview.internal_links
        .filter((_, i) => selectedLinks.has(i))
        .map(l => ({ anchor_text: l.anchor_text, target_url: l.target_url }))

      const result = await aiApi.apply({
        slug,
        apply_title: applyTitle,
        new_title: applyTitle ? preview.suggested_title || undefined : undefined,
        apply_meta: applyMeta,
        new_meta: applyMeta ? preview.suggested_meta || undefined : undefined,
        apply_keyword: applyKeyword,
        new_keyword: applyKeyword ? preview.suggested_keyword || undefined : undefined,
        apply_category: applyCategory,
        new_category: applyCategory ? preview.suggested_category || undefined : undefined,
        apply_content: applyContent,
        new_content: applyContent ? preview.suggested_content || undefined : undefined,
        apply_links: linksToApply.length > 0 ? linksToApply : undefined
      })

      setOptimizerMessage(`Applied: ${result.changes_applied.join(', ')}`)
      // Reload post data to show updated values
      await loadPost()
      // Clear the preview since changes were applied
      setPreview(null)
    } catch (err: any) {
      setOptimizerMessage(`Error applying: ${err.message || 'Failed'}`)
    } finally {
      setApplying(false)
    }
  }

  // Reanalyze post to refresh scores
  const reanalyzePost = async () => {
    if (!slug) return
    setReanalyzing(true)
    setOptimizerMessage('')

    try {
      const result = await aiApi.reanalyze(slug)
      setOptimizerMessage(`Reanalyzed! New score: ${result.overall_score || 'N/A'}`)
      // Reload post data to show updated scores
      await loadPost()
    } catch (err: any) {
      setOptimizerMessage(`Error reanalyzing: ${err.message || 'Failed'}`)
    } finally {
      setReanalyzing(false)
    }
  }

  // Deploy changes to live site
  const deployChanges = async () => {
    setDeploying(true)
    setOptimizerMessage('')

    try {
      const result = await aiApi.deploy()
      if (result.status === 'success') {
        setOptimizerMessage(`Deployed in ${result.build_time_seconds}s! ${result.cache_purged ? 'Cache purged.' : ''}`)
      } else {
        setOptimizerMessage(`Deploy error: ${result.error || result.message}`)
      }
    } catch (err: any) {
      setOptimizerMessage(`Deploy error: ${err.message || 'Failed'}`)
    } finally {
      setDeploying(false)
    }
  }

  // Toggle link selection
  const toggleLink = (index: number) => {
    const newSelected = new Set(selectedLinks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedLinks(newSelected)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grand-silver"></div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Post not found'}</p>
        <Link to="/posts" className="mt-4 inline-block px-4 py-2 bg-grand-steel rounded-lg text-white">
          Back to Posts
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/posts" className="text-grand-silver hover:text-white">
              &larr; Posts
            </Link>
          </div>
          <h1 className="font-display font-bold text-2xl text-white truncate">{post.title}</h1>
          <a
            href={`https://grandprixrealty.agency${post.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-grand-silver hover:text-white text-sm"
          >
            {post.url} &rarr;
          </a>
        </div>

        <div className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 ${getScoreBgClass(post.overall_score)}`}>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreClass(post.overall_score)}`}>
              {post.overall_score}
            </div>
            <div className="text-xs text-grand-silver">/100</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowOptimizer(!showOptimizer)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showOptimizer
              ? 'bg-blue-600 text-white'
              : 'bg-grand-steel text-white hover:bg-grand-charcoal'
          }`}
        >
          {showOptimizer ? 'Hide Optimizer' : 'AI Optimizer'}
        </button>
        <button
          onClick={copyForClaude}
          className="px-4 py-2 bg-grand-steel text-white rounded-lg hover:bg-grand-charcoal transition-colors"
        >
          Copy for Claude
        </button>
        <a
          href={`https://grandprixrealty.agency${post.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-grand-steel text-white rounded-lg hover:bg-grand-charcoal transition-colors"
        >
          View Live
        </a>
      </div>

      {/* AI Optimizer Panel */}
      {showOptimizer && (
        <div className="bg-grand-charcoal rounded-xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-white">AI Optimizer</h2>
            <div className="flex gap-2">
              <button
                onClick={reanalyzePost}
                disabled={reanalyzing}
                className="px-3 py-1.5 bg-grand-steel text-white text-sm rounded-lg hover:bg-grand-charcoal disabled:opacity-50"
              >
                {reanalyzing ? 'Analyzing...' : 'Re-score'}
              </button>
              <button
                onClick={deployChanges}
                disabled={deploying}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {deploying ? 'Deploying...' : 'Deploy'}
              </button>
            </div>
          </div>

          {/* Optimizer Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-grand-silver text-sm">
              <input
                type="checkbox"
                checked={expandContent}
                onChange={(e) => setExpandContent(e.target.checked)}
                className="rounded"
              />
              Expand content (add FAQ, Key Takeaways)
            </label>
            <label className="flex items-center gap-2 text-grand-silver text-sm">
              <input
                type="checkbox"
                checked={includeContent}
                onChange={(e) => setIncludeContent(e.target.checked)}
                className="rounded"
              />
              Humanize content (slower)
            </label>
            <button
              onClick={runOptimize}
              disabled={optimizing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {optimizing ? 'Optimizing...' : 'Run AI Optimize'}
            </button>
          </div>

          {/* Status Message */}
          {optimizerMessage && (
            <div className={`p-3 rounded-lg mb-4 ${
              optimizerMessage.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {optimizerMessage}
            </div>
          )}

          {/* Optimization Preview */}
          {preview && (
            <div className="space-y-4">
              {/* Unified SEO Alignment Indicators */}
              {preview.unified_seo_used && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">Unified SEO Optimization</span>
                    <span className="text-xs text-grand-silver">
                      Confidence: {Math.round((preview.confidence_scores?.unified || 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className={preview.keyword_in_title ? 'text-green-400' : 'text-red-400'}>
                      {preview.keyword_in_title ? '✓' : '✗'} Keyword in Title
                    </span>
                    <span className={preview.keyword_in_description ? 'text-green-400' : 'text-red-400'}>
                      {preview.keyword_in_description ? '✓' : '✗'} Keyword in Description
                    </span>
                    {preview.original_word_count > 0 && (
                      <span className="text-grand-silver">
                        Words: {preview.original_word_count}
                        {preview.expanded_word_count > preview.original_word_count && (
                          <span className="text-green-400"> → {preview.expanded_word_count}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {preview.sections_added && preview.sections_added.length > 0 && (
                    <div className="mt-2 text-sm text-green-400">
                      Sections added: {preview.sections_added.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Title Suggestion */}
              {preview.suggested_title && preview.suggested_title !== preview.original_title && (
                <SuggestionCard
                  label="Title"
                  original={preview.original_title}
                  suggested={preview.suggested_title}
                  explanation={preview.title_explanation}
                  confidence={preview.confidence_scores?.title}
                  checked={applyTitle}
                  onChange={setApplyTitle}
                />
              )}

              {/* Meta Description Suggestion */}
              {preview.suggested_meta && preview.suggested_meta !== preview.original_meta && (
                <SuggestionCard
                  label="Meta Description"
                  original={preview.original_meta || '(none)'}
                  suggested={preview.suggested_meta}
                  explanation={preview.meta_explanation}
                  confidence={preview.confidence_scores?.meta}
                  checked={applyMeta}
                  onChange={setApplyMeta}
                />
              )}

              {/* Keyword Suggestion */}
              {preview.suggested_keyword && preview.suggested_keyword !== preview.original_keyword && (
                <SuggestionCard
                  label="Target Keyword"
                  original={preview.original_keyword || '(none)'}
                  suggested={preview.suggested_keyword}
                  explanation={preview.keyword_explanation}
                  confidence={preview.confidence_scores?.keyword}
                  checked={applyKeyword}
                  onChange={setApplyKeyword}
                />
              )}

              {/* Category Suggestion */}
              {preview.suggested_category && (
                <SuggestionCard
                  label="Category"
                  original={preview.original_categories?.join(', ') || '(none)'}
                  suggested={preview.suggested_category}
                  explanation={preview.category_explanation}
                  confidence={preview.confidence_scores?.category}
                  checked={applyCategory}
                  onChange={setApplyCategory}
                />
              )}

              {/* Content Suggestion */}
              {preview.suggested_content && (
                <div className="p-4 rounded-lg bg-grand-steel/30 border border-grand-steel/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={applyContent}
                        onChange={(e) => setApplyContent(e.target.checked)}
                        className="rounded"
                      />
                      <span className="font-semibold text-white">Content Optimization</span>
                    </label>
                    {preview.confidence_scores?.content && (
                      <span className="text-xs text-grand-silver">
                        Confidence: {Math.round(preview.confidence_scores.content * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-grand-silver text-sm">{preview.content_explanation}</p>
                  <details className="mt-2">
                    <summary className="text-blue-400 text-sm cursor-pointer">View suggested content</summary>
                    <pre className="mt-2 p-3 bg-grand-charcoal rounded text-xs text-white overflow-x-auto max-h-64 overflow-y-auto">
                      {preview.suggested_content.slice(0, 2000)}...
                    </pre>
                  </details>
                </div>
              )}

              {/* Internal Links Suggestions */}
              {preview.internal_links.length > 0 && (
                <div className="p-4 rounded-lg bg-grand-steel/30 border border-grand-steel/50">
                  <p className="font-semibold text-white mb-3">Internal Link Suggestions ({preview.internal_links.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {preview.internal_links.map((link, i) => (
                      <label key={i} className="flex items-start gap-2 p-2 rounded bg-grand-charcoal/50">
                        <input
                          type="checkbox"
                          checked={selectedLinks.has(i)}
                          onChange={() => toggleLink(i)}
                          className="rounded mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm">"{link.anchor_text}" → {link.target_title}</p>
                          <p className="text-grand-silver text-xs truncate">{link.target_url}</p>
                          <p className="text-grand-silver/60 text-xs">{link.context?.slice(0, 100)}...</p>
                        </div>
                        <span className="text-xs text-grand-silver">{Math.round(link.relevance_score * 100)}%</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <div className="flex justify-end gap-2 pt-4 border-t border-grand-steel/30">
                <button
                  onClick={applyChanges}
                  disabled={applying || (!applyTitle && !applyMeta && !applyKeyword && !applyCategory && !applyContent && selectedLinks.size === 0)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Apply Selected Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scores Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ScoreCard label="Title" score={post.title_score} />
        <ScoreCard label="Description" score={post.description_score} />
        <ScoreCard label="Keyword" score={post.keyword_score} />
        <ScoreCard label="Content" score={post.content_score} />
        <ScoreCard label="Links" score={post.links_score} />
        <ScoreCard label="Readability" score={post.readability_score} />
      </div>

      {/* Meta Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Meta */}
        <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">Meta Information</h2>
          <div className="space-y-4">
            <MetaRow label="Target Keyword" value={post.target_keyword || '—'} />
            <MetaRow label="Description" value={post.description || '—'} className="text-sm" />
            <MetaRow label="Categories" value={post.categories.join(', ') || '—'} />
            <MetaRow label="Featured Type" value={post.featured_listing_type || '—'} />
          </div>
        </div>

        {/* Right: Content Stats */}
        <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">Content Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Words" value={post.word_count.toLocaleString()} />
            <StatItem label="H2 Headings" value={post.h2_count} />
            <StatItem label="H3 Headings" value={post.h3_count} />
            <StatItem label="Paragraphs" value={post.paragraph_count} />
            <StatItem label="Images" value={`${post.images_with_alt}/${post.image_count}`} />
            <StatItem label="External Links" value={post.external_links} />
            <StatItem label="Links Out" value={post.internal_links_out} />
            <StatItem
              label="Links In"
              value={post.internal_links_in}
              warning={post.internal_links_in === 0}
            />
          </div>
        </div>
      </div>

      {/* Issues */}
      <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">
            Issues ({post.issues.filter(i => !i.resolved).length})
          </h2>
        </div>

        {post.issues.length === 0 ? (
          <p className="text-green-400 text-center py-4">No issues found!</p>
        ) : (
          <div className="space-y-3">
            {post.issues
              .filter(i => !i.resolved)
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 }
                return order[a.severity] - order[b.severity]
              })
              .map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${
                    issue.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : issue.severity === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityClass(issue.severity)}`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="text-white">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="text-grand-silver text-sm mt-1">
                          <span className="text-grand-silver/60">Suggestion:</span> {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Internal Links */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Outbound */}
        <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">
            Outbound Links ({post.outbound_links.length})
          </h2>
          {post.outbound_links.length === 0 ? (
            <p className="text-grand-silver text-center py-4">No outbound internal links</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {post.outbound_links.map((link, i) => (
                <div key={i} className="p-2 bg-grand-steel/30 rounded-lg">
                  <p className="text-white text-sm truncate">{link.target_url}</p>
                  {link.anchor_text && (
                    <p className="text-grand-silver/60 text-xs truncate">"{link.anchor_text}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbound */}
        <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">
            Inbound Links ({post.inbound_links.length})
          </h2>
          {post.inbound_links.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-yellow-400">Orphan page - no inbound links!</p>
              <p className="text-grand-silver text-sm mt-1">Link to this post from other content</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {post.inbound_links.map((link, i) => (
                <Link
                  key={i}
                  to={`/posts/${link.source_slug}`}
                  className="block p-2 bg-grand-steel/30 rounded-lg hover:bg-grand-steel/50 transition-colors"
                >
                  <p className="text-white text-sm">{link.source_slug}</p>
                  {link.anchor_text && (
                    <p className="text-grand-silver/60 text-xs truncate">"{link.anchor_text}"</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className={`p-4 rounded-xl border ${getScoreBgClass(score)}`}>
      <p className="text-grand-silver text-sm">{label}</p>
      <p className={`text-2xl font-bold ${getScoreClass(score)}`}>{score}</p>
    </div>
  )
}

function MetaRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-grand-silver/60 text-sm">{label}</p>
      <p className={`text-white ${className}`}>{value}</p>
    </div>
  )
}

function StatItem({ label, value, warning = false }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <div className="p-3 bg-grand-steel/30 rounded-lg">
      <p className="text-grand-silver/60 text-xs">{label}</p>
      <p className={`text-lg font-semibold ${warning ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

// Helper component for AI suggestion cards
function SuggestionCard({
  label,
  original,
  suggested,
  explanation,
  confidence,
  checked,
  onChange
}: {
  label: string
  original: string
  suggested: string
  explanation: string | null
  confidence?: number
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="p-4 rounded-lg bg-grand-steel/30 border border-grand-steel/50">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span className="font-semibold text-white">{label}</span>
        </label>
        {confidence !== undefined && (
          <span className="text-xs text-grand-silver">
            Confidence: {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      <div className="grid gap-2 text-sm">
        <div>
          <span className="text-grand-silver/60">Current: </span>
          <span className="text-red-400 line-through">{original}</span>
        </div>
        <div>
          <span className="text-grand-silver/60">Suggested: </span>
          <span className="text-green-400">{suggested}</span>
        </div>
        {explanation && (
          <p className="text-grand-silver text-xs mt-1">{explanation}</p>
        )}
      </div>
    </div>
  )
}
