import * as dotenv from 'dotenv';
dotenv.config();

interface TrestleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TrestleToken {
  accessToken: string;
  expiresAt: number;
}

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
  propertyType?: string[]; // Residential, Condominium, Townhouse (PropertySubType)
  propertyTypeMain?: string; // PropertyType field: Residential, HighRise, Land, etc.
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
  priceReduced?: boolean; // Filter for listings where ListPrice < OriginalListPrice

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

/**
 * Sanitize string input for OData queries.
 * Removes characters that could be used for injection attacks.
 */
function sanitizeODataString(input: string): string {
  // Remove single quotes, backslashes, and other OData-sensitive characters
  // Only allow alphanumeric, spaces, hyphens, and periods (for city/state names)
  return input.replace(/[^a-zA-Z0-9\s\-\.]/g, '').trim();
}

/**
 * Safely parse and validate a numeric value.
 * Returns undefined if the value is invalid or NaN.
 */
export function parseNumericFilter(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = Number(value);
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return undefined;
  }
  return num;
}

/**
 * Parse boolean filter from query string
 */
export function parseBooleanFilter(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

/**
 * Parse string array from query string (comma-separated)
 */
export function parseArrayFilter(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(v => v.length > 0);
  }
  return undefined;
}

interface TrestleListing {
  ListingKey: string;
  ListingId: string;
  ListPrice: number;
  PropertyType: string;
  PropertySubType?: string;
  City: string;
  StateOrProvince: string;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  Latitude: number;
  Longitude: number;
  StreetNumber?: string;
  StreetName?: string;
  PostalCode?: string;
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

// In-memory token cache
let cachedToken: TrestleToken | null = null;

// Note: We previously tried to exclude manufactured/mobile homes via PropertySubType
// but the Trestle API enum values vary by MLS. Instead, users naturally filter these out
// by selecting specific property types like SingleFamilyResidence, Condominium, etc.

/**
 * Get Trestle OAuth access token (with caching)
 */
export async function getTrestleAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.TRESTLE_CLIENT_ID;
  const clientSecret = process.env.TRESTLE_CLIENT_SECRET;
  const tokenUrl = process.env.TRESTLE_TOKEN_URL;

  if (!clientId || !clientSecret || !tokenUrl) {
    throw new Error('Missing Trestle API credentials in environment variables');
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const data: TrestleTokenResponse = await response.json();

    // Cache the token (expires_in is in seconds, subtract 60s for safety margin)
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return cachedToken.accessToken;
  } catch (error) {
    console.error('Error fetching Trestle access token:', error);
    throw error;
  }
}

/**
 * Fetch active listings from Trestle API with OData filters
 */
