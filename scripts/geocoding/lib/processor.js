// Processor for handling geocoding operations
import * as db from './db.js';
import * as reporting from './reporting.js';

/**
 * Process a batch of locations in parallel
 * @param {Array} locations - Array of locations to process
 * @param {Object} geocoder - Geocoder instance
 * @param {Object} config - Configuration object
 * @param {number} batchNum - Current batch number
 * @param {number} totalBatches - Total number of batches
 * @returns {Object} - Batch processing results
 */
export async function processBatch(locations, geocoder, config, batchNum, totalBatches) {
  // Results object for this batch
  const batchResults = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  // Skip processing if no locations
  if (!locations || locations.length === 0) {
    return batchResults;
  }
  
  // Process each location in the batch
  const locationPromises = locations.map(async (location) => {
    // Initialize result object for this location
    const result = {
      gcfa: location.gcfa,
      success: false,
      error: null
    };
    
    try {
      // Check if all required address components are present
      const addressCheck = geocoder.validateAddressComponents(
        location.address, 
        location.city, 
        location.state
      );
      
      // Skip if missing critical address components
      if (!addressCheck.valid) {
        const timestamp = new Date().toISOString();
        const missingFields = addressCheck.missingComponents;
        const errorMsg = `[${timestamp}] SKIPPED: Location ${location.gcfa} - ${location.name || 'Unknown'} has incomplete address data.
  Address: ${location.address || 'MISSING'}  
  City: ${missingFields.includes('City') ? 'MISSING' : location.city}
  State: ${missingFields.includes('State') ? 'MISSING' : location.state}`;
        
        console.error(errorMsg);
        batchResults.errors.push(errorMsg);
        batchResults.skipped++;
        result.error = 'incomplete_address';
        
        // Mark the location to be skipped in future runs
        await db.markLocationToSkip(location.gcfa, 'incomplete_address', {
          missing_fields: missingFields,
          provided_data: {
            address: location.address || null,
            city: location.city || null,
            state: location.state || null
          }
        });
        
        return result;
      }
      
      // Attempt to geocode the address
      const geocodingResults = await geocoder.geocodeAddress(
        location.address,
        location.city,
        location.state
      );
      
      // Process successful geocoding
      if (geocodingResults && geocodingResults.latitude && geocodingResults.longitude) {
        // Check if this is a low confidence result
        if (geocodingResults.low_confidence) {
          // Log the low relevance result but still save it
          const timestamp = new Date().toISOString();
          const warningMsg = `[${timestamp}] LOW CONFIDENCE: Score ${geocodingResults.relevance} for ${location.name} (${location.gcfa})
  Address: ${location.address}, ${location.city}, ${location.state}`;
          console.warn(warningMsg);
          batchResults.warnings = batchResults.warnings || [];
          batchResults.warnings.push(warningMsg);
          
          // We still want to store these coordinates, already marked as low confidence
        }
        
        // Update the database with the geocoding results
        const updatedLocation = await db.updateLocationWithGeocodingResults(
          location.gcfa,
          geocodingResults
        );
        
        if (updatedLocation) {
          batchResults.success++;
          result.success = true;
          // Add a low_confidence flag to the result if applicable
          if (geocodingResults.low_confidence) {
            result.low_confidence = true;
          }
        } else {
          const timestamp = new Date().toISOString();
          const errorMsg = `[${timestamp}] DATABASE ERROR: Failed to update location ${location.gcfa} (${location.name})`;
          console.error(errorMsg);
          batchResults.errors.push(errorMsg);
          batchResults.failed++;
          result.error = 'database_update_failed';
        }
      } else {
        const timestamp = new Date().toISOString();
        const errorMsg = `[${timestamp}] GEOCODING ERROR: No coordinates found for ${location.name} (${location.gcfa})
  Address: ${location.address}, ${location.city}, ${location.state}`;
        console.error(errorMsg);
        batchResults.errors.push(errorMsg);
        batchResults.failed++;
        result.error = 'no_coordinates';
        
        // If this has reached max_failures attempts, mark it to be skipped
        const geocodingFailures = await db.updateGeocodingFailureCount(
          location.gcfa,
          location,
          'no_coordinates'
        );
        
        // If we've failed max_failures times, mark to skip
        const maxFailures = config.geocoding.max_failures || 3;
        if (geocodingFailures >= maxFailures) {
          await db.markLocationToSkip(location.gcfa, 'consecutive_geocoding_failures', {
            failures: geocodingFailures,
            last_error: 'no_coordinates',
            address: `${location.address}, ${location.city}, ${location.state}`
          });
          console.log(`Marked location ${location.gcfa} to be skipped after ${geocodingFailures} failed geocoding attempts`);
        }
      }
    } catch (error) {
      const timestamp = new Date().toISOString();
      const errorMsg = `[${timestamp}] EXCEPTION: Error processing location ${location.gcfa} (${location.name})
  Error: ${error.message}
  Stack: ${error.stack}
  Address: ${location.address}, ${location.city}, ${location.state}`;
      console.error(errorMsg);
      batchResults.errors.push(errorMsg);
      batchResults.failed++;
      result.error = error;
    }
    
    batchResults.processed++;
    return result;
  });
  
  // Wait for all locations in the batch to be processed
  await Promise.all(locationPromises);
  
  // Log batch completion
  console.log(`Completed batch ${batchNum}/${totalBatches}. Success: ${batchResults.success}, Failed: ${batchResults.failed}, Skipped: ${batchResults.skipped}`);
  
  return batchResults;
}

