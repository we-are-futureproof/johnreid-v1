import { useState, useEffect, useMemo, useCallback } from 'react';
import { Map } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Disable Mapbox telemetry globally
// @ts-ignore - ignoring type issues with accessing _sentry property
if (mapboxgl.accessToken !== undefined) {
  // @ts-ignore
  if (mapboxgl._sentry) {
    // @ts-ignore
    mapboxgl._sentry.enabled = false;
  }
}

// Disable RTL text plugin which can also trigger telemetry
mapboxgl.setRTLTextPlugin('', null, true);

// Import local components and hooks
import {
  useMapState,
  usePropertyState,
  useZoneData,
  useMapInteractions,
  useStatusMessages
} from './hooks';
import usePropertyData from './hooks/usePropertyData';
import useMapEvents from './hooks/useMapEvents';
import { MapComponentProps, MapBounds } from './types';
import { MAPBOX_TOKEN } from './constants';
import { defaultMapBounds, tickerTapeConfig } from './config/mapConfig';

// Import components
import MapControls from './MapControls';
import FocusPanel from './FocusPanel';
import StatusBar from './StatusBar';
import MapLayers from './MapLayers';
import MapStyleToggle from './MapStyleToggle';
import MapHeader from './MapHeader';
import PropertyMarkers from './PropertyMarkers';

// Import utilities

