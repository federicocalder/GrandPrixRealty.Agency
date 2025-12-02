import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, PostDetail as PostDetailType, getScoreClass, getScoreBgClass, getSeverityClass } from '../lib/api'

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<PostDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
