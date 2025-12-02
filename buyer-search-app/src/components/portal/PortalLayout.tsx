// ============================================
// Portal Layout - Sidebar + Header
// Grand Prix Realty
// ============================================

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/portal';
import type { BuyerProject, UserProfile } from '../../types/portal';

interface PortalLayoutProps {
  children: React.ReactNode;
  project: BuyerProject | null;
  profile: UserProfile | null;
}

const navItems = [
  { path: '/portal', label: 'Overview', icon: 'home' },
  { path: '/portal/saved-homes', label: 'Saved Homes', icon: 'heart' },
  { path: '/portal/saved-searches', label: 'Saved Searches', icon: 'search' },
  { path: '/portal/messages', label: 'Messages', icon: 'message' },
  { path: '/portal/documents', label: 'Documents', icon: 'folder' },
];

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const baseClass = `w-5 h-5 ${className || ''}`;

  switch (icon) {
    case 'home':
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'heart':
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'search':
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'message':
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'folder':
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

export function PortalLayout({ children, project, profile }: PortalLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login');
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#e5e3df] z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#e5e3df]">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/logo.webp"
              alt="Grand Prix Realty"
              className="w-10 h-10"
            />
            <span className="font-cinzel text-lg font-bold text-[#1a1a1a]">
              Grand Prix
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#6b6b6b] hover:bg-[#f8f7f4] hover:text-[#1a1a1a]'
                }`}
              >
                <NavIcon icon={item.icon} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Search */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#e5e3df]">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#6b6b6b] hover:bg-[#f8f7f4] hover:text-[#1a1a1a] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Search</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#e5e3df] flex items-center justify-between px-4 lg:px-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[#f8f7f4] transition-colors"
          >
            <svg className="w-6 h-6 text-[#4a4a4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Project Name */}
          <div className="hidden lg:block">
            <h1 className="font-cinzel text-lg font-semibold text-[#1a1a1a]">
              {project?.name || 'My Home Search'}
            </h1>
            {project?.target_city && (
              <p className="text-sm text-[#6b6b6b]">
                {project.target_city}, {project.target_state || 'NV'}
              </p>
            )}
          </div>

          {/* Mobile Project Name */}
          <div className="lg:hidden flex-1 text-center">
            <h1 className="font-cinzel text-lg font-semibold text-[#1a1a1a]">
              {project?.name || 'Portal'}
            </h1>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#f8f7f4] transition-colors"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">
                  {initials}
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium text-[#4a4a4a]">
                {profile?.full_name || 'User'}
              </span>
              <svg className="w-4 h-4 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e5e3df] py-2 z-20">
                  <div className="px-4 py-2 border-b border-[#e5e3df]">
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-[#999] truncate">
                      {profile?.role || 'Buyer'}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-[#6b6b6b] hover:bg-[#f8f7f4] hover:text-[#1a1a1a] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
