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
  setProperties?: (properties: UMCLocation[]) => void; // Added to allow updating the main property list
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
  setProperties,
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
            
            // Determine property status for API call decision
            const propertyStatus = propertyToSelect.status?.toLowerCase() || 'unknown';
            
            // Always show the Focus panel, regardless of property state
            setSelectedProperty(propertyToSelect);
            setSelectedQCT(null);
            setSelectedDDA(null);
            setFocusType('property');
            setShowFocusPanel(true);
            
            // API lookup should ONLY happen for Active & Viability Unknown properties
            if (
              propertyStatus === 'active' && 
              propertyToSelect.viable === null && 
              !isProcessingEnrichment
            ) {
              try {
                setIsProcessingEnrichment(true);
                addStatusMessage(`Enriching property data for ${propertyToSelect.name}...`);
                
                // Import and use the Smarty service to process the property
                const { processUMCLocation } = await import('../../lib/smartyService');
                const enrichedProperty = await processUMCLocation(propertyToSelect);
                
                // Update property in local state if enrichment was successful
                if (enrichedProperty.viable !== undefined) {

                  
                  // Extract lotSizeAcres from the appropriate location in the Smarty data
                  let lotSizeAcres;
                  
                  // Parse the Smarty data if needed and extract the lot size
                  if (typeof enrichedProperty.smarty === 'string') {
                    try {
                      const parsed = JSON.parse(enrichedProperty.smarty);
                      enrichedProperty.smarty = parsed;
                      
                      // Find lot_size_acres in the parsed object
                      if (parsed.lot_size_acres !== undefined) {
                        lotSizeAcres = parsed.lot_size_acres;
                      } else if (parsed.parcel && parsed.parcel.lot_size_acres !== undefined) {
                        lotSizeAcres = parsed.parcel.lot_size_acres;
                      } else {
                        // Deep search in nested objects
                        Object.keys(parsed).forEach(key => {
                          if (typeof parsed[key] === 'object' && parsed[key] !== null) {
                            if (parsed[key].lot_size_acres !== undefined) {
                              lotSizeAcres = parsed[key].lot_size_acres;
                            }
                          }
                        });
                      }
                    } catch (e) {
                      console.error('Failed to parse Smarty string:', e);
                    }
                  } else if (typeof enrichedProperty.smarty === 'object' && enrichedProperty.smarty !== null) {
                    // Extract from Smarty object directly
                    if (enrichedProperty.smarty.lot_size_acres !== undefined) {
                      lotSizeAcres = enrichedProperty.smarty.lot_size_acres;
                    } else if (enrichedProperty.smarty.parcel && enrichedProperty.smarty.parcel.lot_size_acres !== undefined) {
                      lotSizeAcres = enrichedProperty.smarty.parcel.lot_size_acres;
                    } else {
                      // Deep search in nested objects
                      Object.keys(enrichedProperty.smarty).forEach(key => {
                        if (typeof enrichedProperty.smarty[key] === 'object' && enrichedProperty.smarty[key] !== null) {
                          if (enrichedProperty.smarty[key].lot_size_acres !== undefined) {
                            lotSizeAcres = enrichedProperty.smarty[key].lot_size_acres;
                          }
                        }
                      });
                    }
                  }
                  
                  // We'll use the lotSizeAcres directly in our status message and updated property
                  
                  // Parse smarty data if it's a string
                  let processedProperty = enrichedProperty;
                  if (typeof enrichedProperty.smarty === 'string') {
                    try {
                      const parsedSmarty = JSON.parse(enrichedProperty.smarty);

                      processedProperty = {
                        ...enrichedProperty,
                        smarty: parsedSmarty
                      };
                    } catch (e) {
                      console.error('Failed to parse smarty data string:', e);
                    }
                  }
                  
                  // Update the selected property to show in focus panel with parsed smarty data if available
                  setSelectedProperty(processedProperty);
                  
                  // Add status message with actual acreage
                  // Create a formatted display string for the acreage to use in status messages
                  let acreageDisplayMessage = '';
                  if (typeof lotSizeAcres === 'number') {
                    acreageDisplayMessage = ` (${lotSizeAcres.toFixed(2)} acres)`;
                  }
                  
                  if (processedProperty.viable) {
                    addStatusMessage(`${processedProperty.name} is viable${acreageDisplayMessage}`);
                  } else {
                    addStatusMessage(`${processedProperty.name} is not viable${acreageDisplayMessage}`);
                  }
                  
                  // Update the property in the main properties array to refresh marker color
                  if (setProperties && properties) {
                    const updatedProperties = properties.map(p => 
                      p.gcfa === processedProperty.gcfa ? processedProperty : p
                    );
                    setProperties(updatedProperties);
                  }
                  
                  return enrichedProperty;
                } else {
                  addStatusMessage(`Could not determine viability for ${propertyToSelect.name}`);
                }
              } catch (error) {
                console.error('Error during property enrichment:', error);
                addStatusMessage(`Error enriching property data for ${propertyToSelect.name}`);
              } finally {
                setIsProcessingEnrichment(false);
              }
            } else {
              // Property status handled without API call
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

${property.status ? `Status: ${property.status}` : ''}${property.status?.toLowerCase() === 'active' ? 
            (property.viable !== null && property.viable !== undefined ? 
              (() => {
                // Extract lot size from Smarty data for tooltip
                let lotSizeAcres: number | undefined;
                const SQFT_PER_ACRE = 43560; // Constant for conversion
                
                try {
                  // Parse smarty data if it's a string
                  let smartyData: any = null;
                  
                  // For debugging specific properties
                  if (property.name) {
                    // Property processing
                  }
                  
                  if (typeof property.smarty === 'string') {
                    try {
                      smartyData = JSON.parse(property.smarty);
                    } catch (e) {
                      console.error('Failed to parse smarty data string in tooltip:', e);
                    }
                  } else if (typeof property.smarty === 'object' && property.smarty !== null) {
                    smartyData = property.smarty;
                  }
                  
                  if (smartyData) {
                    // Process smarty data
                    
                    // Check common locations for acreage data
                    // Handle array structure if present
                    if (Array.isArray(smartyData)) {
                      if (smartyData[0]) {
                        const firstItem = smartyData[0];
                        
                        // Check for acres first
                        if (firstItem.lot_size_acres !== undefined) {
                          lotSizeAcres = firstItem.lot_size_acres;
                        } else if (firstItem.attributes && firstItem.attributes.acres !== undefined) {
                          lotSizeAcres = typeof firstItem.attributes.acres === 'string' 
                            ? parseFloat(firstItem.attributes.acres)
                            : firstItem.attributes.acres;
                        } 
                        // Then check for lot_sqft in attributes (which we see in the data)
                        else if (firstItem.attributes && firstItem.attributes.lot_sqft !== undefined) {
                          const sqftValue = firstItem.attributes.lot_sqft;
                          const sqftNumber = typeof sqftValue === 'string' ? parseFloat(sqftValue) : sqftValue;
                          if (!isNaN(sqftNumber) && sqftNumber > 0) {
                            lotSizeAcres = sqftNumber / SQFT_PER_ACRE;

                          }
                        }
                      }
                    } else {
                      // Handle direct object structure
                      if (smartyData.lot_size_acres !== undefined) {
                        lotSizeAcres = smartyData.lot_size_acres;
                      } else if (smartyData.attributes && smartyData.attributes.acres !== undefined) {
                        lotSizeAcres = typeof smartyData.attributes.acres === 'string' 
                          ? parseFloat(smartyData.attributes.acres)
                          : smartyData.attributes.acres;
                      } else if (smartyData.parcel && smartyData.parcel.lot_size_acres !== undefined) {
                        lotSizeAcres = smartyData.parcel.lot_size_acres;
                      }
                    }
                    
                    // If we found lot_sqft but not acres, calculate it
                    if (lotSizeAcres === undefined) {
                      let lotSizeSqft: number | undefined;
                      
                      // Try to find square footage
                      if (smartyData.lot_size_sqft !== undefined) {
                        lotSizeSqft = typeof smartyData.lot_size_sqft === 'string' 
                          ? parseFloat(smartyData.lot_size_sqft)
                          : smartyData.lot_size_sqft;
                      } else if (smartyData.attributes && smartyData.attributes.lot_sqft !== undefined) {
                        const rawValue = smartyData.attributes.lot_sqft;

                        lotSizeSqft = typeof rawValue === 'string' 
                          ? parseFloat(rawValue)
                          : rawValue;

                      }
                      
                      // Calculate acres from square footage
                      if (lotSizeSqft && typeof lotSizeSqft === 'number') {
                        // Convert square feet to acres and log the calculation
                        lotSizeAcres = lotSizeSqft / SQFT_PER_ACRE;

                      }
                    }
                    
                    // ONLY do deep search if we haven't found acreage data in common locations
                    if (lotSizeAcres === undefined) {
                      let lotSizeSqftFromDeepSearch: number | undefined;
                      
                      const searchForAcreage = (obj: any, path = '', depth = 0) => {
                        if (!obj || typeof obj !== 'object' || depth > 5) return;
                        
                        Object.keys(obj).forEach(key => {
                          const value = obj[key];
                          const newPath = path ? `${path}.${key}` : key;
                          
                          // First priority: Look for direct acreage values
                          if ((key === 'acres' || key === 'lot_size_acres' || key.includes('acre')) && 
                              (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))) {
                            const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
                            // Only use the value if it seems reasonable (greater than 0)
                            if (parsedValue > 0) {
                              lotSizeAcres = parsedValue;
                            }
                          } 
                          // Second priority: Look for sqft values to convert to acres
                          else if ((key === 'lot_sqft' || key === 'lot_size_sqft' || key.includes('sqft')) && 
                              (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))))) {
                            const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
                            // Only use the value if it seems reasonable (greater than 0)
                            if (parsedValue > 0) {
                              lotSizeSqftFromDeepSearch = parsedValue;
                            }
                          } 
                          // Recursively search nested objects with depth limit
                          else if (value && typeof value === 'object' && !Array.isArray(value) && depth < 5) {
                            searchForAcreage(value, newPath, depth + 1);
                          }
                        });
                      };
                      
                      searchForAcreage(smartyData);
                      
                      // If we found square footage but not acreage, calculate acreage
                      if (lotSizeAcres === undefined && lotSizeSqftFromDeepSearch !== undefined) {
                        lotSizeAcres = lotSizeSqftFromDeepSearch / SQFT_PER_ACRE;

                      }
                      

                    }
                  }
                } catch (e) {
                  console.error('Error in tooltip calculation:', e);
                }
                
                // Format the acreage information properly whether it comes from acres or lot_sqft
                let acreageText = '';
                if (typeof lotSizeAcres === 'number') {
                  acreageText = ` (${lotSizeAcres.toFixed(2)} acres)`;
                }
                
                // Return the viability text with acreage if available - no fallback values
                return `\n\nViable: ${property.viable ? 
                  `Yes${acreageText}` : 
                  `No${acreageText}`}`;
              })()
            : '\n\nViability unknown. Click to check') 
          : ''}`}
          />
        </Marker>
      ))}
    </>
  );
};

export default PropertyMarkers;
