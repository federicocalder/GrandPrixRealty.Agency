import { Outlet, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface LayoutProps {
  user: { email?: string }
}

export default function Layout({ user }: LayoutProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-grand-steel text-white'
        : 'text-grand-silver hover:bg-grand-charcoal'
    }`

  return (
    <div className="min-h-screen bg-grand-dark">
      {/* Header */}
      <header className="bg-grand-darker border-b border-grand-steel/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-grand-steel rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-grand-silver" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-display font-semibold text-white">SEO Lab</span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <NavLink to="/" className={navLinkClass} end>
                Dashboard
              </NavLink>
              <NavLink to="/posts" className={navLinkClass}>
                Posts
              </NavLink>
              <NavLink to="/issues" className={navLinkClass}>
                Issues
              </NavLink>
            </nav>

            {/* User */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-grand-silver">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-grand-silver hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
