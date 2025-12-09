import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import PostDetail from './pages/PostDetail'
import Issues from './pages/Issues'
import AIFixer from './pages/AIFixer'
import Layout from './components/Layout'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-grand-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-grand-silver"></div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => {}} />
  }

  return (
    <BrowserRouter basename="/seo-lab">
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:slug" element={<PostDetail />} />
          <Route path="issues" element={<Issues />} />
          <Route path="ai-fixer" element={<AIFixer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
