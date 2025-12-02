import { AVMWidget } from './components';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gpr-navy-900 text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-gpr-gold-400">
              Grand Prix Realty
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="https://grandprixrealty.agency" className="hover:text-gpr-gold-400 transition-colors">
              Home
            </a>
            <a href="https://grandprixrealty.agency/sellers" className="hover:text-gpr-gold-400 transition-colors">
              Sellers
            </a>
            <a href="https://grandprixrealty.agency/buyers" className="hover:text-gpr-gold-400 transition-colors">
              Buyers
            </a>
            <a href="https://grandprixrealty.agency/contact" className="hover:text-gpr-gold-400 transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="py-12 px-4">
        <AVMWidget
          onValuationComplete={(valuation) => {
            console.log('Valuation complete:', valuation.valuation_id);
          }}
          onLeadCaptured={(leadId) => {
            console.log('Lead captured:', leadId);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="bg-gpr-navy-900 text-gray-400 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>&copy; 2024 Grand Prix Realty. All rights reserved.</p>
          <p className="mt-2">
            Las Vegas Premier Real Estate •{' '}
            <a href="tel:+17025551234" className="text-gpr-gold-400 hover:underline">
              (702) 555-1234
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
