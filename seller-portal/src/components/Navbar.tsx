import { Link, useLocation } from 'react-router-dom'
import { Home, TrendingUp, User } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-50 glass border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#f4d03f] flex items-center justify-center">
              <span className="text-black font-bold text-lg">G</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white group-hover:text-[#d4af37] transition-colors">
                Grand Prix Realty
              </span>
              <span className="text-xs text-zinc-500">Seller Portal</span>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 rounded-full p-1">
            <NavTab
              to="/"
              icon={<Home size={16} />}
              label="Home Value"
              active={location.pathname === '/'}
            />
            <NavTab
              to="/portal/seller"
              icon={<TrendingUp size={16} />}
              label="Seller Portal"
              active={location.pathname.startsWith('/portal/seller')}
            />
            <NavTab
              to="/portal/buyer"
              icon={<User size={16} />}
              label="Buyer Portal"
              active={location.pathname.startsWith('/portal/buyer')}
            />
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <a
              href="tel:+17029001000"
              className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors"
            >
              (702) 900-1000
            </a>
            <button className="btn-gold px-4 py-2 rounded-full text-sm">
              List Your Home
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavTab({
  to,
  icon,
  label,
  active
}: {
  to: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-[#d4af37] text-black'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}
