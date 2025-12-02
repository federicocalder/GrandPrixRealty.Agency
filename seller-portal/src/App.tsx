import { Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'

function App() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
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
    <footer className="bg-[#050505] border-t border-white/10 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/images/logo.webp" alt="Grand Prix Realty Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h3 className="font-cinzel font-bold text-lg">Grand Prix Realty</h3>
                <p className="text-white/60 text-sm">Las Vegas Real Estate</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Your trusted partner in Las Vegas real estate. We provide exceptional service for home buyers, sellers, and property management needs.
            </p>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-cinzel font-semibold text-lg text-white">Services</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/homebuyer/" className="text-white/50 hover:text-white transition-colors duration-300">Home Buying</a></li>
              <li><a href="/homeseller/" className="text-white/50 hover:text-white transition-colors duration-300">Home Selling</a></li>
              <li><a href="/propertymanagement/" className="text-white/50 hover:text-white transition-colors duration-300">Property Management</a></li>
              <li><a href="/realtors/" className="text-white/50 hover:text-white transition-colors duration-300">Careers</a></li>
            </ul>
          </div>

          {/* Areas */}
          <div className="space-y-4">
            <h4 className="font-cinzel font-semibold text-lg text-white">Areas We Serve</h4>
            <ul className="space-y-3 text-sm">
              <li><span className="text-white/50">Las Vegas</span></li>
              <li><span className="text-white/50">Henderson</span></li>
              <li><span className="text-white/50">North Las Vegas</span></li>
              <li><span className="text-white/50">Summerlin</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-cinzel font-semibold text-lg text-white">Contact Info</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span className="text-white/50">(702) 555-0123</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span className="text-white/50">info@grandprixrealty.agency</span>
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-4 h-4 text-white/40 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span className="text-white/50">Las Vegas, Nevada</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-white/40">
              © {new Date().getFullYear()} Grand Prix Realty. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="/privacy-policy/" className="text-white/40 hover:text-white transition-colors duration-300">Privacy Policy</a>
              <a href="/terms/" className="text-white/40 hover:text-white transition-colors duration-300">Terms of Service</a>
              <a href="/about/" className="text-white/40 hover:text-white transition-colors duration-300">About Us</a>
            </div>
          </div>
          <p className="text-white/30 text-xs text-center mt-4">
            Estimates are not appraisals. Consult a licensed professional for official valuations.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default App
