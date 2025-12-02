import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PropertyCard } from './components/PropertyCard';
import { FilterOverlay, type FilterState } from './components/FilterOverlay';
import { FeaturedRows, type FeaturedRowConfig } from './components/FeaturedRows';
import type { Property } from './types/index';
import { getApiUrl } from './config/api';

interface TrestleListing {
  ListingKey: string;
  ListingId: string;
  ListPrice: number;
  PropertyType: string;
  PropertySubType?: string;
  City: string;
  StateOrProvince: string;
  PostalCode?: string;
  BedroomsTotal: number | null;
  BathroomsTotalInteger: number | null;
  Latitude: number;
  Longitude: number;
  StreetNumber?: string;
  StreetName?: string;
  LivingArea?: number;
  LotSizeSquareFeet?: number;
  YearBuilt?: number;
  Stories?: number;
  GarageSpaces?: number;
  PoolPrivateYN?: boolean;
  AssociationYN?: boolean;
  AssociationFee?: number;
  DaysOnMarket?: number;
  Media?: Array<{ MediaURL: string }>;
}

// Initial filter state
const initialFilters: FilterState = {
  city: '',
  minPrice: '300000',
  maxPrice: '800000',
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
};

function App() {
  const [searchMode, setSearchMode] = useState<'ai' | 'classic'>('classic');
  const [properties, setProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if user has performed a search

  // Map Trestle listing to Property interface
  const mapTrestleToProperty = (listing: TrestleListing): Property => ({
    id: listing.ListingKey,
    address: `${listing.StreetNumber || ''} ${listing.StreetName || ''}`.trim(),
    city: listing.City,
    state: listing.StateOrProvince,
    zip: listing.PostalCode || '',
    price: listing.ListPrice,
    beds: listing.BedroomsTotal || 0,
    baths: listing.BathroomsTotalInteger || 0,
    sqft: listing.LivingArea || 0,
    propertyType: listing.PropertyType === 'Residential' ? 'House' :
                  listing.PropertyType === 'Condominium' ? 'Condo' :
                  listing.PropertyType === 'Townhouse' ? 'Townhome' : 'House',
    latitude: listing.Latitude,
    longitude: listing.Longitude,
    imageUrl: listing.Media && listing.Media.length > 0 ? listing.Media[0].MediaURL : '',
    daysOnMarket: listing.DaysOnMarket || 0,
    hasPool: listing.PoolPrivateYN || false,
  });

  // Build query string from filters
  const buildQueryString = (f: FilterState): string => {
    const params = new URLSearchParams();

    // Basic filters
    if (f.city) params.append('city', f.city);
    if (f.minPrice) params.append('minPrice', f.minPrice);
    if (f.maxPrice) params.append('maxPrice', f.maxPrice);
    if (f.beds !== null) params.append('beds', String(f.beds));
    if (f.baths !== null) params.append('baths', String(f.baths));

    // Property type (comma-separated for multiple)
    if (f.propertyType && f.propertyType.length > 0) {
      params.append('propertyType', f.propertyType.join(','));
    }

    // Property characteristics
    if (f.minSqft) params.append('minSqft', f.minSqft);
    if (f.stories !== null) params.append('stories', String(f.stories));
    if (f.garageSpaces !== null) params.append('garageSpaces', String(f.garageSpaces));
    if (f.yearBuiltMin) params.append('yearBuiltMin', f.yearBuiltMin);
    if (f.minLotSize) params.append('minLotSize', f.minLotSize);

    // Amenities
    if (f.hasPool !== null) params.append('hasPool', String(f.hasPool));
    if (f.hasHOA !== null) params.append('hasHOA', String(f.hasHOA));

    // Market filters
    if (f.daysOnMarketMax) params.append('daysOnMarketMax', f.daysOnMarketMax);
    if (f.maxAssociationFee) params.append('maxAssociationFee', f.maxAssociationFee);

    // Special conditions
    if (f.isShortSale) params.append('isShortSale', 'true');
    if (f.isREO) params.append('isREO', 'true');
    if (f.isForeclosure) params.append('isForeclosure', 'true');
    if (f.isAgeRestricted) params.append('isAgeRestricted', 'true');
    if (f.financingConsidered) params.append('financingConsidered', 'true');
    if (f.attachedDetached) params.append('attachedDetached', f.attachedDetached);

    return params.toString();
  };

  // Fetch listings with filters
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true); // Mark that user has searched

      const queryString = buildQueryString(filters);
      console.log('Fetching with query:', queryString);

      const res = await fetch(getApiUrl(`/listings?${queryString}`));

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server error: ${res.status}`;
        throw new Error(errorMessage);
      }

      const data: TrestleListing[] = await res.json();

      const mappedProperties = data.map(mapTrestleToProperty);
      setProperties(mappedProperties);
    } catch (err) {
      console.error('Failed to load listings:', err);
      const message = err instanceof Error ? err.message : 'Failed to load listings';
      setError(message);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Reset search to show featured rows
  const resetSearch = () => {
    setFilters(initialFilters);
    setHasSearched(false);
    setProperties([]);
    setError(null);
    setLoading(false);
  };

  // Handle "View All" from featured rows - apply filters and search
  const handleViewAllFromFeatured = (config: FeaturedRowConfig) => {
    // Parse the query params and apply them as filters
    const params = new URLSearchParams(config.queryParams);
    const newFilters: FilterState = { ...initialFilters };

    if (params.get('minPrice')) newFilters.minPrice = params.get('minPrice')!;
    if (params.get('maxPrice')) newFilters.maxPrice = params.get('maxPrice')!;
    if (params.get('beds')) newFilters.beds = parseInt(params.get('beds')!);
    if (params.get('garageSpaces')) newFilters.garageSpaces = parseInt(params.get('garageSpaces')!);
    if (params.get('hasPool') === 'true') newFilters.hasPool = true;
    if (params.get('daysOnMarketMax')) newFilters.daysOnMarketMax = params.get('daysOnMarketMax')!;
    if (params.get('propertyType')) newFilters.propertyType = params.get('propertyType')!.split(',');

    setFilters(newFilters);
    setHasSearched(true);
    setLoading(true);

    // Fetch with new filters after state update
    setTimeout(async () => {
      try {
        const res = await fetch(getApiUrl(`/listings?${config.queryParams}`));
        if (!res.ok) throw new Error('Failed to fetch');
        const data: TrestleListing[] = await res.json();
        setProperties(data.map(mapTrestleToProperty));
      } catch (err) {
        console.error('Failed to load listings:', err);
        setError('Failed to load listings');
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  // Don't auto-fetch on load - show featured rows instead
  useEffect(() => {
    setLoading(false);
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Count active filters for badge
  const activeFilterCount = [
    filters.city,
    filters.minPrice !== '300000' || filters.maxPrice !== '800000',
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

  return (
    <div className="min-h-screen bg-black pt-20">
      <Navbar />
      <Hero />

      {/* Search Section - Premium off-white background */}
      <section id="search-section" className="py-16 bg-[#f8f7f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl bg-white p-1.5 shadow-lg border border-[#e5e3df]">
              <button
                onClick={() => setSearchMode('ai')}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 tracking-wide ${
                  searchMode === 'ai'
                    ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-md'
                    : 'text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f8f7f4]'
                }`}
              >
                AI Search
              </button>
              <button
                onClick={() => setSearchMode('classic')}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-300 tracking-wide ${
                  searchMode === 'classic'
                    ? 'bg-[#1a1a1a] text-[#f8f7f4] shadow-md'
                    : 'text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f8f7f4]'
                }`}
              >
                Classic Search
              </button>
            </div>
          </div>

          {/* Search Mode Content */}
          {searchMode === 'ai' ? (
            <div className="bg-white rounded-2xl shadow-lg border border-[#e5e3df] p-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#f8f7f4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-cinzel text-2xl font-semibold mb-3 text-[#1a1a1a]">AI Search Coming Soon</h3>
                <p className="text-[#6b6b6b] max-w-md mx-auto leading-relaxed">
                  Our AI-powered search will help you find homes using natural language.
                  Describe your dream home and let AI find the perfect match.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-[#e5e3df] p-6 mb-8">
              {/* Filter Trigger Button */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="flex-1 flex items-center justify-between px-6 py-4 bg-[#f8f7f4] border border-[#e5e3df] rounded-xl hover:border-[#1a1a1a] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-[#4a4a4a] font-medium tracking-wide">
                      {activeFilterCount > 0
                        ? `${activeFilterCount} filters applied`
                        : 'Customize your search'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <span className="bg-[#1a1a1a] text-[#f8f7f4] text-sm px-2.5 py-1 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                    <svg className="w-5 h-5 text-[#999] group-hover:text-[#1a1a1a] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <div className="flex gap-2">
                  {hasSearched && (
                    <button
                      onClick={resetSearch}
                      className="px-4 py-4 bg-white border border-[#e5e3df] text-[#6b6b6b] rounded-xl font-medium hover:bg-[#f8f7f4] hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-all flex items-center justify-center gap-2 tracking-wide"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Restart</span>
                    </button>
                  )}
                  <button
                    onClick={fetchListings}
                    disabled={loading}
                    className="px-8 py-4 bg-[#1a1a1a] text-[#f8f7f4] rounded-xl font-medium hover:bg-[#2d2d2d] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px] tracking-wide"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#f8f7f4]/30 border-t-[#f8f7f4] rounded-full animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="font-cinzel">Search</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Filter Pills - No emojis, premium styling */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#f0efec]">
                  {filters.city && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      {filters.city}
                    </span>
                  )}
                  {(filters.minPrice || filters.maxPrice) && (filters.minPrice !== '300000' || filters.maxPrice !== '800000') && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      ${filters.minPrice ? parseInt(filters.minPrice).toLocaleString() : '0'} – ${filters.maxPrice ? parseInt(filters.maxPrice).toLocaleString() : 'No max'}
                    </span>
                  )}
                  {filters.beds && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      {filters.beds}+ Beds
                    </span>
                  )}
                  {filters.baths && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      {filters.baths}+ Baths
                    </span>
                  )}
                  {filters.propertyType && filters.propertyType.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      {filters.propertyType.join(', ')}
                    </span>
                  )}
                  {filters.hasPool === true && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      Pool
                    </span>
                  )}
                  {filters.minSqft && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#e5e3df] rounded-lg text-sm text-[#4a4a4a] tracking-wide">
                      {parseInt(filters.minSqft).toLocaleString()}+ sq ft
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show Featured Rows OR Search Results */}
          {!hasSearched ? (
            /* Featured Property Rows - Show when user hasn't searched yet */
            <FeaturedRows
              favorites={favorites}
              onFavoriteToggle={toggleFavorite}
              onViewAll={handleViewAllFromFeatured}
            />
          ) : (
            /* Search Results - Show after user searches */
            <>
              {/* Results Count */}
              {!loading && properties.length > 0 && (
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-[#4a4a4a] font-medium tracking-wide">
                    Found <span className="text-[#1a1a1a] font-semibold">{properties.length}</span> {properties.length === 1 ? 'property' : 'properties'}
                  </p>
                  <p className="text-sm text-[#999] tracking-wide">
                    Las Vegas Metro Area
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-6 bg-white border border-[#e5e3df] rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#f8f7f4] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[#1a1a1a] font-medium">Unable to load properties</p>
                      <p className="text-[#6b6b6b] text-sm mt-1">{error}</p>
                      <button
                        onClick={fetchListings}
                        className="mt-3 px-4 py-2 bg-[#1a1a1a] text-[#f8f7f4] rounded-lg text-sm hover:bg-[#2d2d2d] transition-colors tracking-wide"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Property Grid */}
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white border border-[#e5e3df] rounded-full mb-4">
                    <div className="w-8 h-8 border-2 border-[#e5e3df] border-t-[#1a1a1a] rounded-full animate-spin" />
                  </div>
                  <p className="text-[#4a4a4a] text-lg font-medium tracking-wide">Searching properties...</p>
                  <p className="text-[#999] text-sm mt-1">Finding the best matches for you</p>
                </div>
              ) : error ? null : properties.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-white border border-[#e5e3df] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <p className="text-[#1a1a1a] text-lg font-medium tracking-wide">No properties found</p>
                  <p className="text-[#6b6b6b] text-sm mt-2 max-w-md mx-auto">
                    Try adjusting your search filters to see more results.
                    The Las Vegas market is always changing.
                  </p>
                  <div className="flex gap-3 justify-center mt-4">
                    <button
                      onClick={() => setIsFilterOpen(true)}
                      className="px-6 py-2 bg-[#1a1a1a] text-[#f8f7f4] rounded-lg text-sm font-medium hover:bg-[#2d2d2d] transition-colors tracking-wide"
                    >
                      Adjust Filters
                    </button>
                    <button
                      onClick={resetSearch}
                      className="px-6 py-2 bg-white border border-[#e5e3df] text-[#6b6b6b] rounded-lg text-sm font-medium hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors tracking-wide"
                    >
                      Back to Featured
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onFavoriteToggle={toggleFavorite}
                      isFavorite={favorites.has(property.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Filter Overlay */}
      <FilterOverlay
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={fetchListings}
      />
    </div>
  );
}

export default App;
