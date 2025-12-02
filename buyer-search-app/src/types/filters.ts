/**
 * Extended Listing Filters for Trestle API
 * Based on RESO Data Dictionary fields
 */

export interface ListingFilters {
  // Basic filters
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  city?: string;
  state?: string;

  // Property characteristics
  propertyType?: string[]; // Residential, Condominium, Townhouse
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  maxLotSize?: number;
  yearBuiltMin?: number;
  yearBuiltMax?: number;
  stories?: number;
  garageSpaces?: number;

  // Amenities
  hasPool?: boolean;
  hasHOA?: boolean;

  // Market filters
  daysOnMarketMax?: number;
  pricePerSqftMin?: number;
  pricePerSqftMax?: number;

  // Special conditions (More Filters)
  isShortSale?: boolean;
  isREO?: boolean;
  isForeclosure?: boolean;
  isAgeRestricted?: boolean;
  isMultiGen?: boolean;
  attachedDetached?: 'Attached' | 'Detached' | null;

  // Financing
  financingConsidered?: boolean;
  maxAssociationFee?: number;
}

// Filter field info for tooltips
export interface FilterFieldInfo {
  label: string;
  description: string;
  icon?: string;
}

export const FILTER_INFO: Record<string, FilterFieldInfo> = {
  propertyType: {
    label: 'Property Type',
    description: 'Select the type of property you\'re looking for. Single Family homes are standalone houses, Condos are units in multi-unit buildings, and Townhouses share walls with neighboring units.',
    icon: '🏠',
  },
  beds: {
    label: 'Bedrooms',
    description: 'Minimum number of bedrooms. The search will show properties with this many bedrooms or more.',
    icon: '🛏️',
  },
  baths: {
    label: 'Bathrooms',
    description: 'Minimum number of full bathrooms. Half baths are counted separately in listings.',
    icon: '🚿',
  },
  price: {
    label: 'Price Range',
    description: 'Set your budget range. Only properties within this price range will be shown.',
    icon: '💰',
  },
  sqft: {
    label: 'Square Feet',
    description: 'Living area square footage. This is the interior heated/cooled space, not including garage or outdoor areas.',
    icon: '📐',
  },
  lotSize: {
    label: 'Lot Size',
    description: 'Total land area in square feet. Important for outdoor space, potential additions, or privacy.',
    icon: '🌳',
  },
  yearBuilt: {
    label: 'Year Built',
    description: 'When the property was originally constructed. Newer homes may have modern features; older homes may have more character.',
    icon: '📅',
  },
  stories: {
    label: 'Stories',
    description: 'Number of floors/levels in the home. Single-story is great for accessibility; multi-story offers more separation.',
    icon: '🏗️',
  },
  garageSpaces: {
    label: 'Garage Spaces',
    description: 'Minimum number of garage parking spaces. In Las Vegas heat, covered parking is valuable!',
    icon: '🚗',
  },
  pool: {
    label: 'Pool',
    description: 'Filter for properties with a private pool. Great for Las Vegas summers!',
    icon: '🏊',
  },
  hoa: {
    label: 'HOA',
    description: 'Homeowners Association. HOAs have monthly fees but often include community amenities and maintenance.',
    icon: '🏘️',
  },
  daysOnMarket: {
    label: 'Days on Market',
    description: 'How long the property has been listed. Newer listings are "hot"; longer listings may be more negotiable.',
    icon: '📆',
  },
  pricePerSqft: {
    label: 'Price per Sq Ft',
    description: 'Helps compare value between different sized homes. Las Vegas average is around $200-300/sqft.',
    icon: '💵',
  },
  shortSale: {
    label: 'Short Sale',
    description: 'Property being sold for less than owed. Can be a deal, but requires lender approval and patience.',
    icon: '⏳',
  },
  reo: {
    label: 'REO / Bank Owned',
    description: 'Real Estate Owned by bank after foreclosure. Often priced competitively but sold "as-is".',
    icon: '🏦',
  },
  foreclosure: {
    label: 'Foreclosure',
    description: 'Property in foreclosure proceedings. May offer below-market prices but involves legal complexity.',
    icon: '⚠️',
  },
  ageRestricted: {
    label: 'Age Restricted',
    description: '55+ communities. Great amenities and active lifestyle, but at least one resident must be 55 or older.',
    icon: '👴',
  },
  multiGen: {
    label: 'Multi-Generational',
    description: 'Homes designed for extended family living with separate entrances, kitchens, or living spaces.',
    icon: '👨‍👩‍👧‍👦',
  },
  attachedDetached: {
    label: 'Attached / Detached',
    description: 'Attached homes share walls with neighbors; detached homes are standalone structures.',
    icon: '🏘️',
  },
  financing: {
    label: 'Financing Considered',
    description: 'Seller may consider non-traditional financing like lease-to-own or seller financing.',
    icon: '📋',
  },
  associationFee: {
    label: 'Max HOA Fee',
    description: 'Maximum monthly HOA/association fee you\'re willing to pay.',
    icon: '💳',
  },
};
