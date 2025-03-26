import { UMCLocation } from './types';

// Cache management for property data
const propertyCache: Record<string, UMCLocation> = {};

/**
 * Store a property in the memory cache for faster access
 */
export const cacheProperty = (property: UMCLocation) => {
  if (property?.gcfa) {
    // Convert gcfa to string for consistent key type in cache
    const cacheKey = String(property.gcfa);
    propertyCache[cacheKey] = property;
  }
};

/**
 * Get a property from cache by GCFA ID
 * @param gcfa Property GCFA ID (can be number or string)
 */
export const getPropertyFromCache = (gcfa: number | string) => {
  // Convert to string for cache lookup
  const cacheKey = String(gcfa);
  return propertyCache[cacheKey] || null;
};

/**
 * Preload property data for optimized performance
 */
export const preloadPropertyData = (properties: UMCLocation[]) => {
  // Store all properties in memory cache
  properties.forEach(property => {
    if (property?.gcfa) {
      cacheProperty(property);
    }
  });
};
