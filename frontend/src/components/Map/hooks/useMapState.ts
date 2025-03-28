import { useState, useRef, useCallback } from 'react';
import { MapBounds, UseMapStateReturn } from '../types';

export const useMapState = (): UseMapStateReturn => {
  // Using any to avoid type conflicts between mapbox-gl and react-map-gl
  const mapRef = useRef<any>(null);
  
  // Initialize map view state from localStorage
  const [viewState, setViewState] = useState(() => {
    const savedViewState = localStorage.getItem('umc-map-view');
    if (savedViewState) {
      try {
        return JSON.parse(savedViewState);
      } catch (e) {
        console.error('Failed to parse saved map view state:', e);
      }
    }
    // Default to Nashville if no saved state
    return {
      longitude: -86.7816,  // Nashville, TN
      latitude: 36.1627,
      zoom: 9.5  // Closer zoom to show Nashville metro area
    };
  });
  
  // State to track current map style
  const [mapStyle, setMapStyle] = useState(() => {
    const savedStyle = localStorage.getItem('umc-map-style');
    return savedStyle || 'mapbox://styles/mapbox/light-v11';
  });
  
  // State for map bounds
  const [mapBounds, setMapBoundsState] = useState<MapBounds>({
    north: 37.1627,  // Northern bound for Nashville area
    south: 35.1627,  // Southern bound for Nashville area
    east: -85.7816,  // Eastern bound for Nashville area
    west: -87.7816   // Western bound for Nashville area
  });

  // Update map bounds when map is moved
  const updateMapBounds = useCallback(() => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        const newBounds: MapBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        };

        // Only update if bounds have significantly changed (to prevent excessive fetching)
        const boundsChanged =
          Math.abs(newBounds.north - mapBounds.north) > 0.02 ||
          Math.abs(newBounds.south - mapBounds.south) > 0.02 ||
          Math.abs(newBounds.east - mapBounds.east) > 0.02 ||
          Math.abs(newBounds.west - mapBounds.west) > 0.02;

        if (boundsChanged) {
          setMapBoundsState(newBounds);
        }
      }
    }
  }, [mapBounds]);

  // Create a wrapper for setMapBounds that matches our interface definition
  const setMapBounds = useCallback((bounds: MapBounds | null) => {
    if (bounds) {
      setMapBoundsState(bounds);
    }
    // If null is passed, we don't update the state
    // This maintains compatibility with our interface
  }, []);

  return {
    viewState,
    setViewState,
    mapStyle,
    setMapStyle,
    mapRef,
    mapBounds,
    setMapBounds,
    updateMapBounds
  };
};
