import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Map,
  NavigationControl,
  Source,
  Layer,
  Marker,
  LayerProps
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
import {
  fetchUMCLocations,
  fetchQualifiedCensusTracts,
  fetchDifficultDevelopmentAreas,
  UMCLocation,
  QualifiedCensusTract,
  DifficultDevelopmentArea,
  MapBounds
} from '../lib/supabase';
import { tickerTapeConfig, mapAnimationConfig, filterPanelConfig } from '../styles/uiConfig';
import { getPropertiesByDistance, preloadPropertyData, getPropertyFromCache } from '../lib/mapUtils';

// Get Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Layer styles
const qctLayerStyle: LayerProps = {
  id: 'qct-layer',
  type: 'fill',
  paint: {
    'fill-color': '#0080ff',
    'fill-opacity': 0.3,
    'fill-outline-color': '#0066cc'
  }
};

const ddaLayerStyle: LayerProps = {
  id: 'dda-layer',
  type: 'fill',
  paint: {
    'fill-color': '#ff8000',
    'fill-opacity': 0.3,
    'fill-outline-color': '#cc6600'
  }
};

interface MapComponentProps {
  searchLocation: {
    latitude: number;
    longitude: number;
    zoom: number;
  } | null;
}

export default function MapComponent({ searchLocation }: MapComponentProps) {
  // Using any to avoid type conflicts between mapbox-gl and react-map-gl
  const mapRef = useRef<any>(null);
  const [qctData, setQctData] = useState<any>(null);
  const [ddaData, setDdaData] = useState<any>(null);
  const [properties, setProperties] = useState<UMCLocation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<UMCLocation | null>(null);
  const [selectedQCT, setSelectedQCT] = useState<QualifiedCensusTract | null>(null);
  const [selectedDDA, setSelectedDDA] = useState<DifficultDevelopmentArea | null>(null);
  const [showFocusPanel, setShowFocusPanel] = useState<boolean>(false);
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: 37.1627,  // Northern bound for Nashville area
    south: 35.1627,  // Southern bound for Nashville area
    east: -85.7816,  // Eastern bound for Nashville area
    west: -87.7816   // Western bound for Nashville area
  });
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
  const [showQCT, setShowQCT] = useState(() => {
    const saved = localStorage.getItem('umc-show-qct');
    return saved !== null ? saved === 'true' : true;
  });
  const [showDDA, setShowDDA] = useState(() => {
    const saved = localStorage.getItem('umc-show-dda');
    return saved !== null ? saved === 'true' : true;
  });

  // Track which type of item is currently in focus
  const [focusType, setFocusType] = useState<'property' | 'qct' | 'dda' | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(filterPanelConfig.startCollapsed);
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Property filter states
  const [showActiveProperties, setShowActiveProperties] = useState(() => {
    const saved = localStorage.getItem('umc-show-active');
    return saved !== null ? saved === 'true' : true;
  });
  const [showClosedProperties, setShowClosedProperties] = useState(() => {
    const saved = localStorage.getItem('umc-show-closed');
    return saved !== null ? saved === 'true' : false;
  }); // Track when to show blinking effect
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const messageRemovalTimerRef = useRef<NodeJS.Timeout | null>(null);


  // Function to remove messages that have scrolled off screen
  const startMessageRemovalTimer = useCallback(() => {
    // Clear any existing message removal timer
    if (messageRemovalTimerRef.current) {
      clearTimeout(messageRemovalTimerRef.current);
    }

    // Clear messages after the configured lifespan
    // This ensures messages don't reappear and only show once
    messageRemovalTimerRef.current = setTimeout(() => {
      setStatusMessages([]);
    }, tickerTapeConfig.messageLifespan);
  }, []);

  // Function to add status messages - adds to the queue without clearing
  const addStatusMessage = useCallback((message: string) => {
    // Check if message already exists to prevent duplicates
    setStatusMessages(prev => {
      // Skip if this exact message already exists in the array
      if (prev.includes(message)) {
        return prev;
      }

      const newMessages = [...prev, message];
      return newMessages;
    });

    // Start the timer to remove messages after they've scrolled off-screen
    startMessageRemovalTimer();
  }, [startMessageRemovalTimer]);

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

  // Filter properties based on coordinates and status filters
  const validProperties = properties.filter(p => {
    // Must have valid coordinates
    const hasValidCoordinates = typeof p.latitude === 'number' && typeof p.longitude === 'number';
    
    // Apply status filters
    const matchesStatusFilter = 
      (p.status?.toLowerCase() === 'active' && showActiveProperties) || 
      (p.status?.toLowerCase() === 'closed' && showClosedProperties) ||
      // Include properties with undefined or other status values regardless of filters
      (p.status?.toLowerCase() !== 'active' && p.status?.toLowerCase() !== 'closed');
    
    return hasValidCoordinates && matchesStatusFilter;
  });

  // Update map bounds when map is moved
  const updateMapBounds = () => {
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
          setMapBounds(newBounds);
          // Map bounds have changed significantly
        }
      }
    }
  };

  // No extra state needed, we'll use the existing focusType state for cycling
  
  // Handle map clicks for QCT, DDA zones, and UMC markers, with cycling support
  const handleMapClick = useCallback((e: any) => {
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
    // Handle single feature clicks
    
    // First priority: UMC Property
    if (nearestProperty) {
      // Set the nearest property as the selected property
      const propertyId = nearestProperty.gcfa as string | undefined;
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
  }, [showQCT, showDDA, validProperties, focusType]);

  // Create a ref to track if this is the first time loading zones
  const isFirstZoneLoad = useRef(true);
  
  // Handle updates from search box
  useEffect(() => {
    if (searchLocation && mapRef.current) {
      // Fly to the searched location
      mapRef.current.flyTo({
        center: [searchLocation.longitude, searchLocation.latitude],
        zoom: searchLocation.zoom,
        duration: mapAnimationConfig.flyToDuration
      });
    }
  }, [searchLocation]);
  
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
  }, [mapBounds, addStatusMessage]); // Re-fetch when map bounds change

  // Fetch UMC locations whenever map bounds changes
  // Use a ref to track if we're mounting for the first time
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadUmcData = async () => {
      try {
        // Fetch UMC locations based on current map bounds
        const umcLocations = await fetchUMCLocations(mapBounds);

        // Only show this one status message
        addStatusMessage(`Retrieved ${umcLocations.length} UMC locations`);
        setProperties(umcLocations);
      } catch (error) {
        // Only show error in ticker if needed
        addStatusMessage(`Error loading UMC location data`);
      }
    };

    // Clear any existing messages when the bounds change to avoid stale messages
    if (!isInitialMount.current) {
      setStatusMessages([]);
    }

    isInitialMount.current = false;
    loadUmcData();
  }, [mapBounds, addStatusMessage]); // Re-fetch when bounds changes

  // No debug output needed anymore

  // Toggle layer visibility
  const toggleQCTLayer = () => {
    const newValue = !showQCT;
    setShowQCT(newValue);
    localStorage.setItem('umc-show-qct', String(newValue));
  };

  const toggleDDALayer = () => {
    const newValue = !showDDA;
    setShowDDA(newValue);
    localStorage.setItem('umc-show-dda', String(newValue));
  };

  // Fly to a specific property
  const flyToProperty = (property: UMCLocation) => {
    if (mapRef.current && property.longitude && property.latitude) {
      mapRef.current.flyTo({
        center: [property.longitude, property.latitude],
        zoom: 14,
        duration: mapAnimationConfig.flyToDuration
      });
      setSelectedProperty(property);
    }
  };

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

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: any }) => {
          setViewState(evt.viewState);
          // Don't save every minor move, use a debounced save on move end
        }}
        onMoveEnd={(evt: any) => {
          updateMapBounds();
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
        {validProperties.map(property => (
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
        ))}

        {/* We've removed the Property Popup in favor of the Focus panel */}
      </Map>

      {/* CSS for blinking animation */}
      <style>
        {`
          @keyframes blink-red {
            0%, 100% { background-color: transparent; }
            25%, 75% { background-color: #ff0000; }
          }
          .blink-animation {
            animation: blink-red 0.6s ease-in-out 2;
            transition: background-color 0.3s;
          }
        `}
      </style>

      {/* Left side drawer toggle button/tab */}
      <div
        className={`drawer-toggle-tab ${!isPanelCollapsed ? 'active' : ''} ${isBlinking ? 'blink-animation' : ''}`}
        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        title={isPanelCollapsed ? "Open controls" : "Close controls"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isBlinking ? 'text-white' : 'text-gray-700'}`} viewBox="0 0 20 20" fill="currentColor">
          {isPanelCollapsed ? (
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          )}
        </svg>
      </div>

      {/* Left side drawer panel */}
      <div className={`drawer-side-left ${isPanelCollapsed ? 'collapsed' : ''}`}>
        <div className="p-4 h-full flex flex-col" style={{ overflow: 'hidden' }}>
          <h2 className="text-xl font-bold mb-4">Map Controls</h2>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showQCT}
                  onChange={toggleQCTLayer}
                  className="mr-2"
                />
                QCT Zones
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDDA}
                  onChange={toggleDDALayer}
                  className="mr-2"
                />
                DDA Zones
              </label>
            </div>
          </div>
          
          {/* Property Filters Section */}
          <div className="mb-4 mt-6">
            <h3 className="font-semibold mb-2">Property Filters</h3>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showActiveProperties}
                  onChange={(e) => {
                    setShowActiveProperties(e.target.checked);
                    localStorage.setItem('umc-show-active', String(e.target.checked));
                  }}
                  className="mr-2"
                />
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2"></span>
                  Active Properties
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showClosedProperties}
                  onChange={(e) => {
                    setShowClosedProperties(e.target.checked);
                    localStorage.setItem('umc-show-closed', String(e.target.checked));
                  }}
                  className="mr-2"
                />
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
                  Closed Properties
                </span>
              </label>
            </div>
          </div>

          {/* Properties Section - increased padding above */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex-grow flex flex-col">
            <h3 className="font-semibold mb-2">Properties ({validProperties.length})</h3>
            {/* Full-height scrollable container with permanent scrollbar */}
            <div
              className="overflow-y-auto flex-grow"
              style={{
                flex: 1, 
                height: '100%',
                maxHeight: 'calc(100vh - 350px)',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc',
              }}
            >
              <style>
                {`
                  /* Custom scrollbar styles to ensure it's always visible */
                  .overflow-y-scroll::-webkit-scrollbar {
                    width: 8px;
                    display: block;
                  }

                  .overflow-y-scroll::-webkit-scrollbar-track {
                    background: #f7fafc;
                  }

                  .overflow-y-scroll::-webkit-scrollbar-thumb {
                    background-color: #cbd5e0;
                    border-radius: 4px;
                  }
                `}
              </style>
              {properties.length > 0 ? (
                <ul className="space-y-2 pr-2">
                  {validProperties.map(property => (
                    <li
                      key={property.gcfa}
                      className="p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-100"
                      onClick={() => flyToProperty(property)}
                    >
                      <p className="font-medium">
                        {property.name.length > 30
                          ? `${property.name.substring(0, 30)}...`
                          : property.name}
                      </p>
                      <p className="text-sm text-gray-600">{property.city}, {property.state}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No properties match the current filters</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side focus panel */}
      <div className={`focus-panel p-4 rounded shadow-lg ${!showFocusPanel ? 'hidden' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Focus</h2>
          <button
            onClick={() => {
              setShowFocusPanel(false);
              setFocusType(null);
            }}
            className="text-gray-500 hover:text-gray-700"
            title="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Property details */}
        {focusType === 'property' && selectedProperty && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2" style={{ wordBreak: 'break-word' }}>{selectedProperty.name}</h3>

              <p className="mb-3">
                {selectedProperty.address}<br />
                {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip || ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold">Status:</span>{' '}
                <span className={`${selectedProperty.status?.toLowerCase() === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedProperty.status}
                </span>
              </div>

              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold">Conference:</span>{' '}
                <span>{selectedProperty.conference}</span>
              </div>

              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold">District:</span>{' '}
                <span>{selectedProperty.district}</span>
              </div>

              <div className="p-2 bg-gray-50 rounded">
                <span className="font-semibold">GCFA:</span>{' '}
                <span>{selectedProperty.gcfa}</span>
              </div>
            </div>

            {/* Additional property details - show all available data */}
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold mb-2">All Property Data</h4>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {Object.entries(selectedProperty).map(([key, value]) => (
                  value !== null && value !== undefined && (
                    <div key={key} className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">{key}:</span>
                      <span className="text-gray-900">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QCT Zone details */}
        {focusType === 'qct' && selectedQCT && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">QCT Zone Details</h3>
              <p className="mb-3 text-blue-600 font-medium">Census Tract ID: {selectedQCT.geoid || 'N/A'}</p>
            </div>

            {/* QCT details - show all available data */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {Object.entries(selectedQCT).map(([key, value]) => (
                value !== null && value !== undefined && (
                  <div key={key} className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* DDA Zone details */}
        {focusType === 'dda' && selectedDDA && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">DDA Zone Details</h3>
              <p className="mb-3 text-orange-600 font-medium">DDA ID: {selectedDDA.dda_code || 'N/A'}</p>
            </div>

            {/* DDA details - show all available data */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {Object.entries(selectedDDA).map(([key, value]) => (
                value !== null && value !== undefined && (
                  <div key={key} className="grid grid-cols-2 gap-2 p-2 bg-orange-50 rounded">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Show this if nothing is selected */}
        {!focusType && (
          <p className="text-gray-500 italic">Click on a property, QCT zone, or DDA zone to view details</p>
        )}
      </div>

      {/* Status bar at the bottom - only shows content when there are messages */}
      <div className="status-bar">
        {statusMessages.length > 0 && (
          <div className="status-ticker">
            {statusMessages.map((msg, index) => (
              <span key={index} className="status-message">{msg}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
