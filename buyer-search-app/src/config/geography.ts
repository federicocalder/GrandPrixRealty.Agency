/**
 * Geographic Configuration for Grand Prix Realty
 *
 * Licensed in: Nevada (NV)
 * Primary Market: Clark County / Las Vegas Metro Area
 *
 * Target Cities:
 * - Las Vegas
 * - North Las Vegas
 * - Henderson
 *
 * Note: Pahrump (Nye County) is also serviced but not in primary metro dropdown
 */

export const GEOGRAPHIC_CONFIG = {
  state: 'NV',
  stateName: 'Nevada',
  primaryCounty: 'Clark',

  // Cities for dropdown - Las Vegas Metro Area
  metroAreaCities: [
    { value: 'Las Vegas', label: 'Las Vegas' },
    { value: 'North Las Vegas', label: 'North Las Vegas' },
    { value: 'Henderson', label: 'Henderson' },
  ],

  // All serviced cities (including outside metro)
  allServicedCities: [
    { value: 'Las Vegas', label: 'Las Vegas' },
    { value: 'North Las Vegas', label: 'North Las Vegas' },
    { value: 'Henderson', label: 'Henderson' },
    { value: 'Pahrump', label: 'Pahrump' },
  ],

  // Default map center (Las Vegas Strip area)
  defaultMapCenter: {
    lat: 36.1699,
    lng: -115.1398,
  },

  defaultMapZoom: 11,
};

// Property types for residential buyer search
export const PROPERTY_TYPES = [
  { value: 'Residential', label: 'Single Family', icon: '🏠' },
  { value: 'Condominium', label: 'Condo', icon: '🏢' },
  { value: 'Townhouse', label: 'Townhouse', icon: '🏘️' },
];

// Property types for separate landing pages (future)
export const SPECIALTY_PROPERTY_TYPES = [
  { value: 'Multi Family', label: 'Multi-Family', icon: '🏗️' },
  { value: 'Land', label: 'Land/Lot', icon: '🌳' },
  { value: 'Commercial', label: 'Commercial', icon: '🏬' },
  { value: 'High Rise', label: 'High Rise', icon: '🏙️' },
];

// Excluded property types
export const EXCLUDED_PROPERTY_TYPES = [
  'Manufactured Home',
  'Mobile Home',
  'Manufactured In Park',
];
