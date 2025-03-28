import { useState, useCallback, useMemo } from 'react';
import { UMCLocation, UsePropertyStateReturn } from '../types';
import { getPropertyFromCache } from '../../../lib/mapUtils';
import { mapAnimationConfig } from '../../../styles/uiConfig';

export const usePropertyState = (mapRef: React.RefObject<any>): UsePropertyStateReturn => {
  // Property states
  const [properties, setProperties] = useState<UMCLocation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<UMCLocation | null>(null);
  
  // Property filter states
  const [showActiveProperties, setShowActiveProperties] = useState(() => {
    const saved = localStorage.getItem('umc-show-active');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [showClosedProperties, setShowClosedProperties] = useState(() => {
    const saved = localStorage.getItem('umc-show-closed');
    return saved !== null ? saved === 'true' : false;
  });

  // Filter properties based on coordinates and status filters
  const validProperties = useMemo(() => {
    // Count variables for metrics
    let missingStatusCount = 0;
    let activeCount = 0;
    let closedCount = 0;
    let otherStatusCount = 0;
    let invalidCoordinatesCount = 0;
    
    const filtered = properties.filter(p => {
      // Must have valid coordinates
      const hasValidCoordinates = typeof p.latitude === 'number' && typeof p.longitude === 'number';
      
      if (!hasValidCoordinates) {
        invalidCoordinatesCount++;
        return false;
      }
      
      // Always default to showing properties if status is missing
      if (!p.status) {
        missingStatusCount++;
        return true;
      }
      
      const status = p.status.toLowerCase();
      
      // Count different status types
      if (status === 'active') activeCount++;
      else if (status === 'closed') closedCount++;
      else otherStatusCount++;
      
      // Apply status filters
      return (status === 'active' && showActiveProperties) || 
             (status === 'closed' && showClosedProperties) ||
             // Include properties with other status values regardless of filters
             (status !== 'active' && status !== 'closed');
    });
    
    // Track filter metrics without logging
    // We could add telemetry here in the future
    
    return filtered;
  }, [properties, showActiveProperties, showClosedProperties]);

  // Fly to a specific property
  const flyToProperty = useCallback((property: UMCLocation) => {
    if (mapRef.current && property.longitude && property.latitude) {
      mapRef.current.flyTo({
        center: [property.longitude, property.latitude],
        zoom: 14,
        duration: mapAnimationConfig.flyToDuration
      });
      
      // If property has GCFA ID, try to get the full cached property data
      if (property.gcfa) {
        const cachedProperty = getPropertyFromCache(property.gcfa);
        setSelectedProperty(cachedProperty || property);
      } else {
        setSelectedProperty(property);
      }
    }
  }, [mapRef]);

  return {
    properties,
    setProperties,
    validProperties,
    selectedProperty,
    setSelectedProperty,
    showActiveProperties,
    setShowActiveProperties,
    showClosedProperties,
    setShowClosedProperties,
    flyToProperty
  };
};
