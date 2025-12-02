import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
    document.body.classList.toggle('menu-open', !menuOpen)
  }

  const closeMenu = () => {
    setMenuOpen(false)
    document.body.classList.remove('menu-open')
  }

  return (
    <>
      <header style={{ backgroundColor: '#000' }} className="fixed top-0 left-0 right-0 z-[60]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <a href="/" className="flex items-center space-x-3">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img
                    src="/images/logo.webp"
                    alt="Grand Prix Realty Logo"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-cinzel font-bold text-white text-2xl">Grand Prix Realty</h2>
                </div>
              </a>
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMenu}
              className={`hamburger ${menuOpen ? 'active' : ''}`}
              aria-label="Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${menuOpen ? 'active' : ''}`}>
          <div className="w-full h-full flex flex-col items-end justify-center space-y-6 px-8">
            <a
              href="/homebuyer/"
              onClick={closeMenu}
              className="text-white hover:text-gray-300 font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              Buy
            </a>
            <a
              href="/homeseller/"
              onClick={closeMenu}
              className="text-white hover:text-gray-300 font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              Sell
            </a>
            <a
              href="/propertymanagement/"
              onClick={closeMenu}
              className="text-white hover:text-gray-300 font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              Manage
            </a>
            <a
              href="/about/"
              onClick={closeMenu}
              className="text-white hover:text-gray-300 font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              About Us
            </a>
            <a
              href="/realtors/"
              onClick={closeMenu}
              className="text-white hover:text-gray-300 font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            >
              Join Us
            </a>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-20"></div>
    </>
  )
}
