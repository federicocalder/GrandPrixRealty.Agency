import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, PostSummary, getScoreClass, getScoreBgClass } from '../lib/api'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'buyers', label: 'Home Buyers' },
  { value: 'sellers', label: 'Home Sellers' },
  { value: 'landlords', label: 'Landlords' },
  { value: 'realtors', label: 'Realtors' },
]

const SORT_OPTIONS = [
  { value: 'overall_score', label: 'SEO Score' },
  { value: 'word_count', label: 'Word Count' },
  { value: 'internal_links_out', label: 'Links Out' },
  { value: 'internal_links_in', label: 'Links In' },
  { value: 'published_at', label: 'Published Date' },
]

export default function Posts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const category = searchParams.get('category') || ''
  const sortBy = searchParams.get('sort_by') || 'overall_score'
  const sortOrder = (searchParams.get('sort_order') || 'asc') as 'asc' | 'desc'
  const scoreFilter = searchParams.get('score') || ''

  useEffect(() => {
    loadPosts()
  }, [category, sortBy, sortOrder, scoreFilter])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const params: any = {
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 200,
      }

      if (category) params.category = category

      if (scoreFilter === 'excellent') {
        params.min_score = 80
      } else if (scoreFilter === 'good') {
        params.min_score = 60
        params.max_score = 79
      } else if (scoreFilter === 'needs_work') {
        params.min_score = 40
        params.max_score = 59
      } else if (scoreFilter === 'poor') {
        params.max_score = 39
      }

      const data = await api.getPosts(params)
      setPosts(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  const toggleSortOrder = () => {
    updateParams('sort_order', sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">All Posts</h1>
          <p className="text-grand-silver mt-1">{posts.length} posts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-grand-charcoal rounded-xl p-4 border border-grand-steel/30">
        <div className="flex flex-wrap items-center gap-4">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => updateParams('category', e.target.value)}
            className="px-3 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white focus:outline-none focus:border-grand-silver/50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Score Filter */}
          <select
            value={scoreFilter}
            onChange={(e) => updateParams('score', e.target.value)}
            className="px-3 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white focus:outline-none focus:border-grand-silver/50"
          >
            <option value="">All Scores</option>
            <option value="excellent">Excellent (80+)</option>
            <option value="good">Good (60-79)</option>
            <option value="needs_work">Needs Work (40-59)</option>
            <option value="poor">Poor (&lt;40)</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => updateParams('sort_by', e.target.value)}
            className="px-3 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white focus:outline-none focus:border-grand-silver/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={toggleSortOrder}
            className="px-3 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white hover:bg-grand-steel transition-colors"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Posts Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grand-silver"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
          <button onClick={loadPosts} className="mt-4 px-4 py-2 bg-grand-steel rounded-lg text-white">
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-grand-silver">
          No posts found matching your filters
        </div>
      ) : (
        <div className="bg-grand-charcoal rounded-xl border border-grand-steel/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-grand-steel/30">
                  <th className="text-left p-4 text-grand-silver font-medium">Score</th>
                  <th className="text-left p-4 text-grand-silver font-medium">Title</th>
                  <th className="text-left p-4 text-grand-silver font-medium hidden md:table-cell">Category</th>
                  <th className="text-right p-4 text-grand-silver font-medium hidden sm:table-cell">Words</th>
                  <th className="text-right p-4 text-grand-silver font-medium hidden lg:table-cell">Links Out</th>
                  <th className="text-right p-4 text-grand-silver font-medium hidden lg:table-cell">Links In</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-grand-steel/30 hover:bg-grand-steel/20">
                    <td className="p-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getScoreBgClass(post.overall_score)}`}>
                        <span className={`font-bold text-sm ${getScoreClass(post.overall_score)}`}>
                          {post.overall_score}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link to={`/posts/${post.slug}`} className="block">
                        <p className="text-white font-medium hover:text-grand-silver transition-colors truncate max-w-md">
                          {post.title}
                        </p>
                        <p className="text-sm text-grand-silver/60 truncate">{post.url}</p>
                      </Link>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {post.categories.slice(0, 2).map((cat) => (
                          <span key={cat} className="px-2 py-0.5 text-xs bg-grand-steel/50 text-grand-silver rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right text-grand-silver hidden sm:table-cell">
                      {post.word_count.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-grand-silver hidden lg:table-cell">
                      {post.internal_links_out}
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell">
                      <span className={post.internal_links_in === 0 ? 'text-yellow-400' : 'text-grand-silver'}>
                        {post.internal_links_in}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
