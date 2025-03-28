/**
 * Cache service for database queries
 * Extracted from supabase.ts during refactoring
 */

import { UMCLocation, MapBounds } from '../types/dbTypes';

// Cache storage for UMC locations to reduce database calls
export interface UMCLocationCache {
  timestamp: number;
  bounds?: MapBounds;
  data: UMCLocation[];
}

// Initialize empty cache
export const umcLocationCache: UMCLocationCache = {
  timestamp: 0,
  data: []
};

// Cache expiration in milliseconds (5 minutes)
export const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Utility function to check if bounds are within cached bounds with padding
 * @param requestBounds Bounds being requested
 * @param cacheBounds Bounds that were previously cached
 * @returns Boolean indicating if request bounds are within cached bounds
 */
export function isBoundsWithinCache(requestBounds: MapBounds, cacheBounds: MapBounds): boolean {
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

/**
 * Updates the UMC location cache with new data
 * @param data Location data to cache
 * @param bounds Optional bounds to associate with the cached data
 */
export function updateUMCLocationCache(data: UMCLocation[], bounds?: MapBounds): void {
  umcLocationCache.timestamp = Date.now();
  umcLocationCache.data = data;
  umcLocationCache.bounds = bounds;
}

/**
 * Checks if the cache is valid for the given bounds
 * @param bounds The requested map bounds
 * @returns Boolean indicating if cache can be used
 */
export function isCacheValid(bounds?: MapBounds): boolean {
  if (!umcLocationCache.data.length) {
    return false;
  }
  
  const now = Date.now();
  const cacheAge = now - umcLocationCache.timestamp;
  
  // If no bounds requested, just check expiration
  if (!bounds) {
    return cacheAge < CACHE_EXPIRATION;
  }
  
  // If we have bounds cached, check if the requested bounds are within cached bounds
  if (umcLocationCache.bounds) {
    return cacheAge < CACHE_EXPIRATION && isBoundsWithinCache(bounds, umcLocationCache.bounds);
  }
  
  return false;
}

/**
 * Gets filtered locations from cache based on map bounds
 * @param bounds Map bounds to filter by
 * @returns Filtered UMC locations or empty array if cache invalid
 */
export function getLocationsFromCache(bounds?: MapBounds): UMCLocation[] {
  if (!isCacheValid(bounds) || !umcLocationCache.data.length) {
    return [];
  }
  
  // If no bounds, return all cached data
  if (!bounds) {
    return [...umcLocationCache.data];
  }
  
  // Filter the cached data to match the current bounds
  return umcLocationCache.data.filter(location => 
    location.latitude !== undefined && 
    location.longitude !== undefined &&
    location.latitude >= bounds.south &&
    location.latitude <= bounds.north &&
    location.longitude >= bounds.west &&
    location.longitude <= bounds.east
  );
}
