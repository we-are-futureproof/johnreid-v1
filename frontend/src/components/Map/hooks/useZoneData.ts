import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  QualifiedCensusTract, 
  DifficultDevelopmentArea, 
  MapBounds, 
  UseZoneDataReturn 
} from '../types';
import { 
  fetchQualifiedCensusTracts, 
  fetchDifficultDevelopmentAreas 
} from '../../../lib/supabase';

export const useZoneData = (
  mapBounds: MapBounds, 
  addStatusMessage: (message: string) => void
): UseZoneDataReturn => {
  // Zone data states
  const [qctData, setQctData] = useState<any>(null);
  const [ddaData, setDdaData] = useState<any>(null);
  const [selectedQCT, setSelectedQCT] = useState<QualifiedCensusTract | null>(null);
  const [selectedDDA, setSelectedDDA] = useState<DifficultDevelopmentArea | null>(null);
  
  // Layer visibility states
  const [showQCT, setShowQCT] = useState(() => {
    const saved = localStorage.getItem('umc-show-qct');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [showDDA, setShowDDA] = useState(() => {
    const saved = localStorage.getItem('umc-show-dda');
    return saved !== null ? saved === 'true' : true;
  });

  // Create a ref to track if this is the first time loading zones
  const isFirstZoneLoad = useRef(true);
  
  // Toggle layer visibility
  const toggleQCTLayer = useCallback(() => {
    const newValue = !showQCT;
    setShowQCT(newValue);
    localStorage.setItem('umc-show-qct', String(newValue));
  }, [showQCT]);

  const toggleDDALayer = useCallback(() => {
    const newValue = !showDDA;
    setShowDDA(newValue);
    localStorage.setItem('umc-show-dda', String(newValue));
  }, [showDDA]);

  // Fetch QCT and DDA data based on map bounds
  useEffect(() => {
    const loadZoneData = async () => {
      try {
        // Only show loading message on the first load
        if (isFirstZoneLoad.current) {
          addStatusMessage('Loading map overlays...');
        }
        
        // Fetch Qualified Census Tracts for the current map view
        const qctZones = await fetchQualifiedCensusTracts(mapBounds);
        if (qctZones.length > 0) {
          // Convert to GeoJSON format
          const qctGeoJSON = {
            type: 'FeatureCollection',
            features: qctZones.map((zone: QualifiedCensusTract) => ({
              type: 'Feature',
              geometry: zone.geom,
              properties: {
                id: zone.id,
                geoid: zone.geoid,
                tract: zone.tract,
                state: zone.state,
                county: zone.county,
                name: zone.name,
                ...(zone.properties || {})
              }
            }))
          };
          setQctData(qctGeoJSON);
          
          // Only show status message on the first successful load
          if (isFirstZoneLoad.current) {
            addStatusMessage(`Loaded ${qctZones.length} QCT zones`);
          }
        }

        // Fetch Difficult Development Areas for the current map view
        const ddaZones = await fetchDifficultDevelopmentAreas(mapBounds);
        if (ddaZones.length > 0) {
          // Convert to GeoJSON format
          const ddaGeoJSON = {
            type: 'FeatureCollection',
            features: ddaZones.map((zone: DifficultDevelopmentArea) => ({
              type: 'Feature',
              geometry: zone.geom,
              properties: {
                id: zone.id,
                dda_code: zone.dda_code,
                dda_type: zone.dda_type,
                dda_name: zone.dda_name,
                state: zone.state || '',
                county: zone.county || '',
                ...(zone.properties || {})
              }
            }))
          };
          setDdaData(ddaGeoJSON);
          
          // Only show status message on the first successful load
          if (isFirstZoneLoad.current) {
            addStatusMessage(`Loaded ${ddaZones.length} DDA zones`);
            // Mark that we've completed the first load
            isFirstZoneLoad.current = false;
          }
        }
      } catch (error) {
        // Show error message only on the first load attempt
        if (isFirstZoneLoad.current) {
          addStatusMessage('Error loading overlay zones');
          isFirstZoneLoad.current = false;
        }
      }
    };

    loadZoneData();
  }, [mapBounds, addStatusMessage]);

  return {
    qctData,
    ddaData,
    showQCT,
    setShowQCT,
    showDDA,
    setShowDDA,
    selectedQCT,
    setSelectedQCT,
    selectedDDA,
    setSelectedDDA,
    toggleQCTLayer,
    toggleDDALayer
  };
};