/**
 * Process all locations in batches with concurrency
 * @param {Array} locations - Array of all locations to process
 * @param {Object} geocoder - Geocoder instance
 * @param {Object} config - Configuration object
 * @returns {Object} - Final processing results
 */
export async function processAllLocations(locations, geocoder, config) {
  // Results tracking
  const results = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  // Get total number of locations for progress reporting
  const totalLocations = locations.length;
  console.log(`Found ${totalLocations} UMC locations that need geocoding`);
  
  // Get batch processing parameters from config
  const batchSize = config.processing.batch_size || 20;     // Process in batches
  const maxConcurrent = config.processing.max_concurrent || 5;  // Process N batches concurrently
  
  // Log if we're processing all records (no limit)
  if (config.processing.max_records === 0) {
    console.log('===== PROCESSING ALL RECORDS MODE =====');
    console.log(`Will process all ${locations.length} pending records (could take several hours)`);
    console.log('=======================================');
  }
  
  console.log(`Processing with batch size ${batchSize} and ${maxConcurrent} concurrent batches`);
  
  // Split locations into batches
  const batches = [];
  for (let i = 0; i < locations.length; i += batchSize) {
    batches.push(locations.slice(i, i + batchSize));
  }
  
  // Process batches in groups (respecting max concurrency)
  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const batchGroup = batches.slice(i, i + maxConcurrent);
    
    console.log(`\nProcessing batches ${i+1} to ${Math.min(i+maxConcurrent, batches.length)} of ${batches.length}...`);
    
    // Process batch group concurrently
    const batchPromises = batchGroup.map((batch, idx) => 
      processBatch(batch, geocoder, config, i + idx + 1, batches.length)
    );
    
    // Wait for all batches in the group to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Aggregate results from all batches in this group
    for (const result of batchResults) {
      results.processed += result.processed;
      results.success += result.success;
      results.failed += result.failed;
      results.skipped += result.skipped;
      
      // Add errors to the collection
      results.errors = [...results.errors, ...result.errors];
      
      // Periodically flush errors to disk to manage memory
      const ERROR_BATCH_SIZE = 50;
      if (results.errors.length >= ERROR_BATCH_SIZE) {
        await reporting.appendErrorsToLogFile(results.errors);
        results.errors = []; // Clear the array after flushing
      }
    }
    
    // Show overall progress after each group of concurrent batches
    console.log('\nRetrieving current geocoding progress...');
    
    // Show detailed progress report every 5 batch groups or if we've processed more than 20% of the total
    const batchGroupIndex = Math.floor(i / maxConcurrent);
    const isSignificantMilestone = batchGroupIndex % 5 === 0 || i >= batches.length / 5;
    
    if (isSignificantMilestone) {
      // Get detailed progress report from the database by executing the SQL directly
      try {
        // Query to count geocoded locations
        const { count: geocodedCount, error: geocodedError } = await db.getSupabase()
          .from('umc_locations')
          .select('*', { count: 'exact', head: true })
          .not('latitude', 'is', null);
        
        // Query to count total locations
        const { count: totalCount, error: totalError } = await db.getSupabase()
          .from('umc_locations')
          .select('*', { count: 'exact', head: true });
        
        if (geocodedError || totalError) {
          console.error('Error getting progress data:', geocodedError || totalError);
        }
        
        if (geocodedCount !== null && totalCount !== null) {
          const processedCount = geocodedCount || 0;
          const percentage = ((processedCount / totalCount) * 100).toFixed(1);
          
          console.log('\n===== GEOCODING PROGRESS SUMMARY =====');
          console.log(`Total Locations: ${totalCount}`);
          console.log(`Processed: ${processedCount} (${percentage}%)`);
          console.log(`Remaining: ${totalCount - processedCount} (${(100 - parseFloat(percentage)).toFixed(1)}%)`);
          console.log('=======================================\n');
        }
      } catch (error) {
        console.error('Error running progress report:', error);
        
        // Fallback to simple progress if detailed report fails
        const currentCount = await db.getGeocodedCount();
        const totalCount = await db.getTotalCount();
        console.log(`\nProgress update: ${currentCount}/${totalCount} locations geocoded (${((currentCount/totalCount)*100).toFixed(1)}%)\n`);
      }
    } else {
      // Simple progress update for non-milestone batches
      const currentCount = await db.getGeocodedCount();
      const totalCount = await db.getTotalCount();
      console.log(`\nProgress update: ${currentCount}/${totalCount} locations geocoded (${((currentCount/totalCount)*100).toFixed(1)}%)\n`);
    }
  }
  
  // Flush any remaining errors before returning
  if (results.errors && results.errors.length > 0) {
    await reporting.appendErrorsToLogFile(results.errors);
    results.errors = []; // Clear the errors array after flushing
  }
  
  return results;
}
