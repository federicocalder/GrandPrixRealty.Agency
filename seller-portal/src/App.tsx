import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gradient-gold">GPR</span>
          <span className="text-zinc-400 text-sm">Grand Prix Realty</span>
        </div>
        <p className="text-zinc-500 text-sm">
          © {new Date().getFullYear()} Grand Prix Realty. All rights reserved.
        </p>
        <p className="text-zinc-600 text-xs">
          Estimates are not appraisals. Consult a licensed professional for official valuations.
        </p>
      </div>
    </footer>
  )
}

export default App
