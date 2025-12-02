import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface LayoutProps {
  user: { email?: string }
}

export default function Layout({ user }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Header - GPR Style */}
      <header className="fixed top-0 left-0 right-0 z-[60] bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <NavLink to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-grand-steel rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-white text-2xl tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>SEO Lab</h2>
              </div>
            </NavLink>

            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMenu}
              className="flex flex-col gap-[5px] cursor-pointer p-2 relative z-[70]"
              aria-label="Menu"
            >
              <span className={`block w-6 h-[3px] bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-6 h-[3px] bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-[3px] bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile Menu - Full Screen */}
        <div className={`fixed inset-0 bg-black z-50 transition-all duration-300 ${menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <div className="w-full h-full flex flex-col items-end justify-center space-y-6 px-8 pt-20">
            <NavLink
              to="/"
              onClick={closeMenu}
              className="text-white hover:text-grand-silver font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
              end
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/posts"
              onClick={closeMenu}
              className="text-white hover:text-grand-silver font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              Posts
            </NavLink>
            <NavLink
              to="/issues"
              onClick={closeMenu}
              className="text-white hover:text-grand-silver font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              Issues
            </NavLink>

            {/* Divider */}
            <div className="w-full max-w-md border-t border-white/20 my-4"></div>

            {/* User info and logout */}
            <div className="text-right">
              <p className="text-white/60 text-lg mb-2">{user.email}</p>
              <button
                onClick={() => { closeMenu(); handleLogout(); }}
                className="text-white hover:text-grand-silver font-bold text-2xl uppercase transition-colors duration-300"
              >
                Logout
              </button>
            </div>

            {/* Back to main site */}
            <a
              href="/"
              className="text-white/40 hover:text-white text-lg transition-colors duration-300 mt-8"
            >
              &larr; Back to Grand Prix Realty
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - with padding for fixed header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <Outlet />
      </main>
    </div>
  )
}
