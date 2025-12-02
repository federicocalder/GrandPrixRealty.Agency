import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, DashboardSummary, PostSummary, getScoreClass, getScoreBgClass } from '../lib/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444']

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [attention, setAttention] = useState<(PostSummary & { critical_issues: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryData, attentionData] = await Promise.all([
        api.getDashboard(),
        api.getAttention(10)
      ])
      setSummary(summaryData)
      setAttention(attentionData)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grand-silver"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-grand-steel rounded-lg text-white">
          Retry
        </button>
      </div>
    )
  }

  if (!summary) return null

  const scoreData = [
    { name: 'Excellent (80+)', value: summary.excellent_posts },
    { name: 'Good (60-79)', value: summary.good_posts },
    { name: 'Needs Work (40-59)', value: summary.needs_work_posts },
    { name: 'Poor (<40)', value: summary.poor_posts },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">SEO Dashboard</h1>
          <p className="text-grand-silver mt-1">Blog SEO health overview</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-grand-steel rounded-lg text-white hover:bg-grand-charcoal transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Posts"
          value={summary.total_posts}
          subtitle={`${summary.published_posts} published`}
        />
        <StatCard
          title="Average Score"
          value={Math.round(summary.avg_score)}
          suffix="/100"
          className={getScoreClass(summary.avg_score)}
        />
        <StatCard
          title="Open Issues"
          value={summary.open_issues}
          subtitle={`${summary.critical_issues} critical`}
          className={summary.critical_issues > 0 ? 'text-red-400' : ''}
        />
        <StatCard
          title="Orphan Pages"
          value={summary.orphan_pages}
          subtitle="No inbound links"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-grand-charcoal rounded-2xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">Score Distribution</h2>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={scoreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {scoreData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e5e5' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {scoreData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-grand-silver">{item.name}</span>
                  <span className="text-sm text-white font-medium ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Stats */}
        <div className="bg-grand-charcoal rounded-2xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">Content Statistics</h2>
          <div className="space-y-4">
            <StatRow label="Total Words" value={summary.total_words.toLocaleString()} />
            <StatRow label="Avg. Word Count" value={summary.avg_word_count.toLocaleString()} />
            <StatRow label="Internal Links" value={summary.total_internal_links.toLocaleString()} />
            <StatRow
              label="Avg. Links/Post"
              value={(summary.total_internal_links / summary.total_posts).toFixed(1)}
            />
          </div>
        </div>
      </div>

      {/* Posts Needing Attention */}
      <div className="bg-grand-charcoal rounded-2xl p-6 border border-grand-steel/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">Posts Needing Attention</h2>
          <Link to="/posts?sort_by=overall_score&sort_order=asc" className="text-sm text-grand-silver hover:text-white">
            View all &rarr;
          </Link>
        </div>

        {attention.length === 0 ? (
          <p className="text-grand-silver text-center py-8">All posts are in good shape!</p>
        ) : (
          <div className="space-y-2">
            {attention.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-grand-steel/30 transition-colors"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${getScoreBgClass(post.overall_score)}`}>
                  <span className={`font-bold ${getScoreClass(post.overall_score)}`}>
                    {post.overall_score}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{post.title}</p>
                  <p className="text-sm text-grand-silver truncate">
                    {post.categories.join(' · ')}
                  </p>
                </div>
                {post.critical_issues > 0 && (
                  <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">
                    {post.critical_issues} critical
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  suffix,
  className = ''
}: {
  title: string
  value: number | string
  subtitle?: string
  suffix?: string
  className?: string
}) {
  return (
    <div className="bg-grand-charcoal rounded-xl p-4 border border-grand-steel/30">
      <p className="text-sm text-grand-silver">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${className || 'text-white'}`}>
        {value}{suffix}
      </p>
      {subtitle && <p className="text-xs text-grand-silver/60 mt-1">{subtitle}</p>}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-grand-steel/30 last:border-0">
      <span className="text-grand-silver">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}
