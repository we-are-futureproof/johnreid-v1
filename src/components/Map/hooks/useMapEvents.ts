import { useEffect, useCallback } from 'react';
import type { MapRef } from 'react-map-gl';
import { MapBounds } from '../types';

/**
 * Hook for managing map movement events and view state persistence
 */
export function useMapEvents(
  mapRef: React.RefObject<MapRef>,
  setMapBounds: (bounds: MapBounds) => void,
  searchLocation: any | null,
  updateMapBoundsFromRef: () => void
) {
  // Update bounds when the map view changes
  useEffect(() => {
    // After the map has moved & settled, update the bounds
    const handleMove = () => {
      updateMapBoundsFromRef();
    };
    
    if (mapRef.current) {
      // Access the underlying mapbox instance
      const map = mapRef.current;
      map.on('moveend', handleMove);
      return () => {
        map.off('moveend', handleMove);
      };
    }
  }, [mapRef, updateMapBoundsFromRef]);

  // Handle updates from search box
  useEffect(() => {
    if (searchLocation && mapRef.current) {
      // Fly to the searched location
      mapRef.current.flyTo({
        center: [searchLocation.longitude, searchLocation.latitude],
        zoom: searchLocation.zoom || 14, // Default zoom if not provided
        duration: 1000
      });
      
      // Update map bounds after animation completes
      const timer = setTimeout(() => {
        updateMapBoundsFromRef();
      }, 1200); // Slightly longer than the fly animation
      
      return () => clearTimeout(timer);
    }
  }, [searchLocation, mapRef, updateMapBoundsFromRef]);

  // Force an initial map load once the map is ready
  useEffect(() => {
    // Give the map a moment to fully initialize, then trigger a bounds update
    const timer = setTimeout(() => {
      updateMapBoundsFromRef();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [updateMapBoundsFromRef]);

  // Save map view state on movement end
  const handleMoveEnd = useCallback((evt: any) => {
    // Save the current view state to localStorage
    localStorage.setItem('umc-map-view', JSON.stringify(evt.viewState));
    
    // Also update map bounds which will trigger data fetching if needed
    updateMapBoundsFromRef();
  }, [updateMapBoundsFromRef, setMapBounds]);

  return { handleMoveEnd };
}

export default useMapEvents;
