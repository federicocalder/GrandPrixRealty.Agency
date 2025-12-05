import { useState, useEffect, useRef, useCallback } from 'react';
import { GEOGRAPHIC_CONFIG, PROPERTY_TYPES } from '../config/geography';
import { FILTER_INFO } from '../types/filters';

// Filter state interface
export interface FilterState {
  // Basic
  city: string;
  minPrice: string;
  maxPrice: string;
  beds: number | null;
  baths: number | null;

  // Property
  propertyType: string[];
  minSqft: string;
  stories: number | null;
  garageSpaces: number | null;

  // Amenities
  hasPool: boolean | null;
  hasHOA: boolean | null;

  // Market
  yearBuiltMin: string;
  daysOnMarketMax: string;
  minLotSize: string;

  // More Filters
  isShortSale: boolean;
  isREO: boolean;
  isForeclosure: boolean;
  isAgeRestricted: boolean;
  financingConsidered: boolean;
  maxAssociationFee: string;
  attachedDetached: 'Attached' | 'Detached' | null;
}

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: () => void;
}

// Info tooltip component
const InfoTooltip = ({ filterKey }: { filterKey: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const info = FILTER_INFO[filterKey];

  if (!info) return null;

  return (
    <div className="relative inline-block ml-2">
      <button
        type="button"
        className="w-5 h-5 rounded-full border border-[#d4d2ce] text-[#999] text-[10px] font-medium flex items-center justify-center hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
      >
        i
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-[#1a1a1a] text-white text-sm rounded-xl shadow-2xl">
          <div className="font-cinzel font-medium mb-1.5 text-[#f8f7f4]">{info.label}</div>
          <p className="text-[#a0a0a0] text-xs leading-relaxed font-light">{info.description}</p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-[#1a1a1a]"></div>
        </div>
      )}
    </div>
  );
};

// Premium Selection Card component
interface SelectionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SelectionCard = ({
  label,
  selected,
  onClick,
  size = 'md',
}: SelectionCardProps) => {
  const sizeClasses = {
    sm: 'px-5 py-3 text-sm',
    md: 'px-6 py-4 text-base',
    lg: 'px-8 py-5 text-lg',
  };

  return (
    <button
      type="button"
      className={`
        relative overflow-hidden rounded-xl font-medium transition-all duration-300
        cursor-pointer select-none tracking-wide
        ${sizeClasses[size]}
        ${selected
          ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-lg ring-1 ring-[#1a1a1a]'
          : 'bg-[#f8f7f4] text-[#4a4a4a] border border-[#e5e3df] hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
        }
      `}
      onClick={onClick}
    >
      <span className="relative z-10">{label}</span>
    </button>
  );
};

// Premium Dual Range Slider for Price
interface DualRangeSliderProps {
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (min: number, max: number) => void;
}

const DualRangeSlider = ({
  minValue,
  maxValue,
  min,
  max,
  step,
  onChange,
}: DualRangeSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);

  // Use refs to avoid stale closure issues during drag
  const onChangeRef = useRef(onChange);
  const minValueRef = useRef(minValue);
  const maxValueRef = useRef(maxValue);

  // Keep refs updated
  useEffect(() => {
    onChangeRef.current = onChange;
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [onChange, minValue, maxValue]);

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const getValueFromPosition = useCallback((clientX: number) => {
    if (!sliderRef.current) return min;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = (percentage / 100) * (max - min) + min;
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleTouchStart = (type: 'min' | 'max') => (_e: React.TouchEvent) => {
    setIsDragging(type);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newValue = getValueFromPosition(e.clientX);

      if (isDragging === 'min') {
        onChangeRef.current(Math.min(newValue, maxValueRef.current - step), maxValueRef.current);
      } else {
        onChangeRef.current(minValueRef.current, Math.max(newValue, minValueRef.current + step));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      const newValue = getValueFromPosition(e.touches[0].clientX);

      if (isDragging === 'min') {
        onChangeRef.current(Math.min(newValue, maxValueRef.current - step), maxValueRef.current);
      } else {
        onChangeRef.current(minValueRef.current, Math.max(newValue, minValueRef.current + step));
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, step, getValueFromPosition]);

  const minPercent = getPercentage(minValue);
  const maxPercent = getPercentage(maxValue);

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="pt-4 pb-2">
      {/* Live price display */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <div className="text-xs text-[#999] uppercase tracking-widest mb-1 font-light">Minimum</div>
          <div className="font-cinzel text-2xl text-[#1a1a1a] font-semibold">{formatPrice(minValue)}</div>
        </div>
        <div className="w-12 h-px bg-[#e5e3df]"></div>
        <div className="text-center">
          <div className="text-xs text-[#999] uppercase tracking-widest mb-1 font-light">Maximum</div>
          <div className="font-cinzel text-2xl text-[#1a1a1a] font-semibold">
            {maxValue >= max ? `$${(max / 1000000).toFixed(0)}M+` : formatPrice(maxValue)}
          </div>
        </div>
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className="relative h-2 bg-[#e5e3df] rounded-full cursor-pointer"
      >
        {/* Active range */}
        <div
          className="absolute h-full bg-[#1a1a1a] rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white border-[3px] border-[#1a1a1a] rounded-full cursor-grab shadow-lg transition-transform ${isDragging === 'min' ? 'scale-110 cursor-grabbing' : 'hover:scale-105'}`}
          style={{ left: `${minPercent}%`, transform: 'translate(-50%, -50%)' }}
          onMouseDown={handleMouseDown('min')}
          onTouchStart={handleTouchStart('min')}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
          </div>
        </div>

        {/* Max handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white border-[3px] border-[#1a1a1a] rounded-full cursor-grab shadow-lg transition-transform ${isDragging === 'max' ? 'scale-110 cursor-grabbing' : 'hover:scale-105'}`}
          style={{ left: `${maxPercent}%`, transform: 'translate(-50%, -50%)' }}
          onMouseDown={handleMouseDown('max')}
          onTouchStart={handleTouchStart('max')}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Scale markers */}
      <div className="flex justify-between mt-3 px-1">
        {['$0', '$500K', '$1M', '$1.5M', '$2M+'].map((label, i) => (
          <span key={i} className="text-[10px] text-[#999] font-light">{label}</span>
        ))}
      </div>
    </div>
  );
};

// Premium Toggle Switch
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  filterKey?: string;
}

const ToggleSwitch = ({ checked, onChange, label, filterKey }: ToggleSwitchProps) => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#f0efec] last:border-0">
      <div className="flex items-center">
        <span className="text-[#1a1a1a] font-medium tracking-wide">{label}</span>
        {filterKey && <InfoTooltip filterKey={filterKey} />}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
          checked ? 'bg-[#1a1a1a]' : 'bg-[#e5e3df]'
        }`}
      >
        <span
          className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
};

// Premium Numeric Stepper
interface NumericStepperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix?: string;
  min?: number;
  step?: number;
}

const NumericStepper = ({
  value,
  onChange,
  placeholder,
  suffix = '',
  min = 0,
  step = 1000,
}: NumericStepperProps) => {
  const increment = () => {
    const current = parseInt(value) || 0;
    onChange(String(current + step));
  };

  const decrement = () => {
    const current = parseInt(value) || 0;
    const newValue = Math.max(min, current - step);
    onChange(newValue === 0 ? '' : String(newValue));
  };

  const displayValue = value ? `${parseInt(value).toLocaleString()}${suffix}` : '';

  return (
    <div className="flex items-center bg-[#f8f7f4] border border-[#e5e3df] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={decrement}
        className="px-5 py-4 text-[#999] hover:text-[#1a1a1a] hover:bg-[#f0efec] transition-colors text-xl font-light"
      >
        −
      </button>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '');
          onChange(raw);
        }}
        placeholder={placeholder}
        className="flex-1 px-2 py-4 bg-transparent text-center font-medium text-[#1a1a1a] placeholder-[#999] focus:outline-none min-w-[120px] tracking-wide"
      />
      <button
        type="button"
        onClick={increment}
        className="px-5 py-4 text-[#999] hover:text-[#1a1a1a] hover:bg-[#f0efec] transition-colors text-xl font-light"
      >
        +
      </button>
    </div>
  );
};

// Section Header component
const SectionHeader = ({ title, filterKey }: { title: string; filterKey?: string }) => (
  <div className="flex items-center mb-5">
    <h3 className="font-cinzel text-lg font-semibold text-[#1a1a1a] tracking-wide">{title}</h3>
    {filterKey && <InfoTooltip filterKey={filterKey} />}
  </div>
);

// Main FilterOverlay component
export const FilterOverlay = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onSearch,
}: FilterOverlayProps) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Helper to update a single filter
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Toggle property type in array
  const togglePropertyType = (type: string) => {
    const current = filters.propertyType || [];
    if (current.includes(type)) {
      updateFilter('propertyType', current.filter((t) => t !== type));
    } else {
      updateFilter('propertyType', [...current, type]);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    onFiltersChange({
      city: '',
      minPrice: '',
      maxPrice: '',
      beds: null,
      baths: null,
      propertyType: [],
      minSqft: '',
      stories: null,
      garageSpaces: null,
      hasPool: null,
      hasHOA: null,
      yearBuiltMin: '',
      daysOnMarketMax: '',
      minLotSize: '',
      isShortSale: false,
      isREO: false,
      isForeclosure: false,
      isAgeRestricted: false,
      financingConsidered: false,
      maxAssociationFee: '',
      attachedDetached: null,
    });
  };

  // Count active filters
  const activeFilterCount = [
    filters.city,
    filters.minPrice,
    filters.maxPrice,
    filters.beds,
    filters.baths,
    filters.propertyType?.length,
    filters.minSqft,
    filters.stories,
    filters.garageSpaces,
    filters.hasPool !== null,
    filters.hasHOA !== null,
    filters.yearBuiltMin,
    filters.daysOnMarketMax,
    filters.minLotSize,
    filters.isShortSale,
    filters.isREO,
    filters.isForeclosure,
    filters.isAgeRestricted,
    filters.financingConsidered,
    filters.maxAssociationFee,
    filters.attachedDetached,
  ].filter(Boolean).length;

  // Price slider values
  const minPrice = parseInt(filters.minPrice) || 0;
  const maxPrice = parseInt(filters.maxPrice) || 2000000;

  const handlePriceChange = (min: number, max: number) => {
    // Update both price filters at once to avoid stale state issues
    onFiltersChange({
      ...filters,
      minPrice: min === 0 ? '' : String(min),
      maxPrice: max >= 2000000 ? '' : String(max),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#f8f7f4] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-[#f8f7f4]/95 backdrop-blur-lg border-b border-[#e5e3df] z-10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-[#999] hover:text-[#1a1a1a] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="font-cinzel text-xl font-semibold text-[#1a1a1a] tracking-wide">Search Filters</h2>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-[#999] hover:text-[#1a1a1a] transition-colors tracking-wide"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-160px)] pb-32">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-12">

          {/* Location */}
          <section>
            <SectionHeader title="Location" filterKey="city" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SelectionCard
                label="All Cities"
                selected={!filters.city}
                onClick={() => updateFilter('city', '')}
                size="md"
              />
              {GEOGRAPHIC_CONFIG.metroAreaCities.map((city) => (
                <SelectionCard
                  key={city.value}
                  label={city.label}
                  selected={filters.city === city.value}
                  onClick={() => updateFilter('city', city.value)}
                  size="md"
                />
              ))}
            </div>
          </section>

          {/* Price Range with Dual Slider */}
          <section>
            <SectionHeader title="Price Range" filterKey="price" />
            <div className="bg-white rounded-2xl p-6 border border-[#e5e3df]">
              <DualRangeSlider
                minValue={minPrice}
                maxValue={maxPrice || 2000000}
                min={0}
                max={2000000}
                step={25000}
                onChange={handlePriceChange}
              />

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[#f0efec]">
                {[
                  { label: 'Under $300K', min: 0, max: 300000 },
                  { label: '$300K – $500K', min: 300000, max: 500000 },
                  { label: '$500K – $750K', min: 500000, max: 750000 },
                  { label: '$750K – $1M', min: 750000, max: 1000000 },
                  { label: '$1M+', min: 1000000, max: 2000000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePriceChange(preset.min, preset.max)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all tracking-wide ${
                      minPrice === preset.min && (maxPrice === preset.max || (!filters.maxPrice && preset.max === 2000000))
                        ? 'bg-[#1a1a1a] text-[#f8f7f4]'
                        : 'bg-[#f8f7f4] text-[#6b6b6b] hover:text-[#1a1a1a] border border-[#e5e3df]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Property Type */}
          <section>
            <SectionHeader title="Property Type" filterKey="propertyType" />
            <div className="grid grid-cols-3 gap-4">
              {PROPERTY_TYPES.map((type) => (
                <SelectionCard
                  key={type.value}
                  label={type.label}
                  selected={filters.propertyType?.includes(type.value) || false}
                  onClick={() => togglePropertyType(type.value)}
                  size="lg"
                />
              ))}
            </div>
          </section>

          {/* Bedrooms */}
          <section>
            <SectionHeader title="Bedrooms" filterKey="beds" />
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Any', value: null },
                { label: '1+', value: 1 },
                { label: '2+', value: 2 },
                { label: '3+', value: 3 },
                { label: '4+', value: 4 },
                { label: '5+', value: 5 },
              ].map((option) => (
                <SelectionCard
                  key={option.label}
                  label={option.label}
                  selected={filters.beds === option.value}
                  onClick={() => updateFilter('beds', option.value)}
                  size="sm"
                />
              ))}
            </div>
          </section>

          {/* Bathrooms */}
          <section>
            <SectionHeader title="Bathrooms" filterKey="baths" />
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Any', value: null },
                { label: '1+', value: 1 },
                { label: '2+', value: 2 },
                { label: '3+', value: 3 },
                { label: '4+', value: 4 },
              ].map((option) => (
                <SelectionCard
                  key={option.label}
                  label={option.label}
                  selected={filters.baths === option.value}
                  onClick={() => updateFilter('baths', option.value)}
                  size="sm"
                />
              ))}
            </div>
          </section>

          {/* Square Feet */}
          <section>
            <SectionHeader title="Square Feet" filterKey="sqft" />
            <NumericStepper
              value={filters.minSqft}
              onChange={(v) => updateFilter('minSqft', v)}
              placeholder="Minimum sq ft"
              suffix=" sq ft"
              step={250}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {['1,000', '1,500', '2,000', '2,500', '3,000'].map((sqft) => {
                const value = sqft.replace(',', '');
                return (
                  <button
                    key={sqft}
                    type="button"
                    onClick={() => updateFilter('minSqft', value)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all tracking-wide ${
                      filters.minSqft === value
                        ? 'bg-[#1a1a1a] text-[#f8f7f4]'
                        : 'bg-[#f8f7f4] text-[#6b6b6b] hover:text-[#1a1a1a] border border-[#e5e3df]'
                    }`}
                  >
                    {sqft}+ sq ft
                  </button>
                );
              })}
            </div>
          </section>

          {/* Pool */}
          <section>
            <SectionHeader title="Pool" filterKey="pool" />
            <div className="flex gap-3">
              <SelectionCard
                label="Any"
                selected={filters.hasPool === null}
                onClick={() => updateFilter('hasPool', null)}
                size="md"
              />
              <SelectionCard
                label="Must Have Pool"
                selected={filters.hasPool === true}
                onClick={() => updateFilter('hasPool', true)}
                size="md"
              />
              <SelectionCard
                label="No Pool"
                selected={filters.hasPool === false}
                onClick={() => updateFilter('hasPool', false)}
                size="md"
              />
            </div>
          </section>

          {/* Garage */}
          <section>
            <SectionHeader title="Garage Spaces" filterKey="garageSpaces" />
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Any', value: null },
                { label: '1+', value: 1 },
                { label: '2+', value: 2 },
                { label: '3+', value: 3 },
              ].map((option) => (
                <SelectionCard
                  key={option.label}
                  label={option.label}
                  selected={filters.garageSpaces === option.value}
                  onClick={() => updateFilter('garageSpaces', option.value)}
                  size="sm"
                />
              ))}
            </div>
          </section>

          {/* HOA */}
          <section>
            <SectionHeader title="HOA" filterKey="hoa" />
            <div className="flex gap-3">
              <SelectionCard
                label="Any"
                selected={filters.hasHOA === null}
                onClick={() => updateFilter('hasHOA', null)}
                size="md"
              />
              <SelectionCard
                label="With HOA"
                selected={filters.hasHOA === true}
                onClick={() => updateFilter('hasHOA', true)}
                size="md"
              />
              <SelectionCard
                label="No HOA"
                selected={filters.hasHOA === false}
                onClick={() => updateFilter('hasHOA', false)}
                size="md"
              />
            </div>
          </section>

          {/* Year Built */}
          <section>
            <SectionHeader title="Year Built" filterKey="yearBuilt" />
            <NumericStepper
              value={filters.yearBuiltMin}
              onChange={(v) => updateFilter('yearBuiltMin', v)}
              placeholder="Built after year"
              step={5}
              min={1900}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {['2020', '2015', '2010', '2000', '1990'].map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => updateFilter('yearBuiltMin', year)}
                  className={`px-4 py-2 text-sm rounded-lg transition-all tracking-wide ${
                    filters.yearBuiltMin === year
                      ? 'bg-[#1a1a1a] text-[#f8f7f4]'
                      : 'bg-[#f8f7f4] text-[#6b6b6b] hover:text-[#1a1a1a] border border-[#e5e3df]'
                  }`}
                >
                  {year}+
                </button>
              ))}
            </div>
          </section>

          {/* Stories */}
          <section>
            <SectionHeader title="Stories" filterKey="stories" />
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Any', value: null },
                { label: '1 Story', value: 1 },
                { label: '2 Stories', value: 2 },
                { label: '3+ Stories', value: 3 },
              ].map((option) => (
                <SelectionCard
                  key={option.label}
                  label={option.label}
                  selected={filters.stories === option.value}
                  onClick={() => updateFilter('stories', option.value)}
                  size="md"
                />
              ))}
            </div>
          </section>

          {/* Lot Size */}
          <section>
            <SectionHeader title="Lot Size" filterKey="lotSize" />
            <NumericStepper
              value={filters.minLotSize}
              onChange={(v) => updateFilter('minLotSize', v)}
              placeholder="Minimum lot sq ft"
              suffix=" sq ft"
              step={1000}
            />
          </section>

          {/* Days on Market */}
          <section>
            <SectionHeader title="Days on Market" filterKey="daysOnMarket" />
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Any', value: '' },
                { label: '≤ 7 days', value: '7' },
                { label: '≤ 14 days', value: '14' },
                { label: '≤ 30 days', value: '30' },
                { label: '≤ 60 days', value: '60' },
                { label: '≤ 90 days', value: '90' },
              ].map((option) => (
                <SelectionCard
                  key={option.label}
                  label={option.label}
                  selected={filters.daysOnMarketMax === option.value}
                  onClick={() => updateFilter('daysOnMarketMax', option.value)}
                  size="sm"
                />
              ))}
            </div>
          </section>

          {/* More Filters Toggle */}
          <section>
            <button
              type="button"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="w-full flex items-center justify-between px-6 py-5 bg-white border border-[#e5e3df] rounded-xl text-[#1a1a1a] hover:bg-[#f8f7f4] transition-colors"
            >
              <span className="font-cinzel font-medium tracking-wide">Advanced Filters</span>
              <svg
                className={`w-5 h-5 text-[#999] transition-transform duration-300 ${showMoreFilters ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMoreFilters && (
              <div className="mt-6 bg-white border border-[#e5e3df] rounded-xl p-6">
                <ToggleSwitch
                  checked={filters.isShortSale}
                  onChange={(v) => updateFilter('isShortSale', v)}
                  label="Short Sale"
                  filterKey="shortSale"
                />
                <ToggleSwitch
                  checked={filters.isREO}
                  onChange={(v) => updateFilter('isREO', v)}
                  label="REO / Bank Owned"
                  filterKey="reo"
                />
                <ToggleSwitch
                  checked={filters.isForeclosure}
                  onChange={(v) => updateFilter('isForeclosure', v)}
                  label="Foreclosure"
                  filterKey="foreclosure"
                />
                <ToggleSwitch
                  checked={filters.isAgeRestricted}
                  onChange={(v) => updateFilter('isAgeRestricted', v)}
                  label="Age Restricted (55+)"
                  filterKey="ageRestricted"
                />
                <ToggleSwitch
                  checked={filters.financingConsidered}
                  onChange={(v) => updateFilter('financingConsidered', v)}
                  label="Financing Considered"
                  filterKey="financing"
                />

                {/* Max HOA Fee */}
                <div className="pt-6 mt-4 border-t border-[#f0efec]">
                  <div className="flex items-center mb-4">
                    <span className="text-[#1a1a1a] font-medium tracking-wide">Max HOA Fee</span>
                    <InfoTooltip filterKey="associationFee" />
                  </div>
                  <NumericStepper
                    value={filters.maxAssociationFee}
                    onChange={(v) => updateFilter('maxAssociationFee', v)}
                    placeholder="Max monthly fee"
                    suffix="/mo"
                    step={50}
                  />
                </div>

                {/* Attached / Detached */}
                <div className="pt-6 mt-4 border-t border-[#f0efec]">
                  <div className="flex items-center mb-4">
                    <span className="text-[#1a1a1a] font-medium tracking-wide">Structure Type</span>
                    <InfoTooltip filterKey="attachedDetached" />
                  </div>
                  <div className="flex gap-3">
                    <SelectionCard
                      label="Any"
                      selected={filters.attachedDetached === null}
                      onClick={() => updateFilter('attachedDetached', null)}
                      size="sm"
                    />
                    <SelectionCard
                      label="Attached"
                      selected={filters.attachedDetached === 'Attached'}
                      onClick={() => updateFilter('attachedDetached', 'Attached')}
                      size="sm"
                    />
                    <SelectionCard
                      label="Detached"
                      selected={filters.attachedDetached === 'Detached'}
                      onClick={() => updateFilter('attachedDetached', 'Detached')}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#f8f7f4]/95 backdrop-blur-lg border-t border-[#e5e3df] p-4">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white border border-[#e5e3df] text-[#1a1a1a] rounded-xl font-medium hover:bg-[#f8f7f4] transition-colors tracking-wide"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSearch();
              onClose();
            }}
            className="flex-[2] px-6 py-4 bg-[#1a1a1a] text-[#f8f7f4] rounded-xl font-medium hover:bg-[#2d2d2d] transition-colors flex items-center justify-center gap-3 tracking-wide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="font-cinzel">Search Properties</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterOverlay;
