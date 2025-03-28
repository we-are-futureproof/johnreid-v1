/**
 * Map Configuration File
 * 
 * Centralized configuration for map-related components
 */

// UI configuration
export const tickerTapeConfig = {
  scrollDuration: 20,
  messageSpacing: 40,
  fontSize: 14
};

export const filterPanelConfig = {
  startCollapsed: false
};

// Map marker configuration
export const markerConfig = {
  size: {
    width: 4,
    height: 4
  },
  colors: {
    viable: 'bg-green-600',       // Viable (5+ acres)
    nonViable: 'bg-gray-500',     // Non-viable (< 5 acres)
    active: 'bg-blue-600',        // Active (not evaluated)
    closed: 'bg-red-600'          // Closed (not evaluated)
  }
};

// Default map bounds (Nashville area)
export const defaultMapBounds = {
  north: 36.3, // North of Nashville
  south: 35.8, // South of Nashville
  east: -86.5, // East of Nashville
  west: -87.0  // West of Nashville
};

// Map styles
export const mapStyles = {
  streets: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
};
