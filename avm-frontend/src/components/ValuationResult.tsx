/**
 * Valuation result display - Shows teaser with lead gate
 */

import type { ValuationResponse, ComparableSale } from '../types/valuation';

interface ValuationResultProps {
  valuation: ValuationResponse;
  onUnlockReport: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ConfidenceBar({ score }: { score: number }) {
  const percentage = score * 100;
  const label =
    percentage >= 80 ? 'High' : percentage >= 60 ? 'Medium' : 'Low';
  const color =
    percentage >= 80
      ? 'bg-green-500'
      : percentage >= 60
      ? 'bg-yellow-500'
      : 'bg-orange-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
  );
}

function CompCard({ comp, index }: { comp: ComparableSale; index: number }) {
  // First comp is shown, rest are blurred (lead gate)
  const isBlurred = index > 0;

  return (
    <div
      className={`p-4 bg-gray-50 rounded-lg ${isBlurred ? 'blur-sm select-none' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-medium text-gray-900 truncate">{comp.address}</p>
          <p className="text-sm text-gray-500">
            {comp.distance_miles.toFixed(2)} mi away • Sold {formatDate(comp.sale_date)}
          </p>
        </div>
        <p className="text-lg font-bold text-gpr-gold-600">
          {formatCurrency(comp.sale_price)}
        </p>
      </div>
      <div className="flex gap-4 text-sm text-gray-600">
        <span>{comp.beds} bed</span>
        <span>{comp.baths} bath</span>
        <span>{comp.sqft.toLocaleString()} sqft</span>
        <span>{formatCurrency(comp.price_per_sqft)}/sqft</span>
      </div>
    </div>
  );
}

export function ValuationResult({ valuation, onUnlockReport }: ValuationResultProps) {
  const { property, valuation: result, comparables } = valuation;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main valuation card */}
      <div className="gpr-card mb-6">
        <div className="bg-gradient-to-r from-gpr-navy-900 to-gpr-navy-700 px-6 py-4">
          <p className="text-gpr-gold-300 text-sm font-medium">Estimated Value</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            {formatCurrency(result.estimated_value)}
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            Range: {formatCurrency(result.value_range_low)} -{' '}
            {formatCurrency(result.value_range_high)}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Property address */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Property</p>
            <p className="text-lg font-semibold text-gray-900">{property.address}</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gpr-navy-900">
                {formatCurrency(result.price_per_sqft)}
              </p>
              <p className="text-sm text-gray-500">Per Sqft</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gpr-navy-900">
                {property.beds || '—'}
              </p>
              <p className="text-sm text-gray-500">Beds</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gpr-navy-900">
                {property.baths_full || '—'}
              </p>
              <p className="text-sm text-gray-500">Baths</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gpr-navy-900">
                {property.sqft_living?.toLocaleString() || '—'}
              </p>
              <p className="text-sm text-gray-500">Sqft</p>
            </div>
          </div>

          {/* Confidence score */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Confidence Score</p>
            <ConfidenceBar score={result.confidence_score} />
          </div>
        </div>
      </div>

      {/* Comparables section - teaser */}
      <div className="gpr-card relative">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Comparable Sales ({comparables.length})
          </h3>

          <div className="space-y-3">
            {comparables.slice(0, 3).map((comp, index) => (
              <CompCard key={index} comp={comp} index={index} />
            ))}
          </div>

          {/* Overlay for locked content */}
          {comparables.length > 1 && (
            <div className="absolute inset-0 top-24 bg-gradient-to-t from-white via-white/95 to-transparent flex flex-col items-center justify-end pb-8 px-6">
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-gray-900">
                  Unlock Full Report
                </p>
                <p className="text-gray-600 text-sm">
                  See all {comparables.length} comparable sales, market trends, and
                  detailed analysis
                </p>
              </div>
              <button onClick={onUnlockReport} className="gpr-button-primary">
                Get Free Full Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center mt-4">
        Estimate generated {formatDate(valuation.generated_at)} • Model:{' '}
        {valuation.model_version}
      </p>
    </div>
  );
}
