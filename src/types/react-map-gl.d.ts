declare module 'react-map-gl' {
  import * as React from 'react';
  import { Map as MapboxMap, NavigationControl as MapboxNavigationControl } from 'mapbox-gl';

  export type ViewState = {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
    padding?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };

  export type MapRef = MapboxMap;

  export type MapProps = {
    initialViewState?: ViewState;
    mapboxAccessToken?: string;
    mapStyle?: string;
    onMove?: (evt: { viewState: ViewState }) => void;
    children?: React.ReactNode;
    ref?: React.RefObject<MapRef>;
    style?: React.CSSProperties;
    reuseMaps?: boolean;
    attributionControl?: boolean;
    [key: string]: any;
  };

  export type MarkerProps = {
    longitude: number;
    latitude: number;
    children?: React.ReactNode;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offset?: [number, number];
    style?: React.CSSProperties;
    className?: string;
    draggable?: boolean;
    rotation?: number;
    rotationAlignment?: 'map' | 'viewport' | 'auto';
    pitchAlignment?: 'map' | 'viewport' | 'auto';
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    [key: string]: any;
  };

  export type PopupProps = {
    longitude: number;
    latitude: number;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offset?: [number, number] | number;
    closeButton?: boolean;
    closeOnClick?: boolean;
    closeOnMove?: boolean;
    tipSize?: number;
    children?: React.ReactNode;
    className?: string;
    maxWidth?: string;
    onClose?: () => void;
    [key: string]: any;
  };

  export type LayerProps = {
    id: string;
    type: string;
    source?: string;
    'source-layer'?: string;
    paint?: any;
    layout?: any;
    filter?: any[];
    minzoom?: number;
    maxzoom?: number;
    beforeId?: string;
    [key: string]: any;
  };

  export type SourceProps = {
    id: string;
    type: string;
    data?: any;
    url?: string;
    tiles?: string[];
    tileSize?: number;
    bounds?: [number, number, number, number];
    scheme?: 'xyz' | 'tms';
    minzoom?: number;
    maxzoom?: number;
    attribution?: string;
    encoding?: 'terrarium' | 'mapbox';
    [key: string]: any;
  };

  export type NavigationControlProps = {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCompass?: boolean;
    showZoom?: boolean;
    visualizePitch?: boolean;
  };

  export const Map: React.FC<MapProps>;
  export const Marker: React.FC<MarkerProps>;
  export const Popup: React.FC<PopupProps>;
  export const Layer: React.FC<LayerProps>;
  export const Source: React.FC<SourceProps>;
  export const NavigationControl: React.FC<NavigationControlProps>;
  export function useMap(): { current: MapRef | null };
}
