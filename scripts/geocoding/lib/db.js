// Database operations for geocoding
import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Initialize the Supabase client
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} supabaseKey - Supabase anon key
 * @returns {Object} - Supabase client instance
 */
export function initSupabase(supabaseUrl, supabaseKey) {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * Get the Supabase client instance
 * @returns {Object} - Supabase client instance
 */
export function getSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase first.');
  }
  return supabaseClient;
}

/**
 * Verify the required columns exist in the umc_locations table
 * @returns {Promise<boolean>} - True if all required columns exist
 */
export async function validateGeoColumns() {
  try {
    // Use a simpler approach - just try to select a single row with all the columns we need
    // This will tell us if they exist without needing a custom RPC function
    const { data, error } = await supabaseClient
      .from('umc_locations')
      .select('gcfa, name, address, city, state, latitude, longitude, skip_geocoding, skip_reason, details')
      .limit(1);
    
    if (error) {
      // If we get an error about missing columns, it will be in this format
      if (error.message && error.message.includes('does not exist')) {
        const missingColumnMatch = error.message.match(/column "([^"]+)" does not exist/i);
        if (missingColumnMatch && missingColumnMatch[1]) {
          console.error(`Error: The column '${missingColumnMatch[1]}' is missing from the umc_locations table`);
          console.error('Please ensure all required columns exist before continuing.');
          return false;
        }
      }
      
      console.error('Error checking column existence:', error);
      return false;
    }
    
    console.log('✅ All required columns exist in the umc_locations table.');
    return true;
  } catch (error) {
    console.error('Error validating columns:', error);
    return false;
  }
}

/**
 * Fetch UMC locations from the database that need geocoding
 * @param {Object} config - Configuration object with filters
 * @returns {Promise<Array>} - Array of locations that need geocoding
 */
