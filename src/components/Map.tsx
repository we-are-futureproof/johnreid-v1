import { useRef, useState, useEffect } from 'react';
import { 
  Map, 
  NavigationControl, 
  Source, 
  Layer, 
  Marker, 
  Popup,
  LayerProps 
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  fetchUMCLocations, 
  fetchQualifiedCensusTracts, 
  fetchDifficultDevelopmentAreas, 
  UMCLocation,
  QualifiedCensusTract,
  DifficultDevelopmentArea
} from '../lib/supabase';

// Get Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Log for debugging in production (without exposing the key)
console.log('Mapbox token available:', !!MAPBOX_TOKEN);

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

export default function MapComponent() {
  // Using any to avoid type conflicts between mapbox-gl and react-map-gl
  const mapRef = useRef<any>(null);
  const [qctData, setQctData] = useState<any>(null);
  const [ddaData, setDdaData] = useState<any>(null);
  const [properties, setProperties] = useState<UMCLocation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<UMCLocation | null>(null);
  const [minLandArea, setMinLandArea] = useState<number | undefined>(undefined);
  const [viewState, setViewState] = useState({
    longitude: -86.7816,  // Nashville, TN
    latitude: 36.1627,
    zoom: 9.5  // Closer zoom to show Nashville metro area
  });
  const [showQCT, setShowQCT] = useState(true);
  const [showDDA, setShowDDA] = useState(true);
  
  // Filter out properties without coordinates
  const validProperties = properties.filter(p => 
    typeof p.latitude === 'number' && 
    typeof p.longitude === 'number');

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Fetching data for Nashville area...');
        // Fetch Qualified Census Tracts
        const qctZones = await fetchQualifiedCensusTracts();
        console.log(`Retrieved ${qctZones.length} Qualified Census Tracts`);
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
        }

        // Fetch Difficult Development Areas
        const ddaZones = await fetchDifficultDevelopmentAreas();
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
        }

        // Fetch UMC locations focused on Tennessee area
        const umcLocations = await fetchUMCLocations(minLandArea);
        
        // Filter UMC locations to focus on Nashville area (100 mile radius approximately)
        // Nashville coordinates: 36.1627, -86.7816
        const nashvilleLat = 36.1627;
        const nashvilleLng = -86.7816;
        const radiusInDegrees = 1.5; // Roughly 100 miles in degrees
        
        const nashvilleAreaLocations = umcLocations.filter(location => {
          // Skip locations without coordinates
          if (!location.latitude || !location.longitude) return false;
          
          // Calculate distance from Nashville
          const latDiff = Math.abs(location.latitude - nashvilleLat);
          const lngDiff = Math.abs(location.longitude - nashvilleLng);
          
          // Simple bounding box check (for performance)
          return latDiff < radiusInDegrees && lngDiff < radiusInDegrees;
        });
        
        console.log(`Filtered to ${nashvilleAreaLocations.length} UMC locations in Nashville area out of ${umcLocations.length} total`);
        setProperties(nashvilleAreaLocations);
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    loadData();
  }, [minLandArea]);

  // Handle property filtering by land area
  const handleLandAreaFilterChange = (value: number | undefined) => {
    setMinLandArea(value);
  };

  // Toggle layer visibility
  const toggleQCTLayer = () => {
    setShowQCT(!showQCT);
  };

  const toggleDDALayer = () => {
    setShowDDA(!showDDA);
  };

  // Fly to a specific property
  const flyToProperty = (property: UMCLocation) => {
    if (mapRef.current && property.longitude && property.latitude) {
      mapRef.current.flyTo({
        center: [property.longitude, property.latitude],
        zoom: 14,
        duration: 2000
      });
      setSelectedProperty(property);
    }
  };

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: any }) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-left" />

        {/* QCT Layer */}
        {qctData && showQCT && (
          <Source id="qct-source" type="geojson" data={qctData}>
            <Layer {...qctLayerStyle} />
          </Source>
        )}

        {/* DDA Layer */}
        {ddaData && showDDA && (
          <Source id="dda-source" type="geojson" data={ddaData}>
            <Layer {...ddaLayerStyle} />
          </Source>
        )}

        {/* UMC Property Markers */}
        {validProperties.map(property => (
          <Marker
            key={property.gcfa}
            longitude={property.longitude as number}
            latitude={property.latitude as number}
            onClick={(e: React.MouseEvent) => {
              // @ts-ignore - Handle event type mismatch
              e.originalEvent?.stopPropagation?.();
              setSelectedProperty(property);
            }}
          >
            <div className="umc-marker w-4 h-4" />
          </Marker>
        ))}

        {/* Property Popup */}
        {selectedProperty && selectedProperty.latitude && selectedProperty.longitude && (
          <Popup
            longitude={selectedProperty.longitude as number}
            latitude={selectedProperty.latitude as number}
            anchor="bottom"
            onClose={() => setSelectedProperty(null)}
            closeOnClick={false}
          >
            <div className="p-2">
              <h3 className="font-bold text-lg">{selectedProperty.name}</h3>
              <p>{selectedProperty.address}</p>
              <p>{selectedProperty.city}, {selectedProperty.state}</p>
              <p className="mt-2">
                <span className="font-semibold">Land Area:</span>{' '}
                {selectedProperty.land_area ? selectedProperty.land_area.toLocaleString() : 'N/A'} sq ft
              </p>
              <p>
                <span className="font-semibold">Status:</span> {selectedProperty.status}
              </p>
              <p>
                <span className="font-semibold">Conference:</span> {selectedProperty.conference}
              </p>
              <p>
                <span className="font-semibold">District:</span> {selectedProperty.district}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Control Panel */}
      <div className="control-panel p-4 m-4 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">UMC Property Analysis</h2>
        
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Layer Controls</h3>
          <div className="flex flex-col space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showQCT}
                onChange={toggleQCTLayer}
                className="mr-2"
              />
              Show QCT Zones
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showDDA}
                onChange={toggleDDALayer}
                className="mr-2"
              />
              Show DDA Zones
            </label>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Filter by Land Area</h3>
          <div className="flex flex-col space-y-2">
            <label className="flex items-center">
              <input
                type="number"
                placeholder="Min sq ft"
                onChange={(e) => handleLandAreaFilterChange(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2 border rounded"
              />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Properties ({properties.length})</h3>
          <div className="max-h-64 overflow-y-auto">
            {properties.length > 0 ? (
              <ul className="space-y-2">
                {validProperties.map(property => (
                  <li 
                    key={property.gcfa} 
                    className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                    onClick={() => flyToProperty(property)}
                  >
                    <p className="font-medium">{property.name}</p>
                    <p className="text-sm text-gray-600">{property.city}, {property.state}</p>
                    <p className="text-xs text-gray-500">{property.land_area ? `${property.land_area.toLocaleString()} sq ft` : 'Land area N/A'}</p>
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
  );
}
