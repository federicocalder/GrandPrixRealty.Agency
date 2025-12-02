/// <reference types="@types/google.maps" />
import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'

interface AddressInputProps {
  onAddressSelect: (address: string, placeId?: string) => void
  isLoading?: boolean
  placeholder?: string
}

export default function AddressInput({
  onAddressSelect,
  isLoading = false,
  placeholder = "Enter your property address..."
}: AddressInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true)
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      return
    }

    // Create script element
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      setIsGoogleLoaded(true)
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [])

  // Handle input change and fetch predictions
  const handleInputChange = (value: string) => {
    setInputValue(value)

    if (!autocompleteService.current || value.length < 3) {
      setPredictions([])
      setShowPredictions(false)
      return
    }

    // Fetch predictions from Google Places
    autocompleteService.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'us' },
        types: ['address'],
        // Bias towards Las Vegas area
        locationBias: {
          center: { lat: 36.1699, lng: -115.1398 },
          radius: 80467, // 50 miles in meters
        } as google.maps.LocationBias,
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results)
          setShowPredictions(true)
        } else {
          setPredictions([])
          setShowPredictions(false)
        }
      }
    )
  }

  // Handle prediction selection
  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    setInputValue(prediction.description)
    setPredictions([])
    setShowPredictions(false)
    onAddressSelect(prediction.description, prediction.place_id)
  }

  // Handle form submit (if user presses enter without selecting)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setShowPredictions(false)
      onAddressSelect(inputValue)
    }
  }

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPredictions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <MapPin size={20} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => predictions.length > 0 && setShowPredictions(true)}
            placeholder={isGoogleLoaded ? placeholder : "Loading..."}
            disabled={!isGoogleLoaded || isLoading}
            className="w-full pl-12 pr-32 py-4 bg-zinc-900/80 border border-zinc-700 rounded-2xl text-white text-lg placeholder:text-zinc-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-gold px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span className="hidden sm:inline">Analyzing...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span className="hidden sm:inline">Get Estimate</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Predictions dropdown */}
      {showPredictions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
            >
              <MapPin size={18} className="text-[#d4af37] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-zinc-500 text-sm">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
