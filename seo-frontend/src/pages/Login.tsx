import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      onLogin()
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-grand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-grand-charcoal rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-grand-silver" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">SEO Lab</h1>
          <p className="text-grand-silver mt-2">Grand Prix Realty</p>
        </div>

        {/* Login Form */}
        <div className="bg-grand-charcoal rounded-2xl p-8 border border-grand-steel/30">
          <h2 className="font-display font-semibold text-xl text-white mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-grand-silver mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-grand-dark border border-grand-steel/50 rounded-lg text-white placeholder-grand-silver/50 focus:outline-none focus:border-grand-silver/50"
                placeholder="broker@grandprixrealty.agency"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-grand-silver mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-grand-dark border border-grand-steel/50 rounded-lg text-white placeholder-grand-silver/50 focus:outline-none focus:border-grand-silver/50"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-grand-dark font-semibold rounded-lg hover:bg-grand-silver transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-grand-silver/60 text-sm mt-6">
            Broker/Admin access only
          </p>
        </div>
      </div>
    </div>
  )
}
