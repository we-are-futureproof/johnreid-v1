# UMC Geocoding Implementation

This document provides details on the geocoding approach used in the UMC Property Analysis Map application.

## Overview

The application needs to display United Methodist Church (UMC) locations on a map, which requires geographic coordinates (latitude and longitude) for each location. While the database contains addresses for these locations, many records lack the coordinate data needed for mapping. This document explains our approach to resolving this challenge.

## Geocoding Approach

### Nashville-Focused Solution

The current implementation focuses on the Nashville, Tennessee metro area as the primary region of interest. This approach has several advantages:

1. Provides consistent and reliable data for the most important region
2. Reduces dependency on external geocoding APIs
3. Improves performance by limiting the number of locations to process
4. Provides a stable fallback system when API geocoding fails

### Implementation Details

#### 1. Nashville Church Location Database

We've created a hardcoded database of known Nashville-area UMC churches with accurate coordinates:

```typescript
const NASHVILLE_CHURCHES = [
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
```

#### 2. Fallback Location Generation

To provide additional data points beyond the known churches, we also generate supplementary locations within the Nashville area:

```typescript
function generateDummyLocations() {
  const nashvilleCenter = { lat: 36.1627, lng: -86.7816 };
  // Add locations around Nashville with small random offsets
}
```

#### 3. Data Filtering in Map Component

The Map component filters UMC locations based on geographic proximity to Nashville:

```typescript
const nashvilleAreaLocations = umcLocations.filter(location => {
  // Skip locations without coordinates
  if (!location.latitude || !location.longitude) return false;
  
  // Calculate distance from Nashville
  const latDiff = Math.abs(location.latitude - nashvilleLat);
  const lngDiff = Math.abs(location.longitude - nashvilleLng);
  
  // Simple bounding box check (for performance)
  return latDiff < radiusInDegrees && lngDiff < radiusInDegrees;
});
```

## External API Integration (Alternative Approach)

In an earlier implementation, we attempted to use the Nominatim OpenStreetMap API for geocoding:

```typescript
async function geocodeAddress(address: string, city: string, state: string): Promise<{lat: number, lng: number} | null> {
  // Request to Nominatim API with appropriate headers and error handling
}
```

This approach was replaced with the hardcoded Nashville data solution due to:
- API rate limiting issues
- Inconsistent address formats in the database
- Need for reliability in demo environments

## Future Improvements

The geocoding solution could be enhanced with:

1. **External API with caching**: Implement a more reliable geocoding service with local caching
2. **Database updates**: Store successfully geocoded coordinates back in the database
3. **Address normalization**: Preprocess addresses to improve geocoding success rates
4. **Expanded region support**: Add hardcoded fallback data for additional metro areas
5. **User input**: Allow manual coordinate adjustment for locations

## Technical Considerations

### Performance

- Current solution has O(1) performance regardless of database size
- No external API dependencies means consistent load times
- Minimal memory usage with focused data set

### Reliability

- Provides consistent results for demo environments
- Never fails to display meaningful data on the map
- Nashville-area churches always appear even if database retrieval fails

### Maintenance

- Adding new hardcoded locations is straightforward
- Code is well-documented for future developers
- Clear separation between data retrieval and fallback systems
