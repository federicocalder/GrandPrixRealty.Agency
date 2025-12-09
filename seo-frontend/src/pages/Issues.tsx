import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

const ITEMS_PER_PAGE = 50

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [severity, setSeverity] = useState('')
  const [issueType, setIssueType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadData()
  }, [severity, issueType])

  // Reset to page 1 when search/filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, severity, issueType])

  const loadData = async () => {
    try {
      setLoading(true)
      const [issuesData, typesData] = await Promise.all([
        api.getIssues({ severity: severity || undefined, issue_type: issueType || undefined, limit: 1000 }),
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

  // Filter issues by search query
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues
    const query = searchQuery.toLowerCase()
    return issues.filter(issue =>
      (issue.post_title?.toLowerCase().includes(query)) ||
      issue.post_slug.toLowerCase().includes(query) ||
      issue.message.toLowerCase().includes(query) ||
      issue.issue_type.toLowerCase().includes(query)
    )
  }, [issues, searchQuery])

  // Pagination logic
  const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE)
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredIssues.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredIssues, currentPage])

  const criticalCount = filteredIssues.filter(i => i.severity === 'critical').length
  const warningCount = filteredIssues.filter(i => i.severity === 'warning').length
  const infoCount = filteredIssues.filter(i => i.severity === 'info').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">SEO Issues</h1>
          <p className="text-grand-silver mt-1">
            {searchQuery ? `${filteredIssues.length} of ${issues.length}` : issues.length} open issues
          </p>
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
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grand-silver/50" />
            <input
              type="text"
              placeholder="Search posts, issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-grand-dark border border-grand-steel/50 rounded-lg text-white placeholder-grand-silver/50 focus:outline-none focus:border-grand-gold/50"
            />
          </div>

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
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-12 text-green-400">
          {searchQuery ? 'No matching issues found' : 'No issues found!'}
        </div>
      ) : (
        <>
          <div className="bg-grand-charcoal rounded-xl border border-grand-steel/30 overflow-hidden">
            <div className="divide-y divide-grand-steel/30">
              {paginatedIssues.map((issue, index) => (
                <div key={issue.id} className="p-4 hover:bg-grand-steel/20">
                  <div className="flex items-start gap-3">
                    <span className="text-grand-silver/50 text-sm font-mono w-8 flex-shrink-0 text-right">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-grand-charcoal rounded-xl p-4 border border-grand-steel/30">
              <p className="text-grand-silver text-sm">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredIssues.length)} of {filteredIssues.length} issues
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-grand-steel/50 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grand-steel transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-grand-gold text-white'
                            : 'bg-grand-steel/50 text-grand-silver hover:bg-grand-steel'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-grand-steel/50 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grand-steel transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
