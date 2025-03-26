import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Map,
  NavigationControl,
  Source,
  Layer,
  Marker
} from 'react-map-gl';
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
import { MapComponentProps, MapBounds } from './types';
import { MAPBOX_TOKEN, qctLayerStyle, ddaLayerStyle } from './constants';
import { getPropertyFromCache, preloadPropertyData } from './utils';
import MapControls from './MapControls';
import FocusPanel from './FocusPanel';
import StatusBar from './StatusBar';

// UI configuration stubs (would normally come from external files)
const tickerTapeConfig = {
  scrollDuration: 20,
  messageSpacing: 40,
  fontSize: 14
};

const filterPanelConfig = {
  startCollapsed: false
};

// Import actual data fetching functions and utilities
import { fetchUMCLocations } from '../../lib/supabase';
import { getPropertiesByDistance } from '../../lib/mapUtils';

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
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: 36.3, // North of Nashville
    south: 35.8, // South of Nashville
    east: -86.5, // East of Nashville
    west: -87.0  // West of Nashville
  });
  
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
  
  // Update bounds when the map view changes - simpler version to ensure reliable updates
  useEffect(() => {
    // After the map has moved & settled, update the bounds
    const handleMove = () => {
      updateMapBoundsFromRef();
    };
    
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        map.on('moveend', handleMove);
        return () => {
          map.off('moveend', handleMove);
        };
      }
    }
  }, [mapRef, updateMapBoundsFromRef]);

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

  const {
    statusMessages,
    addStatusMessage
  } = useStatusMessages();

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

  // UI panel state (collapsible left panel)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(filterPanelConfig.startCollapsed);
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

  // Handle updates from search box
  useEffect(() => {
    if (searchLocation && mapRef.current) {
      // Fly to the searched location
      mapRef.current.flyTo({
        center: [searchLocation.longitude, searchLocation.latitude],
        zoom: searchLocation.zoom,
        duration: 1000
      });
      
      // Explicitly trigger bounds update after animation completes
      const timer = setTimeout(() => {
        updateMapBoundsFromRef();
      }, 1200); // Slightly longer than the fly animation
      
      return () => clearTimeout(timer);
    }
  }, [searchLocation, mapRef, updateMapBoundsFromRef]);

  // Simple fetching mechanism for UMC locations
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

  // Get the map center coordinates for distance calculations
  const mapCenter = useMemo(() => {
    return {
      latitude: viewState.latitude,
      longitude: viewState.longitude
    };
  }, [viewState.latitude, viewState.longitude]);

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

  // Force an initial map load once the map is ready
  useEffect(() => {
    // Give the map a moment to fully initialize, then trigger a bounds update
    const timer = setTimeout(() => {
      updateMapBoundsFromRef();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [updateMapBoundsFromRef]);
  
  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: any }) => {
          setViewState(evt.viewState);
        }}
        // The moveend event listener we set up earlier will handle the bounds update
        onMoveEnd={(evt: any) => {
          // Save the current view state to localStorage
          localStorage.setItem('umc-map-view', JSON.stringify(evt.viewState));
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactiveLayerIds={[...(showQCT ? ['qct-layer'] : []), ...(showDDA ? ['dda-layer'] : [])]}
        onClick={handleMapClick}
        trackResize={false}
        collectResourceTiming={false}
        attributionControl={false}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-left" />
        
        {/* UMC Loading Indicator */}
        {isLoadingUMC && (
          <div className="absolute top-16 left-4 z-40 bg-white px-3 py-2 rounded-md shadow-md border border-blue-300 flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-blue-700">Loading UMC data...</span>
          </div>
        )}
        
        {/* Satellite View Toggle */}
        <div className="absolute left-4 bottom-24 z-50">
          <button 
            onClick={() => {
              const newStyle = mapStyle.includes('satellite') ? 
                'mapbox://styles/mapbox/light-v11' : 
                'mapbox://styles/mapbox/satellite-streets-v12';
              setMapStyle(newStyle);
              localStorage.setItem('umc-map-style', newStyle);
            }}
            className="bg-white py-3 px-4 rounded-lg shadow-xl border-2 border-blue-500 flex items-center space-x-3 hover:bg-blue-50 transition-colors"
            title={mapStyle.includes('satellite') ? 'Switch to street view' : 'Switch to satellite view'}
          >
            {mapStyle.includes('satellite') ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-semibold text-blue-600">
              {mapStyle.includes('satellite') ? 'Street View' : 'Satellite View'}
            </span>
          </button>
        </div>

        {/* QCT Layer */}
        {qctData && showQCT && (
          <Source
            id="qct-source"
            type="geojson"
            data={qctData}
          >
            <Layer {...qctLayerStyle} id="qct-layer" />
          </Source>
        )}

        {/* DDA Layer */}
        {ddaData && showDDA && (
          <Source
            id="dda-source"
            type="geojson"
            data={ddaData}
          >
            <Layer {...ddaLayerStyle} id="dda-layer" />
          </Source>
        )}

        {/* UMC Property Markers */}
        {validProperties && validProperties.length > 0 ? (
          validProperties.map(property => (
            <Marker
              key={property.gcfa}
              longitude={property.longitude as number}
              latitude={property.latitude as number}
              onMouseEnter={(e: React.MouseEvent) => {
              // @ts-ignore - Handle event type mismatch
              e.originalEvent?.stopPropagation?.();

              // Use preloaded property data if available for faster response
              if (property.gcfa) {
                const cachedProperty = getPropertyFromCache(property.gcfa);
                if (cachedProperty) {
                  setSelectedProperty(cachedProperty);
                  return;
                }
              }

              // Fall back to using the original property data
              setSelectedProperty(property);
            }}
            onMouseLeave={() => {
              // Only clear the selected property if focus panel isn't showing
              if (!showFocusPanel) {
                setSelectedProperty(null);
              }
            }}
            onClick={(e: React.MouseEvent) => {
              // Stop event propagation to prevent the map click handler from also firing
              // @ts-ignore - Handle event type mismatch
              e.originalEvent?.stopPropagation?.();
              
              // Get property data (using cache if available)
              let propertyToSelect = property;
              if (property.gcfa) {
                const cachedProperty = getPropertyFromCache(property.gcfa);
                if (cachedProperty) {
                  propertyToSelect = cachedProperty;
                }
              }
              
              // Check if we're already focused on a property and if it's the same one
              if (focusType === 'property' && 
                  selectedProperty?.gcfa !== undefined && 
                  propertyToSelect.gcfa !== undefined && 
                  selectedProperty.gcfa === propertyToSelect.gcfa) {
                // We're clicking the same property - check if we have QCT or DDA at this point
                // This will trigger the map click handler which will handle cycling
                return;
              }
              
              // Otherwise, select this property
              setSelectedProperty(propertyToSelect);
              setSelectedQCT(null);
              setSelectedDDA(null);
              setFocusType('property');
              setShowFocusPanel(true);
            }}
          >
            <div
              className={`umc-marker w-4 h-4 ${property.status?.toLowerCase() === 'active' ? 'bg-green-600' : 'bg-red-600'}`}
              title={`${property.name}\n${property.address}, ${property.city}, ${property.state}\nStatus: ${property.status}\nConference: ${property.conference}\nDistrict: ${property.district}`}
            />
          </Marker>
          ))
        ) : (
          // No properties to display
          <div key="no-properties" style={{ display: 'none' }} />
        )}
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
