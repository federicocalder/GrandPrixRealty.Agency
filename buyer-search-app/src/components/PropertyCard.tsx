import { Heart, Bed, Bath, Flame } from 'lucide-react';
import type { Property } from '../types/index';
import { formatPrice } from '../lib/utils';
import { useState } from 'react';

interface PropertyCardProps {
  property: Property;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

export const PropertyCard = ({ property, onFavoriteToggle, isFavorite = false }: PropertyCardProps) => {
  const [imageError, setImageError] = useState(false);
  const isHot = property.daysOnMarket < 10;

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        {!imageError ? (
          <img
            src={`${property.imageUrl}?w=800&h=600&fit=crop`}
            alt={property.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-grand-steel flex items-center justify-center">
            <span className="text-white text-sm">No image available</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(property.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all z-10"
        >
          <Heart
            size={20}
            className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
          />
        </button>

        {/* Beds/Baths badge - top left */}
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 z-10">
          <div className="flex items-center space-x-3 text-white text-sm font-medium">
            <div className="flex items-center space-x-1">
              <Bed size={16} />
              <span>{property.beds}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Bath size={16} />
              <span>{property.baths}</span>
            </div>
          </div>
        </div>

        {/* DOM badge - top right (below favorite) */}
        {isHot && (
          <div className="absolute top-14 right-3 px-2.5 py-1 rounded-lg bg-red-500/90 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-1 text-white text-xs font-bold">
              <Flame size={14} />
              <span>{property.daysOnMarket}d</span>
            </div>
          </div>
        )}

        {/* Pool badge */}
        {property.hasPool && (
          <div className="absolute bottom-16 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm z-10">
            <span className="text-xl">🏖️</span>
          </div>
        )}

        {/* Price/Address badge - bottom center */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/5 border border-white/30 min-w-[200px] z-10"
          style={{ backdropFilter: 'blur(2.5px)', WebkitBackdropFilter: 'blur(2.5px)' }}
        >
          <div className="text-center">
            <div className="text-white font-bold text-lg">{formatPrice(property.price)}</div>
            <div className="text-white/90 text-sm truncate">{property.address}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
