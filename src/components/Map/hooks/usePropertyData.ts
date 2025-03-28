import { useState, useEffect, useRef } from 'react';
import { UMCLocation } from '../../../lib/supabase';
import { MapBounds } from '../types';
import { fetchUMCLocations } from '../../../lib/supabase';
import { getPropertiesByDistance, preloadPropertyData } from '../../../lib/mapUtils';

/**
 * Hook for managing UMC property data loading and state
 */
export function usePropertyData(
  mapBounds: MapBounds,
  mapCenter: { latitude: number; longitude: number },
  properties: UMCLocation[],
  setProperties: (properties: UMCLocation[]) => void,
  addStatusMessage: (message: string) => void
) {
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
    
    return () => {
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, [mapBounds, addStatusMessage, setProperties]);

  // Preload data for properties closest to map center
  useEffect(() => {
    if (properties.length === 0) return;

    // Get the closest properties to map center (up to 100)
    const closestProperties = getPropertiesByDistance(
      properties,
      mapCenter.latitude,
      mapCenter.longitude,
      100 // Limit to closest 100 properties
    );

    // Preload property data for fast access
    // Preload data silently
    preloadPropertyData(closestProperties);
  }, [properties, mapCenter]);

  return { isLoadingUMC };
}

export default usePropertyData;
