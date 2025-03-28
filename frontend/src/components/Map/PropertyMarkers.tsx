import React from 'react';
import { Marker } from 'react-map-gl';
import { UMCLocation } from '../../lib/supabase';
import { getPropertyFromCache } from '../../lib/mapUtils';
import { markerConfig } from './config/mapConfig';

interface PropertyMarkersProps {
  properties: UMCLocation[];
  selectedProperty: UMCLocation | null;
  setSelectedProperty: (property: UMCLocation | null) => void;
  showFocusPanel: boolean;
  setFocusType: (type: string) => void;
  setShowFocusPanel: (show: boolean) => void;
  setSelectedQCT: (qct: any) => void;
  setSelectedDDA: (dda: any) => void;
  isProcessingEnrichment: boolean;
  setIsProcessingEnrichment: (isProcessing: boolean) => void;
  addStatusMessage: (message: string) => void;
}

/**
 * Renders all property markers on the map
 */
const PropertyMarkers: React.FC<PropertyMarkersProps> = ({
  properties,
  selectedProperty,
  setSelectedProperty,
  showFocusPanel,
  setFocusType,
  setShowFocusPanel,
  setSelectedQCT,
  setSelectedDDA,
  isProcessingEnrichment,
  setIsProcessingEnrichment,
  addStatusMessage,
}) => {
  if (!properties || properties.length === 0) {
    return <div key="no-properties" style={{ display: 'none' }} />;
  }

  return (
    <>
      {properties.map(property => (
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
          onClick={async (e: React.MouseEvent) => {
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
            if (selectedProperty?.gcfa !== undefined && 
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
            
            // If this is an active location that hasn't been evaluated yet, trigger property enrichment
            console.log('Property clicked:', {
              gcfa: propertyToSelect.gcfa,
              name: propertyToSelect.name,
              status: propertyToSelect.status,
              viable: propertyToSelect.viable
            });
            
            if (
              propertyToSelect.status?.toLowerCase() === 'active' && 
              (propertyToSelect.viable === undefined || propertyToSelect.viable === null) && 
              !isProcessingEnrichment
            ) {
              console.log('Property meets criteria for enrichment, proceeding with API call');
              try {
                setIsProcessingEnrichment(true);
                addStatusMessage(`Enriching property data for ${propertyToSelect.name}...`);
                
                // Import and use the Smarty service to process the property
                const { processUMCLocation } = await import('../../lib/smartyService');
                const enrichedProperty = await processUMCLocation(propertyToSelect);
                
                // Update property in local state if enrichment was successful
                if (enrichedProperty.viable !== undefined) {
                  setSelectedProperty(enrichedProperty);
                  
                  // Add status message
                  if (enrichedProperty.viable) {
                    addStatusMessage(`${enrichedProperty.name} is viable (5+ acres)`);
                  } else {
                    addStatusMessage(`${enrichedProperty.name} is not viable (less than 5 acres)`);
                  }
                  
                  return enrichedProperty;
                } else {
                  addStatusMessage(`Could not determine viability for ${propertyToSelect.name}`);
                }
              } catch (error) {
                console.error('Error enriching property:', error);
                addStatusMessage(`Error enriching property data for ${propertyToSelect.name}`);
              } finally {
                setIsProcessingEnrichment(false);
              }
            }
            
            return null;
          }}
        >
          <div
            className={`umc-marker w-${markerConfig.size.width} h-${markerConfig.size.height} ${
              // Color coding based on viability and status
              property.viable === true ? markerConfig.colors.viable : // Viable
              property.viable === false ? markerConfig.colors.nonViable : // Non-viable
              property.status?.toLowerCase() === 'active' ? markerConfig.colors.active : // Active (not evaluated)
              markerConfig.colors.closed // Closed (not evaluated)
            }`}
            title={`${property.name}

${property.address}

${property.status ? `Status: ${property.status}` : ''}${property.status?.toLowerCase() === 'active' ? (property.viable !== null && property.viable !== undefined ? '\n\nViable: ' + (property.viable ? 'Yes (4.5+ acres)' : 'No (< 4.5 acres)') : '\n\nViability unknown. Click to check') : ''}`}
          />
        </Marker>
      ))}
    </>
  );
};

export default PropertyMarkers;
