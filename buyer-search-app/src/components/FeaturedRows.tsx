import { useState, useEffect, useRef } from 'react';
import { Heart, Bed, Bath, Flame, ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { getApiUrl } from '../config/api';

interface TrestleListing {
  ListingKey: string;
  ListingId: string;
  ListPrice: number;
  OriginalListPrice?: number;
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

interface FeaturedProperty {
  id: string;
  address: string;
  city: string;
  price: number;
  originalPrice?: number;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl: string;
  daysOnMarket: number;
  hasPool: boolean;
}

interface FeaturedRowConfig {
  id: string;
  title: string;
  subtitle: string;
  queryParams: string;
  endpoint?: string; // Custom endpoint for special queries
  showDiscount?: boolean;
}

// Featured row configurations
const FEATURED_ROWS: FeaturedRowConfig[] = [
  {
    id: 'featured',
    title: 'Featured Properties',
    subtitle: 'Premium homes handpicked for discerning buyers',
    queryParams: 'minPrice=550000&garageSpaces=3&beds=4&hasPool=true&daysOnMarketMax=10&propertyType=SingleFamilyResidence',
  },
  {
    id: 'pools',
    title: 'Homes with Pools',
    subtitle: 'Beat the Vegas heat with your private oasis',
    queryParams: 'minPrice=550000&maxPrice=750000&garageSpaces=2&daysOnMarketMax=20&hasPool=true',
  },
  {
    id: 'highrise',
    title: 'High Rise Living',
    subtitle: 'Luxury condos with stunning Strip views',
    queryParams: 'propertyTypeMain=HighRise&beds=3',
  },
  {
    id: 'pricereduced',
    title: 'Price Reduced',
    subtitle: 'Motivated sellers and exceptional value',
    queryParams: '', // Uses dedicated endpoint
    endpoint: '/listings/price-reduced',
    showDiscount: true,
  },
];

// Compact property card for carousel
const PropertyCardSmall = ({
  property,
  showDiscount = false,
  onFavoriteToggle,
  isFavorite = false,
}: {
  property: FeaturedProperty;
  showDiscount?: boolean;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  const isHot = property.daysOnMarket < 10;

  // Calculate discount percentage
  const discountPercent = property.originalPrice && property.originalPrice > property.price
    ? Math.round(((property.originalPrice - property.price) / property.originalPrice) * 100)
    : 0;
  const discountAmount = property.originalPrice && property.originalPrice > property.price
    ? property.originalPrice - property.price
    : 0;

  return (
    <div className="flex-shrink-0 w-72 group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {!imageError && property.imageUrl ? (
          <img
            src={`${property.imageUrl}?w=400&h=300&fit=crop`}
            alt={property.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#e5e3df] flex items-center justify-center">
            <span className="text-[#999] text-sm">No image</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(property.id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all z-10"
        >
          <Heart
            size={16}
            className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
          />
        </button>

        {/* Beds/Baths badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/20 z-10">
          <div className="flex items-center space-x-2 text-white text-xs font-medium">
            <div className="flex items-center space-x-0.5">
              <Bed size={12} />
              <span>{property.beds}</span>
            </div>
            <div className="flex items-center space-x-0.5">
              <Bath size={12} />
              <span>{property.baths}</span>
            </div>
          </div>
        </div>

        {/* Hot badge */}
        {isHot && !showDiscount && (
          <div className="absolute top-10 right-2 px-2 py-0.5 rounded-md bg-red-500/90 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-0.5 text-white text-xs font-bold">
              <Flame size={12} />
              <span>{property.daysOnMarket}d</span>
            </div>
          </div>
        )}

        {/* Discount badge */}
        {showDiscount && discountPercent > 0 && (
          <div className="absolute top-10 right-2 px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-0.5 text-white text-xs font-bold">
              <TrendingDown size={12} />
              <span>-{discountPercent}%</span>
            </div>
          </div>
        )}

        {/* Pool badge */}
        {property.hasPool && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-blue-500/80 backdrop-blur-sm z-10">
            <span className="text-white text-xs font-medium">Pool</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-cinzel font-bold text-[#1a1a1a] text-lg">
            {formatPrice(property.price)}
          </span>
          {showDiscount && discountAmount > 0 && (
            <span className="text-xs text-emerald-600 font-medium">
              Save ${discountAmount.toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-sm text-[#6b6b6b] truncate">{property.address}</p>
        <p className="text-xs text-[#999] truncate">{property.city}, NV</p>
      </div>
    </div>
  );
};

// Single featured row component
const FeaturedRow = ({
  config,
  favorites,
  onFavoriteToggle,
  onViewAll,
}: {
  config: FeaturedRowConfig;
  favorites: Set<string>;
  onFavoriteToggle: (id: string) => void;
  onViewAll: (config: FeaturedRowConfig) => void;
}) => {
  const [properties, setProperties] = useState<FeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Map Trestle listing to FeaturedProperty
  const mapToFeaturedProperty = (listing: TrestleListing): FeaturedProperty => ({
    id: listing.ListingKey,
    address: `${listing.StreetNumber || ''} ${listing.StreetName || ''}`.trim(),
    city: listing.City,
    price: listing.ListPrice,
    originalPrice: listing.OriginalListPrice,
    beds: listing.BedroomsTotal || 0,
    baths: listing.BathroomsTotalInteger || 0,
    sqft: listing.LivingArea || 0,
    imageUrl: listing.Media && listing.Media.length > 0 ? listing.Media[0].MediaURL : '',
    daysOnMarket: listing.DaysOnMarket || 0,
    hasPool: listing.PoolPrivateYN || false,
  });

  // Fetch listings for this row
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        // Use custom endpoint if provided, otherwise use standard listings endpoint
        const url = getApiUrl(config.endpoint || `/listings?${config.queryParams}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: TrestleListing[] = await res.json();
        // Limit to 20 items for carousel
        setProperties(data.slice(0, 20).map(mapToFeaturedProperty));
      } catch (err) {
        console.error(`Error fetching ${config.id}:`, err);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [config.queryParams, config.endpoint, config.id]);

  // Update scroll button visibility
  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', updateScrollButtons);
      return () => scrollEl.removeEventListener('scroll', updateScrollButtons);
    }
  }, [properties]);

  // Scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Don't render if no properties and not loading
  if (!loading && properties.length === 0) {
    return null;
  }

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 px-4 sm:px-0">
        <div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-[#1a1a1a]">
            {config.title}
          </h2>
          <p className="text-sm text-[#6b6b6b] mt-0.5">{config.subtitle}</p>
        </div>
        <button
          onClick={() => onViewAll(config)}
          className="flex items-center gap-1 text-sm font-medium text-[#1a1a1a] hover:text-[#4a4a4a] transition-colors group"
        >
          <span>View All</span>
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Carousel container */}
      <div className="relative group/carousel">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft size={20} className="text-[#1a1a1a]" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight size={20} className="text-[#1a1a1a]" />
          </button>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-4 sm:px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72 bg-white rounded-xl overflow-hidden shadow-md animate-pulse">
                <div className="aspect-[4/3] bg-[#e5e3df]" />
                <div className="p-3">
                  <div className="h-5 bg-[#e5e3df] rounded w-24 mb-2" />
                  <div className="h-4 bg-[#e5e3df] rounded w-full mb-1" />
                  <div className="h-3 bg-[#e5e3df] rounded w-20" />
                </div>
              </div>
            ))
          ) : (
            properties.map((property) => (
              <PropertyCardSmall
                key={property.id}
                property={property}
                showDiscount={config.showDiscount}
                onFavoriteToggle={onFavoriteToggle}
                isFavorite={favorites.has(property.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Main FeaturedRows component
interface FeaturedRowsProps {
  favorites: Set<string>;
  onFavoriteToggle: (id: string) => void;
  onViewAll: (config: FeaturedRowConfig) => void;
}

export const FeaturedRows = ({ favorites, onFavoriteToggle, onViewAll }: FeaturedRowsProps) => {
  return (
    <div className="py-8">
      {FEATURED_ROWS.map((config) => (
        <FeaturedRow
          key={config.id}
          config={config}
          favorites={favorites}
          onFavoriteToggle={onFavoriteToggle}
          onViewAll={onViewAll}
        />
      ))}
    </div>
  );
};

export type { FeaturedRowConfig };
