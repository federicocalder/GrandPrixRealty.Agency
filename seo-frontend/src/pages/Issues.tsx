import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { api, getSeverityClass } from '../lib/api'

interface Issue {
  id: string
  post_slug: string
  post_title?: string
  issue_type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestion: string | null
  resolved: boolean
  created_at: string
}

interface IssueType {
  issue_type: string
  count: number
  severity: string
}

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [severity, setSeverity] = useState('')
  const [issueType, setIssueType] = useState('')

  useEffect(() => {
    loadData()
  }, [severity, issueType])

  const loadData = async () => {
    try {
      setLoading(true)
      const [issuesData, typesData] = await Promise.all([
        api.getIssues({ severity: severity || undefined, issue_type: issueType || undefined }),
        api.getIssueTypes()
      ])
      setIssues(issuesData)
      setIssueTypes(typesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  const resolveIssue = async (issueId: string) => {
    try {
      await api.resolveIssue(issueId)
      setIssues(issues.filter(i => i.id !== issueId))
    } catch (err: any) {
      alert('Failed to resolve issue')
    }
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  const infoCount = issues.filter(i => i.severity === 'info').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">SEO Issues</h1>
          <p className="text-grand-silver mt-1">{issues.length} open issues</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">Critical</p>
          <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 text-sm">Warning</p>
          <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">Info</p>
          <p className="text-2xl font-bold text-blue-400">{infoCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-grand-charcoal rounded-xl p-4 border border-grand-steel/30">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="px-3 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white focus:outline-none"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="px-3 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white focus:outline-none"
          >
            <option value="">All Issue Types</option>
            {issueTypes.map((type) => (
              <option key={type.issue_type} value={type.issue_type}>
                {type.issue_type.replace(/_/g, ' ')} ({type.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issue Types Summary */}
      {!issueType && (
        <div className="bg-grand-charcoal rounded-xl p-6 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-lg text-white mb-4">Issues by Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {issueTypes.slice(0, 8).map((type) => (
              <button
                key={type.issue_type}
                onClick={() => setIssueType(type.issue_type)}
                className={`p-3 rounded-lg text-left hover:bg-grand-steel/50 transition-colors ${
                  type.severity === 'critical' ? 'bg-red-500/10' :
                  type.severity === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                }`}
              >
                <p className="text-white text-sm truncate">
                  {type.issue_type.replace(/_/g, ' ')}
                </p>
                <p className={`text-lg font-bold ${
                  type.severity === 'critical' ? 'text-red-400' :
                  type.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {type.count}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Issues List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grand-silver"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-grand-steel rounded-lg text-white">
            Retry
          </button>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12 text-green-400">
          No issues found!
        </div>
      ) : (
        <div className="bg-grand-charcoal rounded-xl border border-grand-steel/30 overflow-hidden">
          <div className="divide-y divide-grand-steel/30">
            {issues.map((issue, index) => (
              <div key={issue.id} className="p-4 hover:bg-grand-steel/20">
                <div className="flex items-start gap-3">
                  <span className="text-grand-silver/50 text-sm font-mono w-8 flex-shrink-0 text-right">
                    {index + 1}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${getSeverityClass(issue.severity)}`}>
                    {issue.severity.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/posts/${issue.post_slug}`}
                        className="text-white hover:text-grand-silver font-medium"
                      >
                        {issue.post_title || issue.post_slug}
                      </Link>
                      <a
                        href={`https://grandprixrealty.agency/blog/${issue.post_slug}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-grand-gold hover:text-grand-gold/80 flex-shrink-0"
                        title="View live post"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <p className="text-grand-silver mt-1">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-grand-silver/60 text-sm mt-1">
                        Suggestion: {issue.suggestion}
                      </p>
                    )}
                    <p className="text-grand-silver/40 text-xs mt-2">
                      {issue.issue_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <button
                    onClick={() => resolveIssue(issue.id)}
                    className="px-3 py-1 text-sm bg-grand-steel/50 text-grand-silver rounded hover:bg-grand-steel transition-colors flex-shrink-0"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
