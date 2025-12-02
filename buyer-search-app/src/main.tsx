import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PortalPage } from './pages/portal/PortalPage'
import { LoginPage } from './pages/portal/LoginPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Main search app */}
        <Route path="/" element={<App />} />

        {/* Portal routes */}
        <Route path="/portal/login" element={<LoginPage />} />
        <Route path="/portal/*" element={<PortalPage />} />

        {/* Listing detail page placeholder */}
        <Route path="/listing/:listingKey" element={<ListingPlaceholder />} />

        {/* Auth callback for OAuth */}
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

// Placeholder for listing detail page
function ListingPlaceholder() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#e5e3df] p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-[#f8f7f4] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <h1 className="font-cinzel text-xl font-semibold text-[#1a1a1a] mb-2">
          Listing Detail
        </h1>
        <p className="text-[#6b6b6b] mb-4">
          This page will show the full listing details. For now, view listings on the main Hugo site.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2 bg-[#1a1a1a] text-white rounded-xl font-medium hover:bg-[#2d2d2d] transition-colors"
        >
          Back to Search
        </a>
      </div>
    </div>
  )
}

// Auth callback handler for OAuth redirects
function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase client automatically handles the token exchange
    // when detectSessionInUrl is true. We just need to wait a moment
    // for it to complete, then redirect to portal.
    const timer = setTimeout(() => {
      navigate('/portal', { replace: true })
    }, 1000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#e5e3df] border-t-[#1a1a1a] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#6b6b6b]">Completing sign in...</p>
      </div>
    </div>
  )
}
