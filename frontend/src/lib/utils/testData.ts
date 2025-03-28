/**
 * Test data utilities for the UMC Property Mapping application
 * Extracted from supabase.ts during refactoring
 */

import { UMCLocation, MapBounds } from '../types/dbTypes';

// Nashville-area church coordinates for testing
export const NASHVILLE_CHURCHES = [
  { name: 'Belmont United Methodist Church', lat: 36.1352, lng: -86.7988 },
  { name: 'West End United Methodist Church', lat: 36.1492, lng: -86.8074 },
  { name: 'McKendree United Methodist Church', lat: 36.1640, lng: -86.7819 },
  { name: 'Edgehill United Methodist Church', lat: 36.1486, lng: -86.7892 },
  { name: 'East End United Methodist Church', lat: 36.1782, lng: -86.7551 },
  { name: 'Calvary United Methodist Church', lat: 36.1663, lng: -86.7742 },
  { name: 'Sixty-First Avenue United Methodist Church', lat: 36.1686, lng: -86.8466 },
  { name: 'Woodbine United Methodist Church', lat: 36.1248, lng: -86.7318 },
  { name: 'Glendale United Methodist Church', lat: 36.0996, lng: -86.8157 }
];

/**
 * Generate dummy church locations around Nashville
 * @returns Array of location objects with name, lat, and lng
 */
function generateDummyLocations() {
  const nashvilleCenter = { lat: 36.1627, lng: -86.7816 };
  const locations = [];

  // Add the known Nashville churches
  for (const church of NASHVILLE_CHURCHES) {
    locations.push(church);
  }

  // Generate a few random locations around Nashville
  for (let i = 0; i < 10; i++) {
    // Random offset between -0.1 and 0.1 degrees (roughly 6-7 miles)
    const latOffset = (Math.random() - 0.5) * 0.2;
    const lngOffset = (Math.random() - 0.5) * 0.2;
    locations.push({
      name: `Nashville Area Church ${i+1}`,
      lat: nashvilleCenter.lat + latOffset,
      lng: nashvilleCenter.lng + lngOffset
    });
  }

  return locations;
}

/**
 * Creates fallback UMC locations for testing and development
 * @param bounds Optional map bounds to filter the created locations
 * @returns Array of UMC Location objects
 */
export function createFallbackUMCLocations(bounds?: MapBounds): UMCLocation[] {
  // Generate locations from our test data
  const dummyLocations = generateDummyLocations();
  
  // Convert to UMCLocation format
  const umcLocations = dummyLocations.map((loc, index) => {
    // If bounds are specified, only include locations within bounds
    if (bounds) {
      if (
        loc.lat < bounds.south ||
        loc.lat > bounds.north ||
        loc.lng < bounds.west ||
        loc.lng > bounds.east
      ) {
        return null;
      }
    }
    
    return {
      gcfa: 1000000 + index,  // Generate a fake GCFA ID
      url: `https://example.com/church/${index}`,
      name: loc.name,
      conference: 'Test Conference',
      district: 'Test District',
      city: 'Nashville',
      state: 'TN',
      zip: '37203',
      status: 'Active',
      address: '123 Test St, Nashville, TN 37203',
      details: { source: 'test_data' },
      latitude: loc.lat,
      longitude: loc.lng,
      viable: index % 3 === 0 ? true : index % 3 === 1 ? false : undefined  // Vary viability for testing
    };
  }).filter(Boolean) as UMCLocation[];  // Remove null entries and cast to UMCLocation[]
  
  return umcLocations;
}
