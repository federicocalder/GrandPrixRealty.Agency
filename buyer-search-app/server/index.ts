import express from 'express';
import * as dotenv from 'dotenv';
import {
  fetchActiveListings,
  fetchListingById,
  parseNumericFilter,
  parseBooleanFilter,
  parseArrayFilter,
  type ListingFilters
} from './trestleClient.js';

dotenv.config();

const app = express();
const PORT = 4000;

// Enable CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

/**
 * GET /api/listings
 *
 * Query params:
 * - Basic: minPrice, maxPrice, beds, baths, city
 * - Property: propertyType (comma-separated), minSqft, maxSqft, minLotSize, maxLotSize
 * - Year/Structure: yearBuiltMin, yearBuiltMax, stories, garageSpaces
 * - Amenities: hasPool, hasHOA
 * - Market: daysOnMarketMax, maxAssociationFee
 * - Special: isShortSale, isREO, isForeclosure, isAgeRestricted, financingConsidered, attachedDetached
 */
app.get('/api/listings', async (req, res) => {
  try {
    const {
      // Basic filters
      minPrice,
      maxPrice,
      beds,
      baths,
      city,

      // Property characteristics
      propertyType,
      propertyTypeMain,
      minSqft,
      maxSqft,
      minLotSize,
      maxLotSize,
      yearBuiltMin,
      yearBuiltMax,
      stories,
      garageSpaces,

      // Amenities
      hasPool,
      hasHOA,

      // Market filters
      daysOnMarketMax,
      maxAssociationFee,
      priceReduced,

      // Special conditions
      isShortSale,
      isREO,
      isForeclosure,
      isAgeRestricted,
      financingConsidered,
      attachedDetached,
    } = req.query;

    // Build filters with proper validation
    const filters: ListingFilters = {};

    // Basic numeric filters
    const parsedMinPrice = parseNumericFilter(minPrice);
    const parsedMaxPrice = parseNumericFilter(maxPrice);
    const parsedBeds = parseNumericFilter(beds);
    const parsedBaths = parseNumericFilter(baths);

    if (parsedMinPrice !== undefined) filters.minPrice = parsedMinPrice;
    if (parsedMaxPrice !== undefined) filters.maxPrice = parsedMaxPrice;
    if (parsedBeds !== undefined) filters.beds = parsedBeds;
    if (parsedBaths !== undefined) filters.baths = parsedBaths;

    // City filter
    if (city && typeof city === 'string') filters.city = city;

    // Property type (can be multiple, comma-separated)
    const parsedPropertyTypes = parseArrayFilter(propertyType);
    if (parsedPropertyTypes && parsedPropertyTypes.length > 0) {
      filters.propertyType = parsedPropertyTypes;
    }

    // Property type main (Residential, HighRise, Land, etc.)
    if (propertyTypeMain && typeof propertyTypeMain === 'string') {
      filters.propertyTypeMain = propertyTypeMain;
    }

    // Square footage
    const parsedMinSqft = parseNumericFilter(minSqft);
    const parsedMaxSqft = parseNumericFilter(maxSqft);
    if (parsedMinSqft !== undefined) filters.minSqft = parsedMinSqft;
    if (parsedMaxSqft !== undefined) filters.maxSqft = parsedMaxSqft;

    // Lot size
    const parsedMinLotSize = parseNumericFilter(minLotSize);
    const parsedMaxLotSize = parseNumericFilter(maxLotSize);
    if (parsedMinLotSize !== undefined) filters.minLotSize = parsedMinLotSize;
    if (parsedMaxLotSize !== undefined) filters.maxLotSize = parsedMaxLotSize;

    // Year built
    const parsedYearBuiltMin = parseNumericFilter(yearBuiltMin);
    const parsedYearBuiltMax = parseNumericFilter(yearBuiltMax);
    if (parsedYearBuiltMin !== undefined) filters.yearBuiltMin = parsedYearBuiltMin;
    if (parsedYearBuiltMax !== undefined) filters.yearBuiltMax = parsedYearBuiltMax;

    // Stories and garage
    const parsedStories = parseNumericFilter(stories);
    const parsedGarageSpaces = parseNumericFilter(garageSpaces);
    if (parsedStories !== undefined) filters.stories = parsedStories;
    if (parsedGarageSpaces !== undefined) filters.garageSpaces = parsedGarageSpaces;

    // Boolean filters
    const parsedHasPool = parseBooleanFilter(hasPool);
    const parsedHasHOA = parseBooleanFilter(hasHOA);
    if (parsedHasPool !== undefined) filters.hasPool = parsedHasPool;
    if (parsedHasHOA !== undefined) filters.hasHOA = parsedHasHOA;

    // Market filters
    const parsedDaysOnMarket = parseNumericFilter(daysOnMarketMax);
    const parsedMaxAssociationFee = parseNumericFilter(maxAssociationFee);
    if (parsedDaysOnMarket !== undefined) filters.daysOnMarketMax = parsedDaysOnMarket;
    if (parsedMaxAssociationFee !== undefined) filters.maxAssociationFee = parsedMaxAssociationFee;

    // Price reduced filter
    const parsedPriceReduced = parseBooleanFilter(priceReduced);
    if (parsedPriceReduced !== undefined) filters.priceReduced = parsedPriceReduced;

    // Special condition filters
    const parsedIsShortSale = parseBooleanFilter(isShortSale);
    const parsedIsREO = parseBooleanFilter(isREO);
    const parsedIsForeclosure = parseBooleanFilter(isForeclosure);
    const parsedIsAgeRestricted = parseBooleanFilter(isAgeRestricted);
    const parsedFinancingConsidered = parseBooleanFilter(financingConsidered);

    if (parsedIsShortSale !== undefined) filters.isShortSale = parsedIsShortSale;
    if (parsedIsREO !== undefined) filters.isREO = parsedIsREO;
    if (parsedIsForeclosure !== undefined) filters.isForeclosure = parsedIsForeclosure;
    if (parsedIsAgeRestricted !== undefined) filters.isAgeRestricted = parsedIsAgeRestricted;
    if (parsedFinancingConsidered !== undefined) filters.financingConsidered = parsedFinancingConsidered;

    // Attached/Detached
    if (attachedDetached === 'Attached' || attachedDetached === 'Detached') {
      filters.attachedDetached = attachedDetached;
    }

    console.log(`📡 Fetching listings with filters:`, JSON.stringify(filters, null, 2));

    let listings = await fetchActiveListings(filters);

    // Handle price reduced filter client-side (OData field comparison is unreliable)
    if (parsedPriceReduced === true) {
      listings = listings.filter(
        (l: { ListPrice?: number; OriginalListPrice?: number }) =>
          l.OriginalListPrice && l.ListPrice && l.ListPrice < l.OriginalListPrice
      );
      console.log(`📉 Filtered to ${listings.length} price-reduced listings`);
    }

    console.log(`✅ Returning ${listings.length} listings`);

    res.json(listings);
  } catch (error) {
    console.error('❌ Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

/**
 * GET /api/listings/price-reduced
 *
 * Special endpoint that fetches more listings and filters for price reductions
 * since OData field comparison (ListPrice lt OriginalListPrice) is unreliable
 */
app.get('/api/listings/price-reduced', async (_req, res) => {
  try {
    console.log(`📉 Fetching price-reduced listings...`);

    // Fetch a broad set of listings (we'll filter client-side)
    const allListings = await fetchActiveListings({});

    // Filter for price reductions
    const priceReduced = allListings.filter(
      (l: { ListPrice?: number; OriginalListPrice?: number }) =>
        l.OriginalListPrice && l.ListPrice && l.ListPrice < l.OriginalListPrice
    );

    // Sort by discount percentage (biggest discounts first)
    priceReduced.sort((a: { ListPrice: number; OriginalListPrice: number }, b: { ListPrice: number; OriginalListPrice: number }) => {
      const discountA = (a.OriginalListPrice - a.ListPrice) / a.OriginalListPrice;
      const discountB = (b.OriginalListPrice - b.ListPrice) / b.OriginalListPrice;
      return discountB - discountA;
    });

    console.log(`✅ Found ${priceReduced.length} price-reduced listings`);
    res.json(priceReduced);
  } catch (error) {
    console.error('❌ Error fetching price-reduced listings:', error);
    res.status(500).json({ error: 'Failed to fetch price-reduced listings' });
  }
});

/**
 * GET /api/listing/:id
 *
 * Fetch a single listing with ALL available fields for detail pages
 * :id is the MLS ListingId (e.g., 2721980)
 */
app.get('/api/listing/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Listing ID is required' });
      return;
    }

    console.log(`🏠 API request for listing: ${id}`);

    const listing = await fetchListingById(id);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    res.json(listing);
  } catch (error) {
    console.error('❌ Error fetching listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📍 Listings endpoint: http://localhost:${PORT}/api/listings`);
  console.log(`🏠 Serving Nevada / Clark County / Las Vegas Metro listings`);
});
