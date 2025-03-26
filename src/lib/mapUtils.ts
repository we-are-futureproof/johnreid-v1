/**
 * Map Utility Functions
 * Provides helper functions for map operations and optimizations
 */
import { UMCLocation } from './supabase';

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

/**
 * Convert degrees to radians
 * @param deg Angle in degrees
 * @returns Angle in radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

/**
 * Sort properties by distance from the center of the map
 * @param properties Array of UMC locations
 * @param centerLat Center latitude
 * @param centerLng Center longitude
 * @param limit Maximum number of properties to return
 * @returns Array of properties sorted by distance
 */
export function getPropertiesByDistance(
  properties: UMCLocation[], 
  centerLat: number, 
  centerLng: number,
  limit: number = 100
): UMCLocation[] {
  // Add distance to each property
  const propertiesWithDistance = properties
    .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number')
    .map(property => {
      const distance = calculateDistance(
        centerLat, 
        centerLng, 
        property.latitude as number, 
        property.longitude as number
      );
      return { ...property, distance };
    });
  
  // Sort by distance and limit the number of properties
  return propertiesWithDistance
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    .slice(0, limit);
}

/**
 * Cache for preloaded property data
 */
type PropertyCache = {
  [key: string | number]: UMCLocation;
};

export const preloadedPropertyCache: PropertyCache = {};

/**
 * Preload property data for faster marker hover
 * @param properties Array of properties to preload
 */
export function preloadPropertyData(properties: UMCLocation[]): void {
  // Store properties in cache for fast access
  properties.forEach(property => {
    if (property.gcfa) {
      preloadedPropertyCache[property.gcfa] = property;
    }
  });
}

/**
 * Get property data from cache
 * @param propertyId Property ID (gcfa)
 * @returns Property data or undefined if not in cache
 */
export function getPropertyFromCache(propertyId: string | number): UMCLocation | undefined {
  return preloadedPropertyCache[propertyId];
}
