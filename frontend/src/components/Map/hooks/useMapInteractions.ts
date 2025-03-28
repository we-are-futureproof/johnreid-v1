import { useState, useCallback } from 'react';
import { 
  UMCLocation, 
  QualifiedCensusTract, 
  DifficultDevelopmentArea, 
  UseMapInteractionsReturn,
  MapLayerMouseEvent
} from '../types';
import { getPropertyFromCache } from '../../../lib/mapUtils';

export const useMapInteractions = (
  validProperties: UMCLocation[],
  _selectedProperty: UMCLocation | null, // Prefixed with underscore to indicate it's intentionally unused
  setSelectedProperty: (property: UMCLocation | null) => void,
  showQCT: boolean,
  showDDA: boolean,
  _selectedQCT: QualifiedCensusTract | null, // Prefixed with underscore to indicate it's intentionally unused
  setSelectedQCT: (qct: QualifiedCensusTract | null) => void,
  _selectedDDA: DifficultDevelopmentArea | null, // Prefixed with underscore to indicate it's intentionally unused
  setSelectedDDA: (dda: DifficultDevelopmentArea | null) => void
): UseMapInteractionsReturn => {
  const [focusType, setFocusType] = useState<'property' | 'qct' | 'dda' | null>(null);
  const [showFocusPanel, setShowFocusPanel] = useState<boolean>(false);

  // Handle map clicks for QCT, DDA zones, and UMC markers, with cycling support
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    // Collect all features at the click point
    const features = e.features || [];
    const clickPoint = e.lngLat;
    
    // Check what features were clicked
    const hasQCT = showQCT && features.some((f: any) => f.source === 'qct-source');
    const hasDDA = showDDA && features.some((f: any) => f.source === 'dda-source');
    
    // Check if we clicked near a UMC property marker (needs custom detection)
    let nearestProperty: UMCLocation | null = null;
    let minDistance = 0.02; // About ~1-2km depending on latitude
    
    if (validProperties.length > 0) {
      // Find nearest UMC location to the click point
      validProperties.forEach(property => {
        if (property.latitude && property.longitude) {
          const distance = Math.sqrt(
            Math.pow(clickPoint.lng - property.longitude, 2) + 
            Math.pow(clickPoint.lat - property.latitude, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            // TypeScript needs a clear assertion that this is a valid UMCLocation
            nearestProperty = property as UMCLocation;
          }
        }
      });
    }
    
    // Get the QCT and DDA data if present
    const qctFeature = hasQCT ? features.find((f: any) => f.source === 'qct-source') : null;
    const ddaFeature = hasDDA ? features.find((f: any) => f.source === 'dda-source') : null;
    const qctInfo = qctFeature ? qctFeature.properties as QualifiedCensusTract : null;
    const ddaInfo = ddaFeature ? ddaFeature.properties as DifficultDevelopmentArea : null;
    
    // If we have multiple features, implement cycling based on the current selection
    // Define the cycling logic when multiple features are present
    if ((hasQCT || hasDDA || nearestProperty) && (focusType !== null)) {
      let nextFocusType: 'property' | 'qct' | 'dda' | null = null;
      
      // Determine the next feature type based on current focus and available features
      if (focusType === 'property' && hasQCT) {
        nextFocusType = 'qct';
      } else if (focusType === 'property' && hasDDA && !hasQCT) {
        nextFocusType = 'dda';
      } else if (focusType === 'qct' && hasDDA) {
        nextFocusType = 'dda';
      } else if (focusType === 'qct' && !hasDDA && nearestProperty) {
        nextFocusType = 'property';
      } else if (focusType === 'dda' && nearestProperty) {
        nextFocusType = 'property';
      } else if (focusType === 'dda' && !nearestProperty && hasQCT) {
        nextFocusType = 'qct';
      } else if (hasQCT) {
        nextFocusType = 'qct';
      } else if (hasDDA) {
        nextFocusType = 'dda';
      } else if (nearestProperty) {
        nextFocusType = 'property';
      }
      
      // Apply the next selection
      if (nextFocusType === 'property' && nearestProperty) {
        setSelectedProperty(nearestProperty);
        setSelectedQCT(null);
        setSelectedDDA(null);
        setFocusType('property');
      } else if (nextFocusType === 'qct' && qctInfo) {
        setSelectedQCT(qctInfo);
        setSelectedProperty(null);
        setSelectedDDA(null);
        setFocusType('qct');
      } else if (nextFocusType === 'dda' && ddaInfo) {
        setSelectedDDA(ddaInfo);
        setSelectedProperty(null);
        setSelectedQCT(null);
        setFocusType('dda');
      }
      
      setShowFocusPanel(true);
      return;
    }
    
    // If no cycling is happening (first click or only one feature), use standard behavior
    
    // First priority: UMC Property
    if (nearestProperty) {
      // Set the nearest property as the selected property
      // Ensure TypeScript recognizes this as a UMCLocation
      const property = nearestProperty as UMCLocation;
      const propertyId = String(property.gcfa);
      if (propertyId) {
        const cachedProperty = getPropertyFromCache(propertyId);
        setSelectedProperty(cachedProperty || nearestProperty);
      } else {
        setSelectedProperty(nearestProperty);
      }
      setSelectedQCT(null);
      setSelectedDDA(null);
      setFocusType('property');
      setShowFocusPanel(true);
      return;
    }
    
    // Second priority: QCT
    if (hasQCT) {
      setSelectedQCT(qctInfo);
      setSelectedProperty(null);
      setSelectedDDA(null);
      setFocusType('qct');
      setShowFocusPanel(true);
      return;
    }
    
    // Third priority: DDA
    if (hasDDA) {
      setSelectedDDA(ddaInfo);
      setSelectedProperty(null);
      setSelectedQCT(null);
      setFocusType('dda');
      setShowFocusPanel(true);
    }
  }, [
    showQCT, 
    showDDA, 
    validProperties, 
    focusType, 
    setSelectedProperty, 
    setSelectedQCT, 
    setSelectedDDA
  ]);

  return {
    handleMapClick,
    focusType,
    setFocusType,
    showFocusPanel,
    setShowFocusPanel
  };
};