export async function fetchUMCLocations(config) {
  try {
    // Start with the base query for locations without coordinates
    let query = supabaseClient.from('umc_locations')
      .select('gcfa, name, address, city, state, latitude, longitude, status')
      .is('latitude', null) // Only get locations that haven't been geocoded yet
      .eq('skip_geocoding', false); // Don't process records marked to be skipped
    
    // Apply state filter if configured
    if (config.filters?.states && config.filters.states.length > 0) {
      query = query.in('state', config.filters.states);
      console.log(`Filtering by states: ${config.filters.states.join(', ')}`);
    }
    
    // Apply status filter if configured
    if (config.filters?.statuses && config.filters.statuses.length > 0) {
      query = query.in('status', config.filters.statuses);
      console.log(`Filtering by statuses: ${config.filters.statuses.join(', ')}`);
    }
    
    // Apply record limit if configured
    if (config.processing.max_records && config.processing.max_records > 0) {
      query = query.limit(config.processing.max_records);
      console.log(`Limiting to ${config.processing.max_records} records`);
    } else {
      console.log(`Processing ALL pending records (no limit) - this may take a long time`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching UMC locations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching UMC locations:', error);
    return [];
  }
}

/**
 * Update a location with geocoding results
 * @param {string} gcfa - GCFA identifier for the location
 * @param {Object} results - Geocoding results
 * @param {number} retryCount - Number of retries attempted (default: 0)
 * @returns {Promise<Object>} - Updated location data
 */
export async function updateLocationWithGeocodingResults(gcfa, results, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000; // 1 second delay between retries
  
  try {
    // Format update data
    const updateData = {
      latitude: results.latitude,
      longitude: results.longitude,
      geocoded_address: results.full_address || null,
      details: {
        geocoding_data: results,
        geocoding_timestamp: new Date().toISOString()
      }
    };
    
    // Update the location with geocoding results
    const { data, error } = await supabaseClient
      .from('umc_locations')
      .update(updateData)
      .eq('gcfa', gcfa)
      .select('gcfa, name, latitude, longitude');
    
    if (error) {
      // If we haven't exceeded max retries and it's a potentially transient error
      if (retryCount < MAX_RETRIES && isRetryableError(error)) {
        console.log(`Database update retry ${retryCount + 1}/${MAX_RETRIES} for location ${gcfa} after error: ${error.message}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        
        // Retry with incremented retry count
        return updateLocationWithGeocodingResults(gcfa, results, retryCount + 1);
      }
      
      throw new Error(`Database update failed after ${retryCount} retries: ${error.message}`);
    }
    
    return data?.[0] || null;
  } catch (error) {
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      console.log(`Database update retry ${retryCount + 1}/${MAX_RETRIES} for location ${gcfa} after exception: ${error.message}`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
      // Retry with incremented retry count
      return updateLocationWithGeocodingResults(gcfa, results, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Determine if an error is retryable (typically connection or timeout errors)
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is retryable
 */
function isRetryableError(error) {
  // Check for common transient error patterns
  const errorStr = error.toString().toLowerCase();
  
  return (
    errorStr.includes('connection') ||
    errorStr.includes('timeout') ||
    errorStr.includes('network') ||
    errorStr.includes('temporarily') ||
    errorStr.includes('busy') ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  );
}

/**
 * Get the count of geocoded locations
 * @returns {Promise<number>} - Number of geocoded locations
 */
export async function getGeocodedCount() {
  try {
    // Use a more reliable count approach
    const { data, error } = await supabaseClient
      .from('umc_locations')
      .select('gcfa')
      .not('latitude', 'is', null);
    
    if (error) {
      console.error('Error getting geocoded count:', error);
      return 0;
    }
    
    // Count the returned rows
    return data ? data.length : 0;
  } catch (error) {
    console.error('Error getting geocoded count:', { message: error.message, stack: error.stack });
    return 0;
  }
}

/**
 * Get the total count of UMC locations
 * @returns {Promise<number>} - Total number of UMC locations
 */
export async function getTotalCount() {
  try {
    // Use a more reliable approach to count all records
    const { data, error } = await supabaseClient
      .from('umc_locations')
      .select('gcfa');
    
    if (error) {
      console.error('Error getting total count:', error);
      return 0;
    }
    
    // Count the returned rows
    return data ? data.length : 0;
  } catch (error) {
    console.error('Error getting total count:', { message: error.message, stack: error.stack });
    return 0;
  }
}

/**
 * Mark a location to be skipped for geocoding
 * @param {string} gcfa - GCFA identifier
 * @param {string} reason - Reason to skip
 * @param {Object} details - Additional details about the skip
 * @returns {Promise<boolean>} - Success status
 */
export async function markLocationToSkip(gcfa, reason, details = {}) {
  try {
    const { error } = await supabaseClient
      .from('umc_locations')
      .update({
        skip_geocoding: true,
        skip_reason: JSON.stringify({
          reason,
          ...details,
          timestamp: new Date().toISOString()
        })
      })
      .eq('gcfa', gcfa);
    
    if (error) {
      console.error(`Failed to mark location ${gcfa} to skip:`, error);
      return false;
    }
    
    console.log(`Marked location ${gcfa} to be skipped in future runs due to ${reason}`);
    return true;
  } catch (error) {
    console.error(`Failed to mark location ${gcfa} to skip:`, error);
    return false;
  }
}

/**
 * Update the geocoding failure count for a location
 * @param {string} gcfa - GCFA identifier
 * @param {Object} location - Location data
 * @param {string} errorType - Type of error encountered
 * @returns {Promise<number>} - Updated failure count
 */
export async function updateGeocodingFailureCount(gcfa, location, errorType) {
  try {
    // First check if this already has previous failed attempts
    const { data: locationData } = await supabaseClient
      .from('umc_locations')
      .select('details')
      .eq('gcfa', gcfa)
      .single();
    
    // Get current failure count or initialize to 0
    const details = locationData?.details || {};
    const geocodingFailures = (details.geocoding_failures || 0) + 1;
    
    // Update the failure count
    await supabaseClient
      .from('umc_locations')
      .update({
        details: {
          ...details,
          geocoding_failures: geocodingFailures,
          last_geocoding_attempt: new Date().toISOString()
        }
      })
      .eq('gcfa', gcfa);
    
    return geocodingFailures;
  } catch (updateError) {
    console.error(`Failed to update failure count for location ${gcfa}:`, updateError);
    return 0;
  }
}
