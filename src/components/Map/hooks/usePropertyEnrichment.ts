import { useState, useCallback } from 'react';
import { UMCLocation } from '../types';
import { validateAddress, enrichProperty, updateLocationInDatabase } from '../../../lib/smartyService';

// Define return type for the hook
interface UsePropertyEnrichmentReturn {
  enrichProperty: (property: UMCLocation) => Promise<UMCLocation | null>;
  isProcessingEnrichment: boolean;
  addEnrichmentStatusMessage?: (message: string) => void;
}

/**
 * Hook to manage property enrichment using Smarty API
 * Handles the two-step process: address validation → property enrichment
 */
export const usePropertyEnrichment = (
  addStatusMessage?: (message: string) => void
): UsePropertyEnrichmentReturn => {
  const [isProcessingEnrichment, setIsProcessingEnrichment] = useState<boolean>(false);

  /**
   * Enrich a property by getting parcel data from Smarty API
   * This is a two-step process:
   * 1. Validate address to get smarty_key
   * 2. Use smarty_key to get property enrichment data
   */
  const enrichPropertyWithSmarty = useCallback(
    async (property: UMCLocation): Promise<UMCLocation | null> => {
      if (!property) return null;

      try {
        setIsProcessingEnrichment(true);
        
        // Skip if property already evaluated
        if (property.viable !== undefined && property.viable !== null) {
          addStatusMessage?.(
            `Property ${property.name} already evaluated as ${property.viable ? '✅ VIABLE' : '❌ NOT VIABLE'}`
          );
          setIsProcessingEnrichment(false);
          return property;
        }

        // Step 1: Validate address to get smarty_key
        addStatusMessage?.(`Processing ${property.name}...`);
        addStatusMessage?.(`Step 1: Validating address...`);
        
        const validationResult = await validateAddress(property);
        
        if (!validationResult || !validationResult.metadata?.smarty_key) {
          console.error('Address validation failed:', validationResult);
          addStatusMessage?.('❌ Address validation failed - no smarty_key');
          setIsProcessingEnrichment(false);
          return null;
        }
        
        const smartyKey = validationResult.metadata.smarty_key;
        console.log('Successfully obtained smarty_key:', smartyKey);
        addStatusMessage?.(`✅ Successfully validated address`);
        
        // Step 2: Use smarty_key to get property enrichment data
        addStatusMessage?.('Step 2: Getting property data...');
        const propertyData = await enrichProperty(smartyKey);
        
        if (!propertyData) {
          console.error('Property enrichment failed - no data returned');
          addStatusMessage?.('❌ Property enrichment failed - no data returned');
          setIsProcessingEnrichment(false);
          return null;
        }
        
        // Extract and display important property information
        const lotSizeAcres = propertyData.lot_size_acres;
        const lotSizeSqft = propertyData.lot_size_sqft;
        const isViable = (lotSizeAcres && lotSizeAcres >= 4.5) || 
                         (lotSizeSqft && lotSizeSqft >= 200000);
        
        // Update the property with enrichment data
        const updatedProperty: UMCLocation = {
          ...property,
          smarty: propertyData,
          viable: isViable as boolean | undefined
        };
        
        // Save to database
        addStatusMessage?.('Step 3: Saving data to database...');
        const saveSuccess = await updateLocationInDatabase(updatedProperty);
        
        if (saveSuccess) {
          addStatusMessage?.(`✅ Data saved to database`);
        } else {
          addStatusMessage?.(`❌ Failed to save data to database`);
        }
        
        // Display the results
        addStatusMessage?.(`✅ Property data retrieved:`);
        addStatusMessage?.(`   Lot size: ${lotSizeAcres?.toFixed(2) || 'unknown'} acres (${lotSizeSqft?.toLocaleString() || 'unknown'} sq ft)`);
        addStatusMessage?.(`   Viability: ${isViable ? '✅ VIABLE' : '❌ NOT VIABLE'}`);
        
        setIsProcessingEnrichment(false);
        return updatedProperty;
      } catch (error) {
        console.error('Error in property enrichment:', error);
        addStatusMessage?.(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        setIsProcessingEnrichment(false);
        return null;
      }
    },
    [addStatusMessage]
  );

  return {
    enrichProperty: enrichPropertyWithSmarty,
    isProcessingEnrichment,
    addEnrichmentStatusMessage: addStatusMessage
  };
};
