// Component relies on JSX transform, no direct React usage needed
import { MapContainer } from './Map/index';

/**
 * MapComponent serves as a simple wrapper around the refactored MapContainer component.
 * It maintains the same props interface as before but delegates all functionality
 * to the new modular implementation.
 */
interface MapComponentProps {
  searchLocation: {
    latitude: number;
    longitude: number;
    zoom: number;
  } | null;
}

/**
 * Main Map component that renders the map and its controls.
 * This component has been refactored to use the modular MapContainer.
 * 
 * @param searchLocation - Optional location to center the map on
 */
export default function MapComponent({ searchLocation }: MapComponentProps) {
  // Simply render the MapContainer component with the searchLocation prop
  // All state management and logic has been moved to the MapContainer and its associated hooks
  return <MapContainer searchLocation={searchLocation} />;
}