export default function MapContainer({ searchLocation }: MapComponentProps) {
  // Initialize hooks
  const {
    viewState,
    setViewState,
    mapStyle,
    setMapStyle,
    mapRef
  } = useMapState();
  
  // Track map bounds separately for data fetching - initialize with Nashville area
  const [mapBounds, setMapBounds] = useState<MapBounds>(defaultMapBounds);
  
  // Track property enrichment processing state
  const [isProcessingEnrichment, setIsProcessingEnrichment] = useState(false);
  
  // Function to update map bounds directly from the map reference
  const updateMapBoundsFromRef = useCallback(() => {
    if (mapRef.current && mapRef.current.getMap()) {
      try {
        const bounds = mapRef.current.getMap().getBounds();
        if (bounds) {
          const newBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
          setMapBounds(newBounds);
        }
      } catch (error) {
        console.error('Error updating map bounds:', error);
      }
    }
  }, [mapRef]);



  // UI panel state (collapsible left panel)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Reference to track initial mount
  // No longer needed since we use the moveend event

  // Apply UI configuration via CSS variables when component mounts
  useEffect(() => {
    // Set CSS variables from our centralized configuration
    document.documentElement.style.setProperty('--ticker-scroll-duration', `${tickerTapeConfig.scrollDuration}s`);
    document.documentElement.style.setProperty('--ticker-message-spacing', `${tickerTapeConfig.messageSpacing}px`);
    document.documentElement.style.setProperty('--ticker-font-size', `${tickerTapeConfig.fontSize}px`);
  }, []);

  // Auto-close panel after 3 seconds on page load
  useEffect(() => {
    // Make sure panel is initially open
    setIsPanelCollapsed(false);

    // Set timer to close panel after 3 seconds
    const closeTimer = setTimeout(() => {
      setIsPanelCollapsed(true);

      // Trigger blinking effect after panel closes
      setTimeout(() => {
        setIsBlinking(true);

        // Stop blinking after animation completes (2 blinks)
        setTimeout(() => {
          setIsBlinking(false);
        }, 1200); // Slightly longer than the animation duration
      }, 100); // Small delay after panel closes
    }, 3000);

    // Clean up timer if component unmounts
    return () => clearTimeout(closeTimer);
  }, []);

  // Handle updates from search box via map events hook
  const { handleMoveEnd } = useMapEvents(mapRef, setMapBounds, searchLocation, updateMapBoundsFromRef);

  const {
    statusMessages,
    addStatusMessage
  } = useStatusMessages();

  const {
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
  } = usePropertyState(mapRef);

  // Get the map center coordinates for distance calculations
  const mapCenter = useMemo(() => {
    return {
      latitude: viewState.latitude,
      longitude: viewState.longitude
    };
  }, [viewState.latitude, viewState.longitude]);

  // Use the property data hook to manage loading UMC locations
  const { isLoadingUMC } = usePropertyData(
    mapBounds,
    mapCenter,
    properties,
    setProperties,
    addStatusMessage
  );

  const {
    qctData,
    ddaData,
    showQCT,
    showDDA,
    selectedQCT,
    setSelectedQCT,
    selectedDDA,
    setSelectedDDA,
    toggleQCTLayer,
    toggleDDALayer
  } = useZoneData(mapBounds, addStatusMessage);

  const {
    handleMapClick,
    focusType,
    setFocusType,
    showFocusPanel,
    setShowFocusPanel
  } = useMapInteractions(
    validProperties,
    selectedProperty,
    setSelectedProperty,
    showQCT,
    showDDA,
    selectedQCT,
    setSelectedQCT,
    selectedDDA,
    setSelectedDDA
  );
  
  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: any }) => {
          setViewState(evt.viewState);
        }}
        // The moveend event listener we set up earlier will handle the bounds update
        onMoveEnd={handleMoveEnd}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactiveLayerIds={[...(showQCT ? ['qct-layer'] : []), ...(showDDA ? ['dda-layer'] : [])]}
        onClick={handleMapClick}
        trackResize={false}
        collectResourceTiming={false}
        attributionControl={false}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Map Header with Navigation Controls and Loading Indicator */}
        <MapHeader isLoadingUMC={isLoadingUMC} />
        
        {/* Satellite View Toggle */}
        <MapStyleToggle mapStyle={mapStyle} setMapStyle={setMapStyle} />

        {/* Map Layers (QCT and DDA) */}
        <MapLayers 
          qctData={qctData}
          ddaData={ddaData}
          showQCT={showQCT}
          showDDA={showDDA}
        />

        {/* UMC Property Markers */}
        <PropertyMarkers
          properties={validProperties}
          selectedProperty={selectedProperty}
          setSelectedProperty={setSelectedProperty}
          showFocusPanel={showFocusPanel}
          setFocusType={(type: string) => setFocusType(type as 'property' | 'qct' | 'dda' | null)}
          setShowFocusPanel={setShowFocusPanel}
          setSelectedQCT={setSelectedQCT}
          setSelectedDDA={setSelectedDDA}
          isProcessingEnrichment={isProcessingEnrichment}
          setIsProcessingEnrichment={setIsProcessingEnrichment}
          addStatusMessage={addStatusMessage}
          setProperties={setProperties}
        />
      </Map>


      
      {/* Map Controls Panel */}
      <MapControls 
        showQCT={showQCT}
        showDDA={showDDA}
        showActiveProperties={showActiveProperties}
        showClosedProperties={showClosedProperties}
        toggleQCTLayer={toggleQCTLayer}
        toggleDDALayer={toggleDDALayer}
        setShowActiveProperties={setShowActiveProperties}
        setShowClosedProperties={setShowClosedProperties}
        isPanelCollapsed={isPanelCollapsed}
        setIsPanelCollapsed={setIsPanelCollapsed}
        isBlinking={isBlinking}
        validProperties={validProperties}
        setSelectedProperty={setSelectedProperty}
        flyToProperty={flyToProperty}
      />

      {/* Focus Panel */}
      <FocusPanel 
        showFocusPanel={showFocusPanel}
        setShowFocusPanel={setShowFocusPanel}
        focusType={focusType}
        setFocusType={setFocusType}
        selectedProperty={selectedProperty}
        selectedQCT={selectedQCT}
        selectedDDA={selectedDDA}
      />

      {/* Status Bar */}
      <StatusBar statusMessages={statusMessages} />
    </div>
  );
}
