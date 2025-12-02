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
  Building
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
          <p className="text-zinc-400">Loading your estimate...</p>
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
        <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
          <MapPin size={14} />
          <span>{property.address_full}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Your Home Value Estimate
        </h1>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Estimate Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Big Estimate Card */}
          <div className="card-dark p-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl" />

            <div className="relative">
              <p className="text-zinc-400 mb-2">Estimated Value</p>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-5xl md:text-6xl font-bold text-gradient-gold price-display">
                  {formatCurrency(result.estimate)}
                </span>
              </div>

              {/* Range */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f]"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-zinc-400">
                  {formatConfidence(result.confidence)} confidence
                </span>
              </div>

              <div className="flex gap-8 text-sm">
                <div>
                  <p className="text-zinc-500">Low Estimate</p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(result.range_low)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">High Estimate</p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(result.range_high)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="card-dark p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
            <div className="card-dark p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
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
            <div className="card-dark p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Recent Sales Near You
              </h2>
              <div className="space-y-4">
                {comparables.map((comp) => (
                  <ComparableCard key={comp.id} comp={comp} />
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Based on {comparables.length} comparable sales within 1 mile in the last 6 months
              </p>
            </div>
          )}
        </div>

        {/* Right Column - CTA */}
        <div className="space-y-6">
          {/* Main CTA Card */}
          <div className="card-dark p-6 border-[#d4af37]/30 bg-gradient-to-b from-zinc-900 to-zinc-900/50">
            <h2 className="text-xl font-bold text-white mb-2">
              Ready To Turn This Into a Real Listing?
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Configure your marketing plan, sign online, and let us handle the rest.
            </p>

            <ul className="space-y-3 mb-6">
              <CTABullet text="Professional photos and 3D tour available" />
              <CTABullet text="Pricing strategy based on 514K+ Vegas sales" />
              <CTABullet text="Full listing paperwork handled online" />
            </ul>

            <button
              onClick={() => navigate(`/list/${valuation.id}`, { state: { valuation } })}
              className="w-full btn-gold py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 pulse-gold"
            >
              List This Home Now
              <ArrowRight size={20} />
            </button>

            <button className="w-full mt-3 py-3 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors">
              Just send me the full report
            </button>
          </div>

          {/* Quick Actions */}
          <div className="card-dark p-4">
            <div className="flex gap-2">
              <button className="flex-1 py-3 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                <Download size={16} />
                Download PDF
              </button>
              <button className="flex-1 py-3 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-zinc-600 px-2">
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
    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
      <div className="text-zinc-400">{icon}</div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  )
}

function FactorRow({ factor }: { factor: ValuationFactor }) {
  const isPositive = factor.direction === 'positive'

  return (
    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
      <div className="flex items-center gap-3">
        {isPositive ? (
          <TrendingUp size={18} className="text-green-400" />
        ) : (
          <TrendingDown size={18} className="text-red-400" />
        )}
        <span className="text-zinc-300">{factor.explanation}</span>
      </div>
      <span className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{formatCurrency(factor.impact)}
      </span>
    </div>
  )
}

function ComparableCard({ comp }: { comp: ComparableSale }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors group">
      <div className="flex-1">
        <p className="text-white font-medium mb-1">{comp.address}</p>
        <div className="flex items-center gap-4 text-sm text-zinc-500">
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
        <p className="text-xs text-zinc-500">
          {Math.round(comp.match_score * 100)}% match
        </p>
      </div>
      <ChevronRight size={20} className="text-zinc-600 ml-2 group-hover:text-zinc-400 transition-colors" />
    </div>
  )
}

function CTABullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-zinc-300">
      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-2 flex-shrink-0" />
      {text}
    </li>
  )
}
