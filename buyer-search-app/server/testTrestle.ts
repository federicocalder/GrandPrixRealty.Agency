import { fetchActiveListings } from './trestleClient';

/**
 * Test script to verify Trestle API integration
 */
async function testTrestleAPI() {
  console.log('🔍 Testing Trestle API integration...\n');

  try {
    // Fetch listings with filters
    const listings = await fetchActiveListings({
      minPrice: 300000,
      maxPrice: 800000,
    });

    console.log(`✅ Successfully fetched ${listings.length} listings\n`);

    // Display first 3 listings in readable format
    const displayListings = listings.slice(0, 3);

    displayListings.forEach((listing, index) => {
      console.log(`--- Listing ${index + 1} ---`);
      console.log(`ID: ${listing.ListingId}`);
      console.log(`Price: $${listing.ListPrice?.toLocaleString() || 'N/A'}`);
      console.log(`Type: ${listing.PropertyType || 'N/A'}`);
      console.log(`Location: ${listing.City}, ${listing.StateOrProvince}`);
      console.log(`Address: ${listing.StreetNumber || ''} ${listing.StreetName || ''}`);
      console.log(`Beds: ${listing.BedroomsTotal || 'N/A'}`);
      console.log(`Baths: ${listing.BathroomsTotalInteger || 'N/A'}`);
      console.log(`Coordinates: ${listing.Latitude}, ${listing.Longitude}`);

      if (listing.Media && listing.Media.length > 0) {
        console.log(`Image: ${listing.Media[0].MediaURL}`);
      }

      console.log('');
    });

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing Trestle API:', error);
    process.exit(1);
  }
}

// Run the test
testTrestleAPI();