export async function fetchActiveListings(filters: ListingFilters = {}): Promise<TrestleListing[]> {
  const odataUrl = process.env.TRESTLE_ODATA_URL;

  if (!odataUrl) {
    throw new Error('Missing TRESTLE_ODATA_URL in environment variables');
  }

  const token = await getTrestleAccessToken();

  // Build OData $filter query
  const filterConditions: string[] = [];

  // ALWAYS filter to Active status only
  filterConditions.push(`StandardStatus eq 'Active'`);

  // Force Nevada state
  filterConditions.push(`StateOrProvince eq 'NV'`);

  // Price filters
  if (filters.minPrice) {
    filterConditions.push(`ListPrice ge ${filters.minPrice}`);
  }
  if (filters.maxPrice) {
    filterConditions.push(`ListPrice le ${filters.maxPrice}`);
  }

  // Bedroom/Bathroom filters
  if (filters.beds) {
    filterConditions.push(`BedroomsTotal ge ${filters.beds}`);
  }
  if (filters.baths) {
    filterConditions.push(`BathroomsTotalInteger ge ${filters.baths}`);
  }

  // City filter
  if (filters.city) {
    const sanitizedCity = sanitizeODataString(filters.city);
    if (sanitizedCity) {
      filterConditions.push(`City eq '${sanitizedCity}'`);
    }
  }

  // Property SubType filter (can be multiple) - e.g., SingleFamilyResidence, Condominium, Townhouse
  if (filters.propertyType && filters.propertyType.length > 0) {
    const typeConditions = filters.propertyType.map(type => {
      const sanitized = sanitizeODataString(type);
      return `PropertySubType eq '${sanitized}'`;
    });
    if (typeConditions.length === 1) {
      filterConditions.push(typeConditions[0]);
    } else {
      filterConditions.push(`(${typeConditions.join(' or ')})`);
    }
  }

  // Property Type Main filter - e.g., Residential, HighRise, Land
  if (filters.propertyTypeMain) {
    const sanitized = sanitizeODataString(filters.propertyTypeMain);
    filterConditions.push(`PropertyType eq '${sanitized}'`);
  }

  // Square footage filters
  if (filters.minSqft) {
    filterConditions.push(`LivingArea ge ${filters.minSqft}`);
  }
  if (filters.maxSqft) {
    filterConditions.push(`LivingArea le ${filters.maxSqft}`);
  }

  // Lot size filters
  if (filters.minLotSize) {
    filterConditions.push(`LotSizeSquareFeet ge ${filters.minLotSize}`);
  }
  if (filters.maxLotSize) {
    filterConditions.push(`LotSizeSquareFeet le ${filters.maxLotSize}`);
  }

  // Year built filters
  if (filters.yearBuiltMin) {
    filterConditions.push(`YearBuilt ge ${filters.yearBuiltMin}`);
  }
  if (filters.yearBuiltMax) {
    filterConditions.push(`YearBuilt le ${filters.yearBuiltMax}`);
  }

  // Stories filter
  if (filters.stories) {
    filterConditions.push(`Stories eq ${filters.stories}`);
  }

  // Garage spaces filter
  if (filters.garageSpaces) {
    filterConditions.push(`GarageSpaces ge ${filters.garageSpaces}`);
  }

  // Pool filter
  if (filters.hasPool === true) {
    filterConditions.push(`PoolPrivateYN eq true`);
  }

  // HOA filter
  if (filters.hasHOA === true) {
    filterConditions.push(`AssociationYN eq true`);
  } else if (filters.hasHOA === false) {
    filterConditions.push(`AssociationYN eq false`);
  }

  // Days on market filter
  if (filters.daysOnMarketMax) {
    filterConditions.push(`DaysOnMarket le ${filters.daysOnMarketMax}`);
  }

  // Price reduced filter - Note: OData field comparison (ListPrice lt OriginalListPrice)
  // is unreliable on Trestle API, so we handle this via client-side filtering after fetch
  // The priceReduced filter is handled post-fetch in the calling code

  // Max association fee
  if (filters.maxAssociationFee) {
    filterConditions.push(`AssociationFee le ${filters.maxAssociationFee}`);
  }

  // Special listing types
  if (filters.isShortSale === true) {
    filterConditions.push(`ShortSale eq true`);
  }
  if (filters.isREO === true) {
    filterConditions.push(`REOBankOwned eq true`);
  }
  if (filters.isForeclosure === true) {
    filterConditions.push(`ForeclosureStatus ne null`);
  }

  // Age restricted communities
  if (filters.isAgeRestricted === true) {
    filterConditions.push(`SeniorCommunityYN eq true`);
  }

  // Financing considered
  if (filters.financingConsidered === true) {
    filterConditions.push(`BuyerFinancing ne null`);
  }

  // Attached/Detached
  if (filters.attachedDetached === 'Attached') {
    filterConditions.push(`AttachedGarageYN eq true`);
  } else if (filters.attachedDetached === 'Detached') {
    filterConditions.push(`AttachedGarageYN eq false`);
  }

  const filterString = filterConditions.join(' and ');

  // Build the full URL with OData parameters
  const url = new URL(odataUrl);
  url.searchParams.set('$filter', filterString);
  url.searchParams.set('$select', [
    'ListingKey',
    'ListingId',
    'ListPrice',
    'OriginalListPrice',
    'PropertyType',
    'PropertySubType',
    'City',
    'StateOrProvince',
    'BedroomsTotal',
    'BathroomsTotalInteger',
    'Latitude',
    'Longitude',
    'StreetNumber',
    'StreetName',
    'PostalCode',
    'LivingArea',
    'LotSizeSquareFeet',
    'YearBuilt',
    'Stories',
    'GarageSpaces',
    'PoolPrivateYN',
    'AssociationYN',
    'AssociationFee',
    'AssociationName',
    'DaysOnMarket',
    'View',
  ].join(','));
  url.searchParams.set('$top', '100'); // Increased limit
  url.searchParams.set('$expand', 'Media($top=5)'); // Get up to 5 images
  url.searchParams.set('$orderby', 'ListPrice desc'); // Order by price descending

  console.log(`🔍 OData Filter: ${filterString}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Listings request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Return the value array from OData response
    return data.value || [];
  } catch (error) {
    console.error('Error fetching Trestle listings:', error);
    throw error;
  }
}

/**
 * Fetch a single listing by ListingId with ALL available fields
 * Used for listing detail pages where we need comprehensive data
 */
export async function fetchListingById(listingId: string): Promise<Record<string, unknown> | null> {
  const token = await getTrestleAccessToken();
  const odataUrl = process.env.TRESTLE_ODATA_URL;

  if (!odataUrl) {
    throw new Error('Missing TRESTLE_ODATA_URL in environment variables');
  }

  // Build the URL - fetch single listing by ListingId
  const url = new URL(odataUrl);
  url.searchParams.set('$filter', `ListingId eq '${listingId}'`);

  // Request important fields for listing detail page
  // Note: Some RESO fields may not be available in this MLS - removed: Foundation, Electric
  const selectFields = [
    // Identification
    'ListingKey', 'ListingId', 'StandardStatus',

    // Price & Financial
    'ListPrice', 'OriginalListPrice', 'PreviousListPrice',
    'TaxAnnualAmount', 'TaxYear',

    // Location
    'StreetNumber', 'StreetName', 'StreetSuffix', 'UnitNumber',
    'City', 'StateOrProvince', 'PostalCode', 'CountyOrParish',
    'Latitude', 'Longitude', 'Directions',
    'SubdivisionName', // Community name (e.g., "Summerlin")

    // Property Basics
    'PropertyType', 'PropertySubType',
    'BedroomsTotal', 'BathroomsFull', 'BathroomsHalf', 'BathroomsTotalInteger',
    'LivingArea', 'LotSizeSquareFeet', 'LotSizeAcres',
    'YearBuilt', 'Stories', 'GarageSpaces',

    // Description
    'PublicRemarks',

    // Features
    'PoolPrivateYN', 'SpaYN', 'FireplacesTotal', 'FireplaceYN',
    'View', 'WaterfrontYN',
    'Appliances', 'InteriorFeatures', 'ExteriorFeatures',
    'Flooring', 'Heating', 'Cooling',
    'LaundryFeatures', 'PatioAndPorchFeatures',
    'SecurityFeatures', 'CommunityFeatures',
    'ParkingFeatures', 'GarageYN', 'AttachedGarageYN', 'CarportYN',

    // HOA & Association (multiple possible)
    'AssociationYN', 'AssociationFee', 'AssociationFeeFrequency',
    'AssociationName', 'AssociationFee2', 'AssociationFee2Frequency',
    'AssociationName2', 'AssociationAmenities',

    // Schools
    'ElementarySchool', 'MiddleOrJuniorSchool', 'HighSchool',

    // Market Data
    'DaysOnMarket', 'CumulativeDaysOnMarket',
    'ListingContractDate', 'OnMarketDate', 'ModificationTimestamp',

    // Agent/Office Info (for IDX compliance)
    'ListAgentFullName', 'ListOfficeName', 'ListOfficeMlsId',

    // Virtual Tours
    'VirtualTourURLUnbranded',

    // Additional Details
    'ArchitecturalStyle', 'ConstructionMaterials', 'Roof',
    'WaterSource', 'Sewer', 'Utilities',
    'Zoning', 'LotFeatures',

    // Flags
    'NewConstructionYN', 'SeniorCommunityYN',
  ].join(',');

  url.searchParams.set('$select', selectFields);
  url.searchParams.set('$expand', 'Media'); // Get ALL photos
  url.searchParams.set('$top', '1');

  console.log(`🏠 Fetching listing detail for ID: ${listingId}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Listing request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const listings = data.value || [];

    if (listings.length === 0) {
      console.log(`⚠️ Listing ${listingId} not found`);
      return null;
    }

    console.log(`✅ Found listing ${listingId}`);
    return listings[0];
  } catch (error) {
    console.error('Error fetching listing detail:', error);
    throw error;
  }
}
