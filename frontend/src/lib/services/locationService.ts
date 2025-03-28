/**
 * Location service for UMC location data
 * Extracted from supabase.ts during refactoring
 */

import { supabase } from '../supabase';
import { UMCLocation, MapBounds } from '../types/dbTypes';
import { 
  umcLocationCache, 
  getLocationsFromCache, 
  updateUMCLocationCache 
} from './cacheService';
import { createFallbackUMCLocations } from '../utils/testData';

/**
 * Fetches UMC locations from the database or cache
 * @param bounds Optional map bounds to filter the locations
 * @returns Promise with UMC locations
 */
export async function fetchUMCLocations(
  bounds?: MapBounds
): Promise<UMCLocation[]> {
  try {
    // First, check if we can use the cache
    if (bounds) {
      const cachedLocations = getLocationsFromCache(bounds);
      if (cachedLocations.length > 0) {
        return cachedLocations;
      }
    }
    
    // Prepare query for UMC locations
    let query = supabase
      .from('umc_locations')
      .select('*');
    
    // Add bounds filtering if bounds are provided
    if (bounds) {
      query = query
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching UMC locations:', error);
      // Return fallback data if we have an error
      return createFallbackUMCLocations(bounds);
    }
    
    if (!data || data.length === 0) {
      console.warn('No UMC locations found in database, using fallback data');
      return createFallbackUMCLocations(bounds);
    }
    
    // Process data to ensure it has the expected shape
    const locations = data.map(location => ({
      ...location,
      // Ensure we have numeric coordinates for mapping
      latitude: location.latitude !== null ? Number(location.latitude) : undefined,
      longitude: location.longitude !== null ? Number(location.longitude) : undefined,
      // Parse the details field if it's a string
      details: typeof location.details === 'string'
        ? JSON.parse(location.details)
        : location.details,
      // Parse smarty data if it's a string
      smarty: location.smarty && typeof location.smarty === 'string'
        ? JSON.parse(location.smarty)
        : location.smarty
    }));
    
    // Update cache with the new locations
    updateUMCLocationCache(locations, bounds);
    
    return locations;
  } catch (error) {
    console.error('Error in fetchUMCLocations:', error);
    // Return fallback data in case of any error
    return createFallbackUMCLocations(bounds);
  }
}

/**
 * Updates a UMC location in the database
 * @param location The location to update
 * @returns Promise with the updated location or null on error
 */
export async function updateUMCLocation(
  location: UMCLocation
): Promise<UMCLocation | null> {
  try {
    if (!location.gcfa) {
      console.error('Cannot update location without GCFA ID');
      return null;
    }
    
    // Prepare data for Supabase update
    const updateData = {
      ...location,
      // Convert smarty to string if it's an object
      smarty: location.smarty && typeof location.smarty === 'object'
        ? JSON.stringify(location.smarty)
        : location.smarty,
      // Convert details to string if it's an object
      details: location.details && typeof location.details === 'object'
        ? JSON.stringify(location.details)
        : location.details
    };
    
    // Update the location in the database
    const { data, error } = await supabase
      .from('umc_locations')
      .update(updateData)
      .eq('gcfa', location.gcfa)
      .select();
    
    if (error) {
      console.error(`Error updating location ${location.name} (GCFA: ${location.gcfa}):`, error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.warn(`No location updated for ${location.name} (GCFA: ${location.gcfa})`);
      return null;
    }
    
    // Update the location in the cache if it exists
    const cacheIndex = umcLocationCache.data.findIndex(
      item => item.gcfa === location.gcfa
    );
    
    if (cacheIndex !== -1) {
      // Parse the result from the database to match our expected format
      const updatedLocation = {
        ...data[0],
        latitude: data[0].latitude !== null ? Number(data[0].latitude) : undefined,
        longitude: data[0].longitude !== null ? Number(data[0].longitude) : undefined,
        details: typeof data[0].details === 'string'
          ? JSON.parse(data[0].details)
          : data[0].details,
        smarty: data[0].smarty && typeof data[0].smarty === 'string'
          ? JSON.parse(data[0].smarty)
          : data[0].smarty
      };
      
      // Update the cache entry
      umcLocationCache.data[cacheIndex] = updatedLocation;
      
      return updatedLocation;
    }
    
    return data[0];
  } catch (error) {
    console.error(`Error updating location ${location.name} (GCFA: ${location.gcfa}):`, error);
    return null;
  }
}
