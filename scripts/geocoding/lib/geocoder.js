// Geocoding service for UMC locations
import fetch from 'node-fetch';

/**
 * Geocoder class handles address geocoding operations
 */
export class Geocoder {
  /**
   * Initialize the geocoder
   * @param {string} mapboxToken - Mapbox API token
   * @param {Object} config - Geocoding configuration
   * @param {Object} rateLimiter - Rate limiter instance
   */
  constructor(mapboxToken, config, rateLimiter) {
    this.mapboxToken = mapboxToken;
    this.minRelevance = config.geocoding.min_relevance || 0.3;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Geocode a single address using Mapbox
   * @param {string} address - Street address
   * @param {string} city - City name
   * @param {string} state - State name or abbreviation
   * @returns {Promise<Object>} - Geocoding results including coordinates
   */
  async geocodeAddress(address, city, state) {
    // Combine address components, filtering out empty ones
    const addressComponents = [address, city, state].filter(Boolean);
    if (addressComponents.length === 0) {
      throw new Error('No address components provided');
    }
    
    // Format the full address for geocoding
    const fullAddress = addressComponents.join(', ');
    
    // Use rate limiter to respect API limits
    return this.rateLimiter.add(async () => {
      try {
        // URL encode the address
        const encodedAddress = encodeURIComponent(fullAddress);
        
        // Construct the Mapbox geocoding API URL
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.mapboxToken}&limit=1`;
        
        // Make the API request
        const response = await fetch(url);
        
        if (!response.ok) {
          const status = response.status;
          
          // Special handling for 422 errors (Unprocessable Entity) - typically for invalid addresses
          if (status === 422) {
            return {
              error: true,
              error_type: 'invalid_address_format',
              message: 'Address format could not be processed by geocoding API',
              full_address: fullAddress,
              status_code: status
            };
          }
          
          throw new Error(`Mapbox API error: ${status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
          throw new Error('No results found for this address');
        }
        
        const firstResult = data.features[0];
        const coordinates = firstResult.geometry.coordinates;
        
        // Get the relevance score from the first result
        const relevance = firstResult.relevance || 0;
        
        // Check if the result is reliable enough based on relevance score
        if (relevance < this.minRelevance) {
          console.log(`Low relevance score (${relevance}) below threshold of ${this.minRelevance} for: ${fullAddress}`);
          // Instead of throwing an error, return the result with a low_relevance flag
          return {
            latitude: coordinates[1],
            longitude: coordinates[0],
            full_address: firstResult.place_name,
            relevance: relevance,
            coordinates: coordinates,
            raw_result: firstResult,
            low_confidence: true  // Flag indicating this is a low confidence result
          };
        }
        
        // Return formatted geocoding results
        return {
          latitude: coordinates[1],
          longitude: coordinates[0],
          full_address: firstResult.place_name,
          relevance: relevance,
          coordinates: coordinates,
          raw_result: firstResult
        };
      } catch (error) {
        // Provide useful error information
        error.address = fullAddress;
        throw error;
      }
    });
  }

  /**
   * Validate that an address has the required components
   * More flexible validation that requires:
   * 1. Street address is always required
   * 2. At least one of city or state must be present
   * 
   * @param {string} address - Street address
   * @param {string} city - City name
   * @param {string} state - State name or abbreviation
   * @returns {Object} - Validation result with valid flag and missingComponents
   */
  validateAddressComponents(address, city, state) {
    const missingComponents = [];
    
    // Street address is required
    if (!address || address.trim() === '') {
      missingComponents.push('Address');
    }
    
    // Check if both city and state are missing
    const hasCity = city && city.trim() !== '';
    const hasState = state && state.trim() !== '';
    
    if (!hasCity) missingComponents.push('City');
    if (!hasState) missingComponents.push('State');
    
    // Validation logic: street address AND at least one of city or state
    const isValid = 
      (address && address.trim() !== '') && // Has street address
      (hasCity || hasState);                // Has at least city OR state
    
    if (!isValid) {
      return {
        valid: false,
        missingComponents
      };
    }
    
    return {
      valid: true,
      missingComponents: []
    };
  }
}
