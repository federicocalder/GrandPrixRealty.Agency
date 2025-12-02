export const Hero = () => {
  return (
    <section className="hero-section relative min-h-screen flex items-center overflow-hidden">
      {/* Solid black background */}
      <div className="absolute inset-0 bg-black"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
        <div className="hero-content text-center space-y-8 max-w-5xl mx-auto">
          {/* Main Heading */}
          <div className="space-y-6">
            <h2 className="font-cinzel font-bold text-6xl lg:text-7xl xl:text-8xl text-white whitespace-nowrap" style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, color: '#ffffff', lineHeight: 0.875 }}>
              Deals Done
              <br />
              Surgical Clean
            </h2>
            <h1 className="text-2xl lg:text-3xl font-light shimmer-text">
              Your landlord's worst nightmare just became your best friend.
              <br />
              AI-powered search meets ruthless negotiation.
            </h1>
          </div>

          {/* Scroll indicator */}
          <div className="pt-16 animate-bounce">
            <svg className="w-8 h-8 mx-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
