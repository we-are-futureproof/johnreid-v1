// Map component type definitions
// Import types from the supabase lib to avoid duplication and type mismatches
import { UMCLocation as SupabaseUMCLocation, QualifiedCensusTract as SupabaseQCT, DifficultDevelopmentArea as SupabaseDDA, MapBounds } from '../../lib/supabase';

// Re-export the imported types
export type UMCLocation = SupabaseUMCLocation;
export type QualifiedCensusTract = SupabaseQCT;
export type DifficultDevelopmentArea = SupabaseDDA;
export type { MapBounds };

// Use any as a replacement for MapLayerMouseEvent since it's not directly exported
export type MapLayerMouseEvent = any;


// Component props interfaces
export interface MapComponentProps {
  searchLocation: {
    latitude: number;
    longitude: number;
    zoom: number;
  } | null;
}

export interface MapControlsProps {
  showQCT: boolean;
  showDDA: boolean;
  showActiveProperties: boolean;
  showClosedProperties: boolean;
  toggleQCTLayer: () => void;
  toggleDDALayer: () => void;
  setShowActiveProperties: (show: boolean) => void;
  setShowClosedProperties: (show: boolean) => void;
  isPanelCollapsed: boolean;
  setIsPanelCollapsed: (collapsed: boolean) => void;
  isBlinking: boolean;
  validProperties: UMCLocation[];
  setSelectedProperty?: (property: UMCLocation | null) => void;
  flyToProperty: (property: UMCLocation) => void;
}

export interface PropertyListProps {
  properties: UMCLocation[];
  flyToProperty: (property: UMCLocation) => void;
}

export interface FocusPanelProps {
  showFocusPanel: boolean;
  setShowFocusPanel: (show: boolean) => void;
  focusType: 'property' | 'qct' | 'dda' | null;
  setFocusType: (type: 'property' | 'qct' | 'dda' | null) => void;
  selectedProperty: UMCLocation | null;
  selectedQCT: QualifiedCensusTract | null;
  selectedDDA: DifficultDevelopmentArea | null;
}

export interface StatusBarProps {
  statusMessages: string[];
}

// Hook return types
export interface UseMapStateReturn {
  viewState: any;
  setViewState: (viewState: any) => void;
  mapStyle: string;
  setMapStyle: (style: string) => void;
  mapRef: React.RefObject<any>;
  mapBounds: MapBounds | null;
  setMapBounds: (bounds: MapBounds | null) => void;
  updateMapBounds: () => void;
}

export interface UsePropertyStateReturn {
  properties: UMCLocation[];
  setProperties: (properties: UMCLocation[]) => void;
  validProperties: UMCLocation[];
  selectedProperty: UMCLocation | null;
  setSelectedProperty: (property: UMCLocation | null) => void;
  showActiveProperties: boolean;
  setShowActiveProperties: (show: boolean) => void;
  showClosedProperties: boolean;
  setShowClosedProperties: (show: boolean) => void;
  flyToProperty: (property: UMCLocation) => void;
}

export interface UseZoneDataReturn {
  qctData: any;
  ddaData: any;
  showQCT: boolean;
  setShowQCT: (show: boolean) => void;
  showDDA: boolean;
  setShowDDA: (show: boolean) => void;
  selectedQCT: QualifiedCensusTract | null;
  setSelectedQCT: (qct: QualifiedCensusTract | null) => void;
  selectedDDA: DifficultDevelopmentArea | null;
  setSelectedDDA: (dda: DifficultDevelopmentArea | null) => void;
  toggleQCTLayer: () => void;
  toggleDDALayer: () => void;
}

export interface UseMapInteractionsReturn {
  handleMapClick: (e: MapLayerMouseEvent) => void;
  focusType: 'property' | 'qct' | 'dda' | null;
  setFocusType: (type: 'property' | 'qct' | 'dda' | null) => void;
  showFocusPanel: boolean;
  setShowFocusPanel: (show: boolean) => void;
}

export interface UseStatusMessagesReturn {
  statusMessages: string[];
  addStatusMessage: (message: string) => void;
}
