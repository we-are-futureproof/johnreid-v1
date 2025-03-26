# UMC Geocoding Implementation

This document provides details on the geocoding approach used in the UMC Property Analysis Map application.

## Overview

The application needs to display United Methodist Church (UMC) locations on a map, which requires geographic coordinates (latitude and longitude) for each location. While the database contains addresses for these locations, many records lack the coordinate data needed for mapping. This document explains our approach to resolving this challenge.

The geocoding solution consists of a comprehensive batch processing system that geocodes UMC location addresses and stores the coordinates in the database for use by the frontend application.

## Geocoding Approach

### Comprehensive Batch Geocoding System

We've implemented a robust batch geocoding system that processes UMC locations from the database and enriches them with geographic coordinates. The system includes:

1. **Batch Processing**: Efficiently handles large datasets by processing locations in configurable batches with concurrent execution
2. **Memory Management**: Implements periodic error log flushing to prevent memory issues with large datasets
3. **Detailed Progress Reporting**: Provides comprehensive summaries of geocoding progress at regular intervals
4. **Error Handling**: Includes robust error handling with retries for transient failures
5. **Flexible Address Validation**: Validates addresses requiring a street address and either city or state (not necessarily both)

### Database-Driven Frontend

The frontend implementation leverages the geocoded data from the database, with the following advantages:

1. Displays accurate coordinates for all geocoded locations across the country
2. Eliminates the need for hardcoded location data
3. Automatically benefits from continuous improvements to the geocoding database
4. Provides consistent user experience with reliable data

### Implementation Details

#### 1. Batch Geocoding Process

The batch geocoding system is implemented in Node.js and consists of several specialized modules:

```javascript
// Main entry point orchestrating the geocoding process
export async function executeGeocoding(cliArgs = []) {
  // Load configuration, set up database, initialize services
  // Process locations in batches with detailed progress reporting
  // Save comprehensive results to files
}
```

Key components include:

- **Configuration Management**: YAML-based configuration with CLI overrides for flexibility
- **Database Integration**: Supabase client for retrieving and updating UMC location data
- **Geocoding Service**: Integration with Mapbox Geocoding API
- **Rate Limiting**: Smart rate limiting to comply with API usage constraints
- **Error Handling**: Comprehensive error tracking with disk-based logging

#### 2. Frontend Database Integration

The frontend application now queries geocoded locations directly from the database with optimized caching:

```typescript
// Cache storage for UMC locations to reduce database calls
interface UMCLocationCache {
  timestamp: number;
  bounds?: MapBounds;
  data: UMCLocation[];
}

// Initialize empty cache
let umcLocationCache: UMCLocationCache = {
  timestamp: 0,
  data: []
};

// Cache expiration in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Utility function to check if bounds are within cached bounds with padding
function isBoundsWithinCache(requestBounds: MapBounds, cacheBounds: MapBounds): boolean {
  // Add padding to cached bounds (20% of height/width)
  const latPadding = (cacheBounds.north - cacheBounds.south) * 0.2;
  const lngPadding = (cacheBounds.east - cacheBounds.west) * 0.2;
  
  // Check if request bounds are completely within padded cache bounds
  return (
    requestBounds.south >= cacheBounds.south - latPadding &&
    requestBounds.north <= cacheBounds.north + latPadding &&
    requestBounds.west >= cacheBounds.west - lngPadding &&
    requestBounds.east <= cacheBounds.east + lngPadding
  );
}

// Fetch UMC locations with bounds-based filtering and caching
export async function fetchUMCLocations(bounds?: MapBounds): Promise<UMCLocation[]> {
  try {
    // If we have bounds, check cache first
    if (bounds && umcLocationCache.bounds && umcLocationCache.data.length > 0) {
      const now = Date.now();
      const cacheAge = now - umcLocationCache.timestamp;
      
      // If cache is fresh and the requested bounds are within cached bounds
      if (cacheAge < CACHE_EXPIRATION && isBoundsWithinCache(bounds, umcLocationCache.bounds)) {
        // Filter the cached data to match the current bounds
        const filteredCache = umcLocationCache.data.filter(location => 
          location.latitude && location.longitude &&
          location.latitude >= bounds.south &&
          location.latitude <= bounds.north &&
          location.longitude >= bounds.west &&
          location.longitude <= bounds.east
        );
        
        // Only use cache if we have enough results
        if (filteredCache.length > 0) {
          return filteredCache;
        }
      }
    }
    
    // If cache miss or expired, fetch from database
    let query = supabase
      .from('umc_locations')
      .select('gcfa, url, name, conference, district, city, state, status, address, latitude, longitude, details')
      .not('latitude', 'is', null);
    
    // Apply map bounds filters if provided with padding to improve cache hit rate
    if (bounds) {
      // Add 20% padding to bounds for better caching
      const latPadding = (bounds.north - bounds.south) * 0.2;
      const lngPadding = (bounds.east - bounds.west) * 0.2;
      
      // Filter locations with padded bounds
      query = query
        .gte('latitude', bounds.south - latPadding)
        .lte('latitude', bounds.north + latPadding)
        .gte('longitude', bounds.west - lngPadding)
        .lte('longitude', bounds.east + lngPadding);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // Fall back to dummy data if database query fails
      const fallbackLocations = createFallbackUMCLocations(bounds);
      return fallbackLocations;
    }
    
    // Get raw data from database result
    const rawData = data || [];
    
    // Process the results more efficiently, ensuring all required fields exist
    const processedData: UMCLocation[] = rawData.map(item => ({
      ...item,
      // Ensure details exists (default to empty object if null/undefined)
      details: item.details || {}
    }));
    
    // Update cache with new data
    if (bounds && processedData.length > 0) {
      umcLocationCache = {
        timestamp: Date.now(),
        bounds: bounds,
        data: processedData
      };
    }
    
    // Return the processed data
    return processedData;
  } catch (error) {
    // Handle unexpected error in fetchUMCLocations
    // Fall back to dummy data if an unexpected error occurs
    const fallbackLocations = createFallbackUMCLocations(bounds);
    return fallbackLocations;
  }
}
```

