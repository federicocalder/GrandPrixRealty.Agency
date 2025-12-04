import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Video,
  Rotate3d,
  Plane,
  Sun,
  Megaphone,
  Lock,
  Clock,
  Home,
  DollarSign,
  Phone,
  Check,
  MapPin,
  Calculator
} from 'lucide-react'
import { formatCurrency } from '../lib/api'
import type { ValuationResponse, MediaOptions, ListingStrategy, PricingStrategy } from '../types'

export default function ListingConfigPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { valuationId } = useParams()
  const valuation: ValuationResponse | undefined = location.state?.valuation

  // Form state
  const [mediaOptions, setMediaOptions] = useState<MediaOptions>({
    pro_photos: true,
    twilight_photos: false,
    drone_photos: false,
    video_tour: false,
    virtual_tour_3d: true,
  })

  const [listingStrategy, setListingStrategy] = useState<ListingStrategy>({
    type: 'maximum_exposure',
    open_house: true,
    coming_soon_days: 7,
  })

  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>({
    approach: 'avm_match',
    request_pricing_call: false,
  })

  if (!valuation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Please start with a home value estimate</p>
          <button
            onClick={() => window.location.href = '/homeseller'}
            className="btn-gold px-6 py-3 rounded-xl"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  const { property, valuation: result } = valuation


  const handleContinue = () => {
    // TODO: Save listing intake and proceed to account creation / e-sign
    console.log('Listing configuration:', {
      valuation_id: valuationId,
      property,
      media_options: mediaOptions,
      listing_strategy: listingStrategy,
      pricing_strategy: pricingStrategy,
    })
    alert('Next step: Account creation & e-sign flow (coming soon!)')
  }

  // Calculate price based on strategy
  const getListPrice = () => {
    switch (pricingStrategy.approach) {
      case 'below_avm':
        return Math.round(result.estimate * 0.97)
      case 'above_avm':
        return Math.round(result.estimate * 1.03)
      case 'custom':
        return pricingStrategy.custom_price || result.estimate
      default:
        return result.estimate
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Estimate
      </button>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Configure Your Listing
        </h1>
        <p className="text-zinc-400 flex items-center gap-2">
          <MapPin size={16} />
          {property.address_full}
        </p>
      </div>

      {/* Big Seller Net Sheet Card */}
      <div className="mb-10">
        <div
          className="relative overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 via-zinc-900/50 to-zinc-900/80 p-8 cursor-pointer hover:border-[#d4af37]/50 transition-all group"
          onClick={() => navigate(`/net-sheet/${valuationId}`, { state: { valuation } })}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left side - Icon and title */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/20 flex items-center justify-center">
                <Calculator size={32} className="text-[#d4af37]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Calculate Your Net</h2>
                <p className="text-zinc-400">How much will you actually walk away with?</p>
              </div>
            </div>

            {/* Center - Mystery amount to entice click */}
            <div className="text-center md:text-right">
              <p className="text-sm text-zinc-500 uppercase tracking-wide mb-1">Your Seller Net</p>
              <div className="flex items-center gap-2 justify-center md:justify-end">
                <DollarSign size={28} className="text-[#d4af37]" />
                <span className="text-5xl font-bold text-[#d4af37] tracking-wider">???????</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Click to calculate your cash at closing</p>
            </div>

            {/* Right side - CTA */}
            <button className="btn-gold px-6 py-3 rounded-xl font-semibold flex items-center gap-2 group-hover:scale-105 transition-transform">
              Calculate Now
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Media Options */}
          <section className="card-dark p-6">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <Camera size={22} className="text-[#d4af37]" />
              Photography & Media
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              Choose what visual content we'll create for your listing.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <MediaOption
                icon={<Camera size={20} />}
                title="Pro Photos"
                description="HDR professional photography"
                checked={mediaOptions.pro_photos}
                onChange={(checked) => setMediaOptions({ ...mediaOptions, pro_photos: checked })}
                required
              />
              <MediaOption
                icon={<Sun size={20} />}
                title="Twilight Photos"
                description="Stunning dusk/evening shots"
                checked={mediaOptions.twilight_photos}
                onChange={(checked) => setMediaOptions({ ...mediaOptions, twilight_photos: checked })}
              />
              <MediaOption
                icon={<Rotate3d size={20} />}
                title="3D Virtual Tour"
                description="Interactive walkthrough"
                checked={mediaOptions.virtual_tour_3d}
                onChange={(checked) => setMediaOptions({ ...mediaOptions, virtual_tour_3d: checked })}
              />
              <MediaOption
                icon={<Plane size={20} />}
                title="Drone Photos"
                description="Aerial views of property"
                checked={mediaOptions.drone_photos}
                onChange={(checked) => setMediaOptions({ ...mediaOptions, drone_photos: checked })}
              />
              <MediaOption
                icon={<Video size={20} />}
                title="Video Tour"
                description="Professional video walkthrough"
                checked={mediaOptions.video_tour}
                onChange={(checked) => setMediaOptions({ ...mediaOptions, video_tour: checked })}
              />
            </div>
          </section>

          {/* Section 2: Listing Strategy */}
          <section className="card-dark p-6">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <Megaphone size={22} className="text-[#d4af37]" />
              Listing Strategy
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              How do you want to market your property?
            </p>

            <div className="space-y-3 mb-6">
              <StrategyOption
                icon={<Megaphone size={18} />}
                title="Maximum Exposure"
                description="MLS + Zillow + Redfin + Social ads - reach the most buyers"
                selected={listingStrategy.type === 'maximum_exposure'}
                onClick={() => setListingStrategy({ ...listingStrategy, type: 'maximum_exposure' })}
              />
              <StrategyOption
                icon={<Lock size={18} />}
                title="Quiet Launch"
                description="Private marketing first, then public if needed"
                selected={listingStrategy.type === 'quiet_launch'}
                onClick={() => setListingStrategy({ ...listingStrategy, type: 'quiet_launch' })}
              />
              <StrategyOption
                icon={<Clock size={18} />}
                title="Coming Soon"
                description="Build anticipation before going live on MLS"
                selected={listingStrategy.type === 'coming_soon'}
                onClick={() => setListingStrategy({ ...listingStrategy, type: 'coming_soon' })}
              />
            </div>

            {listingStrategy.type === 'coming_soon' && (
              <div className="mb-6 pl-4 border-l-2 border-zinc-700">
                <label className="text-sm text-zinc-400 mb-2 block">
                  Coming Soon period (days)
                </label>
                <select
                  value={listingStrategy.coming_soon_days}
                  onChange={(e) => setListingStrategy({
                    ...listingStrategy,
                    coming_soon_days: parseInt(e.target.value)
                  })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={21}>21 days</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={listingStrategy.open_house}
                onChange={(e) => setListingStrategy({ ...listingStrategy, open_house: e.target.checked })}
                className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-[#d4af37] focus:ring-[#d4af37]"
              />
              <div>
                <span className="text-white font-medium">Include Open House Campaign</span>
                <p className="text-sm text-zinc-500">We'll organize and market open houses for you</p>
              </div>
            </label>
          </section>

          {/* Section 3: Pricing Strategy */}
          <section className="card-dark p-6">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <DollarSign size={22} className="text-[#d4af37]" />
              Pricing Approach
            </h2>
            <p className="text-zinc-500 text-sm mb-6">
              Your estimate is <span className="text-white font-semibold">{formatCurrency(result.estimate)}</span>. How do you want to price?
            </p>

            <div className="space-y-3 mb-6">
              <PricingOption
                title={`Price at AVM estimate: ${formatCurrency(result.estimate)}`}
                description="Data-driven price based on market analysis"
                selected={pricingStrategy.approach === 'avm_match'}
                onClick={() => setPricingStrategy({ ...pricingStrategy, approach: 'avm_match' })}
              />
              <PricingOption
                title={`Price slightly below: ${formatCurrency(Math.round(result.estimate * 0.97))}`}
                description="Attract multiple offers and create competition"
                selected={pricingStrategy.approach === 'below_avm'}
                onClick={() => setPricingStrategy({ ...pricingStrategy, approach: 'below_avm' })}
              />
              <PricingOption
                title={`Price slightly above: ${formatCurrency(Math.round(result.estimate * 1.03))}`}
                description="Test the market, room to negotiate"
                selected={pricingStrategy.approach === 'above_avm'}
                onClick={() => setPricingStrategy({ ...pricingStrategy, approach: 'above_avm' })}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pricingStrategy.request_pricing_call}
                onChange={(e) => setPricingStrategy({
                  ...pricingStrategy,
                  request_pricing_call: e.target.checked
                })}
                className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-[#d4af37] focus:ring-[#d4af37]"
              />
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-zinc-400" />
                <span className="text-white">Schedule a quick pricing call before we publish</span>
              </div>
            </label>
          </section>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <div className="card-dark p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-white mb-4">Your Listing Summary</h3>

            {/* Property snapshot */}
            <div className="p-4 bg-zinc-800/50 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Home size={16} className="text-zinc-400" />
                <span className="text-sm text-zinc-400">Property</span>
              </div>
              <p className="text-white font-medium text-sm">{property.address_full}</p>
              <p className="text-zinc-500 text-sm">
                {property.beds} bed • {(property.baths_full || 0) + (property.baths_half || 0) * 0.5} bath • {property.sqft_living?.toLocaleString()} sqft
              </p>
            </div>

            {/* Selected options */}
            <div className="space-y-3 mb-6">
              <SummaryItem
                label="List Price"
                value={formatCurrency(getListPrice())}
                highlight
              />
              <SummaryItem
                label="Media Package"
                value={[
                  mediaOptions.pro_photos && 'Photos',
                  mediaOptions.virtual_tour_3d && '3D Tour',
                  mediaOptions.drone_photos && 'Drone',
                  mediaOptions.video_tour && 'Video',
                  mediaOptions.twilight_photos && 'Twilight',
                ].filter(Boolean).join(', ')}
              />
              <SummaryItem
                label="Strategy"
                value={
                  listingStrategy.type === 'maximum_exposure' ? 'Maximum Exposure' :
                  listingStrategy.type === 'quiet_launch' ? 'Quiet Launch' :
                  `Coming Soon (${listingStrategy.coming_soon_days} days)`
                }
              />
              {listingStrategy.open_house && (
                <SummaryItem label="Open House" value="Included" />
              )}
            </div>

            {/* Timeline */}
            <div className="p-4 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg mb-6">
              <p className="text-sm text-[#d4af37] font-medium">Estimated Timeline</p>
              <p className="text-xs text-zinc-400 mt-1">
                We can be live on the market in 5-7 days after photos are complete.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleContinue}
              className="w-full btn-gold py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight size={20} />
            </button>
            <p className="text-xs text-zinc-500 text-center mt-3">
              Next: Set up your account & sign listing agreement
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaOption({
  icon,
  title,
  description,
  checked,
  onChange,
  required = false
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
}) {
  return (
    <label
      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
        checked
          ? 'bg-[#d4af37]/10 border-[#d4af37]/50'
          : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-600'
      } ${required ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !required && onChange(e.target.checked)}
        disabled={required}
        className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-[#d4af37] focus:ring-[#d4af37]"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={checked ? 'text-[#d4af37]' : 'text-zinc-400'}>{icon}</span>
          <span className="text-white font-medium">{title}</span>
          {required && (
            <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded text-zinc-400">Required</span>
          )}
        </div>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </label>
  )
}

function StrategyOption({
  icon,
  title,
  description,
  selected,
  onClick
}: {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
        selected
          ? 'bg-[#d4af37]/10 border-[#d4af37]/50'
          : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        selected ? 'border-[#d4af37] bg-[#d4af37]' : 'border-zinc-600'
      }`}>
        {selected && <Check size={12} className="text-black" />}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={selected ? 'text-[#d4af37]' : 'text-zinc-400'}>{icon}</span>
          <span className="text-white font-medium">{title}</span>
        </div>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </button>
  )
}

function PricingOption({
  title,
  description,
  selected,
  onClick
}: {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
        selected
          ? 'bg-[#d4af37]/10 border-[#d4af37]/50'
          : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        selected ? 'border-[#d4af37] bg-[#d4af37]' : 'border-zinc-600'
      }`}>
        {selected && <Check size={12} className="text-black" />}
      </div>
      <div>
        <span className="text-white font-medium">{title}</span>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </button>
  )
}

function SummaryItem({
  label,
  value,
  highlight = false
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span className={highlight ? 'text-[#d4af37] font-semibold' : 'text-white text-sm'}>
        {value}
      </span>
    </div>
  )
}
