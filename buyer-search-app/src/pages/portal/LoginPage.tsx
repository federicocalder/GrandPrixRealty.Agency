// ============================================
// Login Page - Buyer Portal
// Grand Prix Realty
// ============================================

import { useState } from 'react';
import { useAuth } from '../../hooks/portal';

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle, loading, error, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Google sign in failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.webp`}
              alt="Grand Prix Realty"
              className="w-16 h-16"
            />
            <span className="font-cinzel text-2xl font-bold text-[#1a1a1a]">
              Grand Prix Realty
            </span>
          </a>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e3df] p-8">
          <h1 className="font-cinzel text-2xl font-semibold text-[#1a1a1a] text-center mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-[#6b6b6b] text-center mb-8">
            {isSignUp
              ? 'Start your home search journey'
              : 'Sign in to your buyer portal'}
          </p>

          {/* Error Display */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{displayError}</p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-[#e5e3df] rounded-xl font-medium text-[#4a4a4a] hover:bg-[#f8f7f4] hover:border-[#1a1a1a] transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e3df]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[#999]">or</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 bg-[#f8f7f4] border border-[#e5e3df] rounded-xl focus:outline-none focus:border-[#1a1a1a] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-[#f8f7f4] border border-[#e5e3df] rounded-xl focus:outline-none focus:border-[#1a1a1a] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#f8f7f4] border border-[#e5e3df] rounded-xl focus:outline-none focus:border-[#1a1a1a] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#1a1a1a] text-[#f8f7f4] rounded-xl font-medium hover:bg-[#2d2d2d] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#f8f7f4]/30 border-t-[#f8f7f4] rounded-full animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>{isSignUp ? 'Create Account' : 'Sign In'}</>
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <p className="text-center text-[#6b6b6b] mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLocalError(null);
                clearError();
              }}
              className="text-[#1a1a1a] font-medium hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {/* Back to Search */}
        <p className="text-center text-[#999] mt-6">
          <a href="/" className="hover:text-[#1a1a1a] transition-colors">
            Back to Home Search
          </a>
        </p>
      </div>
    </div>
  );
}