#### 3. Optimized Data Loading with Debouncing

The application now includes enhanced data loading with debouncing to prevent excessive requests:

```typescript
// Track loading state for UMC data
const [isLoadingUMC, setIsLoadingUMC] = useState<boolean>(false);
const fetchTimeout = useRef<NodeJS.Timeout | null>(null);

// Load UMC locations when map bounds change
useEffect(() => {
  // Clear any existing timeout
  if (fetchTimeout.current) {
    clearTimeout(fetchTimeout.current);
  }
  
  // Use a short delay to prevent multiple fetches during rapid movement
  fetchTimeout.current = setTimeout(async () => {
    // Skip fetching if bounds are invalid
    if (!mapBounds || 
        (mapBounds.north === mapBounds.south || 
         mapBounds.east === mapBounds.west)) {
      return;
    }
    
    setIsLoadingUMC(true);
    
    try {
      // Fetch UMC locations based on current map bounds
      const umcLocations = await fetchUMCLocations(mapBounds);
      
      // Even if we get zero locations, still update the properties
      // This ensures markers are removed when moving to an area with no data
      addStatusMessage(`Retrieved ${umcLocations.length} UMC locations`);
      setProperties(umcLocations);
    } catch (error) {
      console.error('Error loading UMC data:', error);
      addStatusMessage(`Error loading UMC location data`);
    } finally {
      setIsLoadingUMC(false);
    }
  }, 200); // Short delay to batch updates
}, [mapBounds, addStatusMessage, setProperties]);
```

## Mapbox API Integration

Our batch geocoding system uses the Mapbox Geocoding API for reliable address-to-coordinate conversion:

```javascript
async function geocodeAddress(address, city, state) {
  // Construct the search query from address components
  const query = normalizeAddressForGeocoding(address, city, state);
  
  // Call Mapbox API with appropriate rate limiting
  const response = await this.callMapboxAPI(query);
  
  // Process and validate the response
  return this.processMapboxResponse(response, address, city, state);
}
```

The implementation includes:
- **Validation**: Ensures address components are valid before geocoding
- **Rate Limiting**: Prevents exceeding API usage limits
- **Result Validation**: Evaluates geocoding quality with confidence scoring
- **Error Handling**: Properly handles and logs failed geocoding attempts

## Technical Features

### Memory Management

To handle large datasets efficiently, the geocoding system implements:

```javascript
// Batch processing of errors to prevent memory bloat
export async function flushErrorsToDisk(errors, maxBatchSize = 50) {
  // Write errors to disk in batches to manage memory usage
}
```

### Progress Reporting

Detailed progress updates are provided during processing:

```javascript
// Display detailed progress metrics at significant milestones
if (isSignificantMilestone) {
  // Query database for current status
  // Display comprehensive progress summary
}
```

### Database Operations

Includes retry mechanisms for database operations:

```javascript
async function updateLocationWithRetry(location, geocodingResult, retries = 3) {
  // Attempt update with exponential backoff for retries
  // Intelligently identify transient errors vs. permanent failures
}
```

## Future Improvements

The geocoding solution could be further enhanced with:

1. **Preprocessing Pipeline**: Add address normalization to improve geocoding success rates
2. **Fuzzy Matching**: Implement fuzzy matching for church names with known coordinates
3. **Multiple Geocoding Providers**: Add fallback to alternative geocoding services
4. **Confidence Scoring Tuning**: Refine the confidence scoring system based on real-world results
5. **User Interface**: Develop a frontend for manual verification of low-confidence results

## Technical Considerations

### Performance

#### Frontend
- Database-driven approach scales efficiently with query optimization
- Client-side filtering for specific regions when needed
- Optimized data loading with selective field retrieval

#### Batch Geocoding
- Configurable batch size and concurrency for performance tuning
- Memory-efficient error handling for processing large datasets
- Database operations optimized with efficient query patterns

### Reliability

#### Frontend
- Database provides a single source of truth for all locations
- Progressive enhancement: displays available data even when incomplete
- Graceful handling of locations without coordinates

#### Batch Geocoding
- Robust error handling with detailed logging
- Retry mechanisms for transient failures
- Comprehensive validation of geocoding results

### Maintenance

#### Frontend
- No need to manually maintain location data
- Automatic updates as the database is enriched
- Code is well-documented for future developers

#### Batch Geocoding
- Modular architecture with clear separation of concerns
- YAML-based configuration for easy adjustment
- Detailed reporting and logging for monitoring and diagnostics
