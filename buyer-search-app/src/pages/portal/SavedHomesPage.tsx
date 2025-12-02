// ============================================
// Saved Homes Page - Buyer Portal
// Grand Prix Realty
// ============================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SavedPropertyWithDetails, ReactionType } from '../../types/portal';
import { formatPrice } from '../../lib/utils';

interface SavedHomesPageProps {
  properties: SavedPropertyWithDetails[];
  loading: boolean;
  onToggleFavorite: (propertyId: string, isFavorite: boolean) => void;
  onRemoveProperty: (propertyId: string) => void;
  onSetReaction: (propertyId: string, reaction: ReactionType) => void;
  userId?: string;
}

type FilterTab = 'all' | 'favorites' | 'love' | 'considering' | 'pass';

export function SavedHomesPage({
  properties,
  loading,
  onToggleFavorite,
  onRemoveProperty,
  onSetReaction,
  userId,
}: SavedHomesPageProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter properties based on active tab
  const filteredProperties = properties.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'favorites') return p.is_favorite;

    // Filter by user's reaction
    const userReaction = p.reactions.find((r) => r.user_id === userId);
    if (activeTab === 'love') return userReaction?.reaction === 'love';
    if (activeTab === 'considering') return userReaction?.reaction === 'considering';
    if (activeTab === 'pass') return userReaction?.reaction === 'pass';

    return true;
  });

  // Count for tabs
  const counts = {
    all: properties.length,
    favorites: properties.filter((p) => p.is_favorite).length,
    love: properties.filter((p) => p.reactions.some((r) => r.user_id === userId && r.reaction === 'love')).length,
    considering: properties.filter((p) => p.reactions.some((r) => r.user_id === userId && r.reaction === 'considering')).length,
    pass: properties.filter((p) => p.reactions.some((r) => r.user_id === userId && r.reaction === 'pass')).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#e5e3df] border-t-[#1a1a1a] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl lg:text-3xl font-bold text-[#1a1a1a]">
            Saved Homes
          </h1>
          <p className="text-[#6b6b6b] mt-1">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} saved
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-xl font-medium hover:bg-[#2d2d2d] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find More Homes
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', icon: null },
          { key: 'favorites', label: 'Favorites', icon: '⭐' },
          { key: 'love', label: 'Love', icon: '❤️' },
          { key: 'considering', label: 'Considering', icon: '🤔' },
          { key: 'pass', label: 'Pass', icon: '👎' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as FilterTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white border border-[#e5e3df] text-[#6b6b6b] hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            <span className={`text-sm ${activeTab === tab.key ? 'text-white/70' : 'text-[#999]'}`}>
              ({counts[tab.key as FilterTab]})
            </span>
          </button>
        ))}
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5e3df] p-12 text-center">
          <div className="w-16 h-16 bg-[#f8f7f4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="font-cinzel text-xl font-semibold text-[#1a1a1a] mb-2">
            {activeTab === 'all' ? 'No saved homes yet' : `No ${activeTab} homes`}
          </h3>
          <p className="text-[#6b6b6b] mb-6">
            {activeTab === 'all'
              ? 'Start browsing and save homes you love!'
              : 'Change your filters or browse more homes'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-medium hover:bg-[#2d2d2d] transition-colors"
          >
            Browse Homes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const snapshot = property.listing_snapshot_json;
            const userReaction = property.reactions.find((r) => r.user_id === userId)?.reaction;

            return (
              <div
                key={property.id}
                className="bg-white rounded-2xl border border-[#e5e3df] overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  {snapshot?.photo_url ? (
                    <img
                      src={`${snapshot.photo_url}?w=800&h=600&fit=crop`}
                      alt={snapshot.address}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#e5e3df] flex items-center justify-center">
                      <span className="text-[#999]">No image</span>
                    </div>
                  )}

                  {/* Favorite Button */}
                  <button
                    onClick={() => onToggleFavorite(property.id, !property.is_favorite)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all"
                  >
                    <svg
                      className={`w-5 h-5 ${property.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`}
                      fill={property.is_favorite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>

                  {/* Reaction Badge */}
                  {userReaction && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
                      <span className="text-lg">
                        {userReaction === 'love' ? '❤️' : userReaction === 'considering' ? '🤔' : '👎'}
                      </span>
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm">
                    <span className="text-white font-bold">
                      {formatPrice(snapshot?.price || property.price_at_save || 0)}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-[#1a1a1a] truncate">
                    {snapshot?.address || 'Address not available'}
                  </h3>
                  <p className="text-sm text-[#6b6b6b]">
                    {snapshot?.city}, {snapshot?.state} {snapshot?.zip}
                  </p>

                  {/* Specs */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-[#6b6b6b]">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {snapshot?.beds || 0} bd
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      {snapshot?.baths || 0} ba
                    </span>
                    <span className="flex items-center gap-1">
                      {(snapshot?.sqft || 0).toLocaleString()} sqft
                    </span>
                  </div>

                  {/* Reactions Row */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#f0efec]">
                    {(['love', 'considering', 'pass'] as ReactionType[]).map((reaction) => (
                      <button
                        key={reaction}
                        onClick={() => onSetReaction(property.id, reaction)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          userReaction === reaction
                            ? 'bg-[#1a1a1a] text-white'
                            : 'bg-[#f8f7f4] text-[#6b6b6b] hover:bg-[#e5e3df]'
                        }`}
                      >
                        {reaction === 'love' ? '❤️ Love' : reaction === 'considering' ? '🤔 Maybe' : '👎 Pass'}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Link
                      to={`/listing/${property.listing_key}`}
                      className="flex-1 py-2 px-4 bg-[#1a1a1a] text-white rounded-lg text-sm font-medium text-center hover:bg-[#2d2d2d] transition-colors"
                    >
                      View Details
                    </Link>
                    {confirmDelete === property.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            onRemoveProperty(property.id);
                            setConfirmDelete(null);
                          }}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-2 bg-[#e5e3df] text-[#6b6b6b] rounded-lg hover:bg-[#d1d1d1] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(property.id)}
                        className="p-2 bg-[#f8f7f4] text-[#999] rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
