/**
 * UMC Location processing service
 * Extracted from smartyService.ts during refactoring
 */

import { supabase, UMCLocation } from '../supabase';
import { validateAddress } from './addressValidation';
import { enrichProperty, evaluatePropertyViability } from './propertyEnrichment';

/**
 * Process a UMC location to determine its viability using Smarty API
 * @param location UMC location to evaluate
 * @returns Updated location with viability and Smarty data
 */
export async function processUMCLocation(location: UMCLocation): Promise<UMCLocation> {
  // Skip processing if not active or location has already been processed
  if (location.status?.toLowerCase() !== 'active' || (location.viable !== undefined && location.viable !== null)) {
    return location;
  }

  try {
    // Step 1: Validate address to get smarty_key
    const validationResult = await validateAddress(location);

    if (!validationResult || !validationResult.metadata?.smarty_key) {
      console.warn(`Could not obtain smarty_key for ${location.name} (GCFA: ${location.gcfa})`);
      return location;
    }

    // Step 2: Use smarty_key to get property enrichment data
    const smartyKey = validationResult.metadata.smarty_key;
    const enrichmentResult = await enrichProperty(smartyKey);

    if (!enrichmentResult) {
      console.warn(`Could not enrich property data for ${location.name} (GCFA: ${location.gcfa})`);
      return {
        ...location,
        smarty_key: smartyKey
        // No viable property since enrichment returns null
      };
    }

    // Step 3: Evaluate property viability
    const isViable = evaluatePropertyViability(enrichmentResult);

    // Step 4: Update location with new data
    const updatedLocation = {
      ...location,
      smarty_key: smartyKey,
      smarty: enrichmentResult,
      viable: isViable
    };

    // Step 5: Save to database (exclude this if you want to handle updates separately)
    await updateLocationInDatabase(updatedLocation);

    return updatedLocation;
  } catch (error) {
    console.error(`Error processing location ${location.name} (GCFA: ${location.gcfa}):`, error);
    return location;
  }
}

/**
 * Updates a UMC location in the database with enrichment data
 * @param location Updated UMC location
 * @returns Promise resolving to success status
 */
export async function updateLocationInDatabase(location: UMCLocation): Promise<boolean> {
  if (!location || !location.gcfa) {
    console.error('Cannot update location without ID');
    return false;
  }

  try {
    // Prepare the data for update, including any enrichment data
    const updateData: any = {
      smarty_key: location.smarty_key,
      viable: location.viable
    };

    // Include smarty data if available
    if (location.smarty) {
      updateData.smarty = location.smarty;
    }

    // Execute the update
    const { error } = await supabase
      .from('umc_locations')
      .update(updateData)
      .eq('gcfa', location.gcfa);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Database update failed for location ${location.name} (GCFA: ${location.gcfa}):`, error);
    return false;
  }
}
