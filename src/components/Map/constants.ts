import { LayerProps } from 'react-map-gl';

// Get Mapbox token from environment variables
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Layer styles for map overlays
export const qctLayerStyle: LayerProps = {
  id: 'qct-layer',
  type: 'fill',
  paint: {
    'fill-color': '#0080ff',
    'fill-opacity': 0.3,
    'fill-outline-color': '#0066cc'
  }
};

export const ddaLayerStyle: LayerProps = {
  id: 'dda-layer',
  type: 'fill',
  paint: {
    'fill-color': '#ff8000',
    'fill-opacity': 0.3,
    'fill-outline-color': '#cc6600'
  }
};
