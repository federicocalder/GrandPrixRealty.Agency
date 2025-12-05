import { useState, useEffect } from 'react';

// Base URL for the main Hugo site - uses relative paths in production
const SITE_BASE_URL = import.meta.env.DEV ? '' : '';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isMenuOpen]);

  return (
    <>
      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-[60] bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section (Left) */}
            <div className="flex items-center space-x-3">
              <a href={`${SITE_BASE_URL}/`} className="flex items-center space-x-3">
                {/* Logo Image */}
                <div className="w-16 h-16 flex items-center justify-center">
                  <img
                    src={`${import.meta.env.BASE_URL}images/logo.webp`}
                    alt="Grand Prix Realty Logo"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                {/* Logo Text */}
                <div>
                  <h2 className="font-cinzel font-bold text-white text-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                    Grand Prix Realty
                  </h2>
                </div>
              </a>
            </div>

            {/* Hamburger Menu Button (Right) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hamburger relative z-[70] flex flex-col gap-[5px] cursor-pointer p-2"
              aria-label="Menu"
            >
              <span
                className="block w-6 h-[3px] bg-white transition-all duration-300"
                style={isMenuOpen ? { transform: 'rotate(45deg) translate(7px, 7px)' } : {}}
              />
              <span
                className="block w-6 h-[3px] bg-white transition-all duration-300"
                style={isMenuOpen ? { opacity: 0 } : {}}
              />
              <span
                className="block w-6 h-[3px] bg-white transition-all duration-300"
                style={isMenuOpen ? { transform: 'rotate(-45deg) translate(7px, -7px)' } : {}}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <div
        className={`fixed top-0 left-0 w-screen h-screen bg-black z-50 transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full h-full flex flex-col items-end justify-center space-y-6 px-8">
          {/* Navigation Links */}
          <a
            href={`${SITE_BASE_URL}/homebuyer/`}
            className="text-white hover:text-grand-silver font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            onClick={() => setIsMenuOpen(false)}
          >
            Buy
          </a>
          <a
            href={`${SITE_BASE_URL}/homeseller/`}
            className="text-white hover:text-grand-silver font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            onClick={() => setIsMenuOpen(false)}
          >
            Sell
          </a>
          <a
            href={`${SITE_BASE_URL}/propertymanagement/`}
            className="text-white hover:text-grand-silver font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            onClick={() => setIsMenuOpen(false)}
          >
            Manage
          </a>
          <a
            href={`${SITE_BASE_URL}/about/`}
            className="text-white hover:text-grand-silver font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            onClick={() => setIsMenuOpen(false)}
          >
            About Us
          </a>
          <a
            href={`${SITE_BASE_URL}/realtors/`}
            className="text-white hover:text-grand-silver font-sans font-black text-5xl lg:text-6xl xl:text-7xl uppercase transition-colors duration-300"
            onClick={() => setIsMenuOpen(false)}
          >
            Join Us
          </a>

          {/* Portal Link */}
          <div className="mt-8 pt-8 border-t border-white/20">
            <a
              href="/portal"
              className="inline-flex items-center gap-3 text-white hover:text-grand-silver font-sans font-bold text-2xl uppercase transition-colors duration-300"
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Portal
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
