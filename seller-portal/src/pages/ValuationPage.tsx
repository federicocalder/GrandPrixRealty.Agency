import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Home,
  MapPin,
  Calendar,
  Ruler,
  BedDouble,
  Bath,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Download,
  Share2,
  Building,
  Check,
  Lock,
  DollarSign,
  Target,
  Megaphone,
  FileSignature,
  Rocket
} from 'lucide-react'
import { getValuation, formatCurrency, formatDate, formatDistance, formatConfidence } from '../lib/api'
import type { ValuationResponse, ComparableSale, ValuationFactor } from '../types'

export default function ValuationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { valuationId } = useParams()

  // Check for valuation from: 1) router state, 2) sessionStorage (from Hugo page)
  const getInitialValuation = (): ValuationResponse | null => {
    if (location.state?.valuation) return location.state.valuation

    // Check sessionStorage for pending valuation from Hugo page
    const pending = sessionStorage.getItem('pendingValuation')
    if (pending) {
      try {
        const parsed = JSON.parse(pending)
        // Clear it after reading
        sessionStorage.removeItem('pendingValuation')
        if (parsed.id === valuationId) return parsed
      } catch {
        // Ignore parse errors
      }
    }
    return null
  }

  const [valuation, setValuation] = useState<ValuationResponse | null>(getInitialValuation)
  const [isLoading, setIsLoading] = useState(!valuation)
  const [error, setError] = useState<string | null>(null)

  // Fetch valuation if not passed via state or sessionStorage
  useEffect(() => {
    if (!valuation && valuationId) {
      setIsLoading(true)
      getValuation(valuationId)
        .then(setValuation)
        .catch(() => setError('Unable to load valuation'))
        .finally(() => setIsLoading(false))
    }
  }, [valuationId, valuation])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading your estimate...</p>
        </div>
      </div>
    )
  }

  if (error || !valuation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Valuation not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-gold px-6 py-3 rounded-xl"
          >
            Try Another Address
          </button>
        </div>
      </div>
    )
  }

  const { property, valuation: result, factors, comparables } = valuation

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
          <MapPin size={14} />
          <span>{property.address_full}</span>
        </div>
        <h1 className="font-cinzel text-4xl md:text-5xl font-bold text-white">
          Your Home Value Estimate
        </h1>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Estimate Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Big Estimate Card - Glass Card Style */}
          <div className="glass-card bg-white/5 rounded-[32px] p-8 md:p-10 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl" />

            <div className="relative">
              <p className="text-white/60 mb-2 text-lg">Estimated Value</p>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-5xl md:text-6xl font-bold text-gradient-gold price-display">
                  {formatCurrency(result.estimate)}
                </span>
              </div>

              {/* Range */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f]"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-white/60">
                  {formatConfidence(result.confidence)} confidence
                </span>
              </div>

              <div className="flex gap-8 text-sm">
                <div>
                  <p className="text-white/50">Low Estimate</p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(result.range_low)}
                  </p>
                </div>
                <div>
                  <p className="text-white/50">High Estimate</p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(result.range_high)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="glass-card bg-white/5 rounded-[32px] p-6 md:p-8">
            <h2 className="font-cinzel text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Home size={20} className="text-[#d4af37]" />
              Property Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.beds && (
                <PropertyStat
                  icon={<BedDouble size={18} />}
                  label="Bedrooms"
                  value={property.beds.toString()}
                />
              )}
              {(property.baths_full || property.baths_half) && (
                <PropertyStat
                  icon={<Bath size={18} />}
                  label="Bathrooms"
                  value={`${(property.baths_full || 0) + (property.baths_half || 0) * 0.5}`}
                />
              )}
              {property.sqft_living && (
                <PropertyStat
                  icon={<Ruler size={18} />}
                  label="Sq. Ft."
                  value={property.sqft_living.toLocaleString()}
                />
              )}
              {property.year_built && (
                <PropertyStat
                  icon={<Calendar size={18} />}
                  label="Year Built"
                  value={property.year_built.toString()}
                />
              )}
              {property.property_type && (
                <PropertyStat
                  icon={<Building size={18} />}
                  label="Type"
                  value={property.property_type}
                />
              )}
            </div>
          </div>

          {/* Value Factors */}
          {factors.length > 0 && (
            <div className="glass-card bg-white/5 rounded-[32px] p-6 md:p-8">
              <h2 className="font-cinzel text-xl font-semibold text-white mb-4">
                What's Affecting Your Value
              </h2>
              <div className="space-y-3">
                {factors.map((factor, idx) => (
                  <FactorRow key={idx} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* Comparables */}
          {comparables.length > 0 && (
            <div className="glass-card bg-white/5 rounded-[32px] p-6 md:p-8">
              <h2 className="font-cinzel text-xl font-semibold text-white mb-4">
                Recent Sales Near You
              </h2>
              <div className="space-y-4">
                {comparables.map((comp) => (
                  <ComparableCard key={comp.id} comp={comp} />
                ))}
              </div>
              <p className="text-xs text-white/40 mt-4">
                Based on {comparables.length} comparable sales within 1 mile in the last 6 months
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Seller Journey */}
        <div className="space-y-6">
          {/* Seller Journey Panel */}
          <div className="glass-card bg-white/5 rounded-[32px] p-6 md:p-8 border-[#d4af37]/20">
            {/* Progress Ring */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-20 h-20 flex-shrink-0">
                {/* Background circle */}
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="6"
                  />
                  {/* Progress arc - 5% = ~11.3 of 226 circumference */}
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="url(#goldGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="226"
                    strokeDashoffset="215"
                  />
                  <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d4af37" />
                      <stop offset="100%" stopColor="#f4d03f" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">5%</span>
                </div>
              </div>
              <div>
                <p className="text-white/50 text-sm">of your seller plan</p>
                <p className="text-white font-semibold">is complete</p>
              </div>
            </div>

            {/* Motivational text */}
            <p className="text-white/80 text-lg mb-6 leading-relaxed">
              You've got your number. Now turn it into a clean exit plan.
            </p>

            {/* 6 Steps */}
            <div className="space-y-3 mb-6">
              <JourneyStep
                icon={<TrendingUp size={18} />}
                title="Instant Value"
                subtitle="Where you are now"
                status="complete"
              />
              <JourneyStep
                icon={<DollarSign size={18} />}
                title="Net Sheet & Payout"
                subtitle="See your cash at closing"
                status="locked"
              />
              <JourneyStep
                icon={<Target size={18} />}
                title="Pricing Gameplan"
                subtitle="Pick your list price strategy"
                status="locked"
              />
              <JourneyStep
                icon={<Megaphone size={18} />}
                title="Marketing Blueprint"
                subtitle="Photos, video, 3D, ads"
                status="locked"
              />
              <JourneyStep
                icon={<FileSignature size={18} />}
                title="Paperwork & E-Sign"
                subtitle="We prep the docs for you"
                status="locked"
              />
              <JourneyStep
                icon={<Rocket size={18} />}
                title="Launch & Updates"
                subtitle="Weekly reports on showings"
                status="locked"
              />
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(`/list/${valuation.id}`, { state: { valuation } })}
              className="w-full btn-gold py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 pulse-gold"
            >
              Enter Seller Portal
              <ArrowRight size={20} />
            </button>

            <p className="text-center text-white/40 text-xs mt-3">
              Free account. No obligation.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="glass-card bg-white/5 rounded-[32px] p-4">
            <div className="flex gap-2">
              <button className="flex-1 py-3 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
                <Download size={16} />
                Download PDF
              </button>
              <button className="flex-1 py-3 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-white/40 px-2">
            <p>
              This estimate is based on recent sales data and is not an appraisal.
              For an official valuation, consult a licensed appraiser. Model version: {valuation.model_version}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PropertyStat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
      <div className="text-white/60">{icon}</div>
      <div>
        <p className="text-xs text-white/50">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  )
}

function FactorRow({ factor }: { factor: ValuationFactor }) {
  const isPositive = factor.direction === 'positive'

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-3">
        {isPositive ? (
          <TrendingUp size={18} className="text-green-400" />
        ) : (
          <TrendingDown size={18} className="text-red-400" />
        )}
        <span className="text-white/80">{factor.explanation}</span>
      </div>
      <span className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{formatCurrency(factor.impact)}
      </span>
    </div>
  )
}

function ComparableCard({ comp }: { comp: ComparableSale }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group">
      <div className="flex-1">
        <p className="text-white font-medium mb-1">{comp.address}</p>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <span>{formatDate(comp.sale_date)}</span>
          {comp.beds && <span>{comp.beds} bed</span>}
          {comp.sqft && <span>{comp.sqft.toLocaleString()} sqft</span>}
          <span>{formatDistance(comp.distance_miles)}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-semibold text-white">
          {formatCurrency(comp.sale_price)}
        </p>
        <p className="text-xs text-white/50">
          {Math.round(comp.match_score * 100)}% match
        </p>
      </div>
      <ChevronRight size={20} className="text-white/40 ml-2 group-hover:text-white/60 transition-colors" />
    </div>
  )
}

function JourneyStep({
  icon,
  title,
  subtitle,
  status
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  status: 'complete' | 'next' | 'locked'
}) {
  const isComplete = status === 'complete'
  const isNext = status === 'next'

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isComplete
          ? 'bg-[#d4af37]/10 border-[#d4af37]/30'
          : isNext
          ? 'bg-white/10 border-[#d4af37]/50'
          : 'bg-white/5 border-white/10 opacity-60'
      }`}
    >
      {/* Icon container */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isComplete
            ? 'bg-[#d4af37]/20 text-[#d4af37]'
            : isNext
            ? 'bg-[#d4af37]/10 text-[#d4af37]'
            : 'bg-white/10 text-white/40'
        }`}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${isComplete || isNext ? 'text-white' : 'text-white/60'}`}>
          {title}
        </p>
        <p className={`text-xs ${isComplete ? 'text-white/60' : isNext ? 'text-[#d4af37]/80' : 'text-white/40'}`}>
          {isNext ? 'Up next' : subtitle}
        </p>
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        {isComplete ? (
          <div className="w-6 h-6 rounded-full bg-[#d4af37] flex items-center justify-center">
            <Check size={14} className="text-black" />
          </div>
        ) : isNext ? (
          <ChevronRight size={18} className="text-[#d4af37]" />
        ) : (
          <Lock size={16} className="text-white/30" />
        )}
      </div>
    </div>
  )
}
