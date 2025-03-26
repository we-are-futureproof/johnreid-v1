// Script to geocode UMC church locations using Mapbox and save to Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Load configuration from YAML file
let config;
try {
  const configPath = path.resolve(__dirname, 'geocoding-config.yaml');
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  console.log('Loaded configuration from geocoding-config.yaml');
} catch (error) {
  console.warn('Warning: Could not load configuration file, using defaults', error);
  config = {
    processing: { max_records: 0, batch_size: 20, max_concurrent: 5 },
    rate_limits: { requests_per_minute: 300 },
    geocoding: { max_failures: 3, min_relevance: 0.5 },
    filters: { states: [], statuses: [] }
  };
}

// Set up Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const mapboxToken = process.env.VITE_MAPBOX_ACCESS_TOKEN;

// Validation
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

if (!mapboxToken) {
  console.error('Missing Mapbox token in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a rate limiter to prevent hitting Mapbox API limits
class RateLimiter {
  constructor(requestsPerMinute) {
    this.queue = [];
    this.processing = false;
    // Calculate delay needed between requests to stay under the limit
    // Add 10% buffer to be safe
    this.delayMs = Math.ceil((60 * 1000) / (requestsPerMinute * 0.9));
    this.lastRequestTime = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Wait if needed to respect rate limit
    if (timeSinceLastRequest < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Process the next request
    const { fn, resolve, reject } = this.queue.shift();
    this.lastRequestTime = Date.now();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Process next item with a small delay
    setTimeout(() => this.processQueue(), this.delayMs);
  }
}

// Create a rate limiter instance based on configuration
const requestsPerMinute = config.rate_limits.requests_per_minute || 300;
const mapboxLimiter = new RateLimiter(requestsPerMinute);
console.log(`Rate limiting set to ${requestsPerMinute} requests per minute`);

// Geocode a single address using Mapbox with rate limiting
async function geocodeAddress(address, city, state) {
  // Wrap the actual geocoding in the rate limiter
  return mapboxLimiter.add(async () => {
    try {
      // Format the full address for geocoding
      const fullAddress = `${address}, ${city}, ${state}`;
      
      // URL encode the address
      const encodedAddress = encodeURIComponent(fullAddress);
      
      // Construct the Mapbox Geocoding API URL
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`;
      
      // Make the request to Mapbox
      const response = await fetch(url);
      
      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    
    const data = await response.json();
    
    // Check if we got a valid result
    if (!data || !data.features || !Array.isArray(data.features)) {
      console.log(`Invalid response format for: ${fullAddress}`);
      return null;
    }
    
    if (data.features.length === 0) {
      console.log(`No geocoding results found for: ${fullAddress}`);
      return null;
    }
    
    const feature = data.features[0];
    
    // Check relevance score against minimum threshold
    const minRelevance = config.geocoding.min_relevance || 0.5;
    if (feature.relevance < minRelevance) {
      console.log(`Low relevance score (${feature.relevance}) below threshold of ${minRelevance} for: ${fullAddress}`);
      return null;
    }
    
    // Validate center coordinates
    if (!feature.center || !Array.isArray(feature.center) || feature.center.length !== 2) {
      console.log(`Invalid coordinates format for: ${fullAddress}`);
      return null;
    }
    
    const [longitude, latitude] = feature.center;
    
    // Validate longitude and latitude are numbers
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      console.log(`Invalid coordinate types for: ${fullAddress}`);
      return null;
    }
    
    // Extract postal code if available
    let postalCode = '';
    if (feature.context && Array.isArray(feature.context)) {
      for (const ctx of feature.context) {
        if (ctx && ctx.id && typeof ctx.id === 'string' && ctx.id.startsWith('postcode')) {
          postalCode = ctx.text || '';
          break;
        }
      }
    }
    
    return {
      longitude,
      latitude,
      accuracy: typeof feature.relevance === 'number' ? feature.relevance : 0,  // Relevance score (0-1)
      formattedAddress: feature.place_name || fullAddress, // Full formatted address
      postalCode,
      placeType: feature.place_type && Array.isArray(feature.place_type) ? feature.place_type[0] || '' : ''
    };
    } catch (error) {
      console.error(`Error geocoding address: ${address}, ${city}, ${state}`, error);
      return null;
    }
  });
}

// Verify the required columns exist in the umc_locations table
async function validateGeoColumns() {
  try {
    // Use a simpler approach - just try to select the columns we need
    // This will tell us if they exist without needing to access information_schema
    const { data, error } = await supabase
      .from('umc_locations')
      .select('latitude, longitude, geocoded_address, geocoded_postal_code, geocoding_accuracy, geocoded_at')
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
    console.error('Unexpected error validating columns:', error);
    return false;
  }
}

// Fetch UMC locations from the database that haven't been geocoded yet
async function fetchUMCLocations() {
  try {
    let query = supabase
      .from('umc_locations')
      .select('gcfa, name, address, city, state, latitude, longitude, status')
      .is('latitude', null) // Only get locations that haven't been geocoded yet
      .eq('skip_geocoding', false); // Don't process records marked to be skipped
    
    // Apply state filter if configured
    if (config.filters.states && config.filters.states.length > 0) {
      query = query.in('state', config.filters.states);
      console.log(`Filtering by states: ${config.filters.states.join(', ')}`);
    }
    
    // Apply status filter if configured
    if (config.filters.statuses && config.filters.statuses.length > 0) {
      query = query.in('status', config.filters.statuses);
      console.log(`Filtering by statuses: ${config.filters.statuses.join(', ')}`);
    }
    
    // Apply record limit if configured
    if (config.processing.max_records && config.processing.max_records > 0) {
      query = query.limit(config.processing.max_records);
      console.log(`Limiting to ${config.processing.max_records} records`);
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching UMC locations:', error);
    return [];
  }
}

// Update location with geocoding results
async function updateLocationWithGeocodingResults(gcfa, results) {
  try {
    // Validate all required values exist
    if (!results || typeof results !== 'object') {
      console.error(`Invalid geocoding results for location ${gcfa}`);
      return false;
    }
    
    const {
      longitude,
      latitude,
      accuracy,
      formattedAddress,
      postalCode
    } = results;
    
    // Extra validation for required fields
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      console.error(`Invalid coordinates for location ${gcfa}: [${longitude}, ${latitude}]`);
      return false;
    }
    
    const { error } = await supabase
      .from('umc_locations')
      .update({
        longitude,
        latitude,
        geocoding_accuracy: accuracy || 0,
        geocoded_at: new Date().toISOString(),
        geocoded_address: formattedAddress || '',
        geocoded_postal_code: postalCode || ''
      })
      .eq('gcfa', gcfa);
      
    if (error) {
      console.error(`Error updating geocoding results for location ${gcfa}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating geocoding results for location ${gcfa}:`, error);
    return false;
  }
}

// Process locations in parallel batches
async function processBatch(locations, batchSize = 10, maxConcurrent = 5) {
  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  let errors = [];
  
  // Get initial count of geocoded locations
  const initialCount = await getGeocodedCount();
  const totalLocations = await getTotalCount();
  console.log(`\nStarting geocoding. Currently: ${initialCount}/${totalLocations} locations geocoded (${((initialCount/totalLocations)*100).toFixed(1)}%)`);
  console.log(`Found ${locations.length} locations to process...\n`);
  
  // Split locations into batches
  const batches = [];
  for (let i = 0; i < locations.length; i += batchSize) {
    batches.push(locations.slice(i, i + batchSize));
  }
  
  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const currentBatches = batches.slice(i, i + maxConcurrent);
    const batchStartNum = i + 1;
    const batchEndNum = Math.min(i + currentBatches.length, batches.length);
    
    console.log(`Processing batches ${batchStartNum} to ${batchEndNum} of ${batches.length}...`);
    
    // Process these batches in parallel
    const batchResults = await Promise.all(currentBatches.map(async (batch, batchIndex) => {
      const batchNum = i + batchIndex + 1;
      const batchResults = {
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      
      console.log(`Starting batch ${batchNum}/${batches.length}...`);
      
      // Process each location in the batch with Promise.all
      const locationPromises = batch.map(async (location) => {
        const result = { success: false, skipped: false, error: null };
        
        // Skip locations with missing address information
        if (!location.address || !location.city || !location.state) {
          const timestamp = new Date().toISOString();
          const errorMsg = `[${timestamp}] SKIPPED: Location ${location.gcfa} - ${location.name} has incomplete address data.\n  Address: ${location.address || 'MISSING'}\n  City: ${location.city || 'MISSING'}\n  State: ${location.state || 'MISSING'}`;
          console.error(errorMsg);
          batchResults.errors.push(errorMsg);
          batchResults.skipped++;
          result.skipped = true;
          
          // Mark this record to be skipped in future runs
          try {
            await supabase
              .from('umc_locations')
              .update({
                skip_geocoding: true,
                skip_reason: JSON.stringify({
                  reason: 'incomplete_address',
                  missing_fields: [
                    !location.address ? 'address' : null,
                    !location.city ? 'city' : null,
                    !location.state ? 'state' : null
                  ].filter(Boolean),
                  timestamp: new Date().toISOString()
                })
              })
              .eq('gcfa', location.gcfa);
            console.log(`Marked location ${location.gcfa} to be skipped in future runs due to incomplete address`);
          } catch (updateError) {
            console.error(`Failed to update skip status for location ${location.gcfa}:`, updateError);
          }
          
          return result;
        }
        
        try {
          // Geocode address (rate limiting is now handled by the RateLimiter class)
          const geocodingResults = await geocodeAddress(location.address, location.city, location.state);
          
          if (geocodingResults) {
            // Update the database with the geocoding results
            const updated = await updateLocationWithGeocodingResults(
              location.gcfa, 
              geocodingResults
            );
            
            if (updated) {
              // Success - minimal logging
              batchResults.success++;
              result.success = true;
            } else {
              const timestamp = new Date().toISOString();
              const errorMsg = `[${timestamp}] DB ERROR: Failed to update database for ${location.name} (${location.gcfa})\n  Coordinates: [${geocodingResults.longitude}, ${geocodingResults.latitude}]\n  Accuracy: ${geocodingResults.accuracy}\n  Address: ${geocodingResults.formattedAddress}`;
              console.error(errorMsg);
              batchResults.errors.push(errorMsg);
              batchResults.failed++;
              result.error = 'database_update_failed';
            }
          } else {
            const timestamp = new Date().toISOString();
            const errorMsg = `[${timestamp}] GEOCODING ERROR: No coordinates found for ${location.name} (${location.gcfa})\n  Address: ${location.address}, ${location.city}, ${location.state}`;
            console.error(errorMsg);
            batchResults.errors.push(errorMsg);
            batchResults.failed++;
            result.error = 'no_coordinates';
            
            // If this has reached max_failures attempts (tracked by consecutive error count), mark it to be skipped
            try {
              // First check if this already has previous failed attempts
              const { data: locationData } = await supabase
                .from('umc_locations')
                .select('details')
                .eq('gcfa', location.gcfa)
                .single();
              
              // Get current failure count or initialize to 0
              const details = locationData?.details || {};
              const geocodingFailures = (details.geocoding_failures || 0) + 1;
              const maxFailures = config.geocoding.max_failures || 3;
              
              // Update the failure count
              await supabase
                .from('umc_locations')
                .update({
                  details: {
                    ...details,
                    geocoding_failures: geocodingFailures,
                    last_geocoding_attempt: new Date().toISOString()
                  }
                })
                .eq('gcfa', location.gcfa);
              
              // If we've failed max_failures times, mark to skip
              if (geocodingFailures >= maxFailures) {
                await supabase
                  .from('umc_locations')
                  .update({
                    skip_geocoding: true,
                    skip_reason: JSON.stringify({
                      reason: 'consecutive_geocoding_failures',
                      failures: geocodingFailures,
                      last_error: 'no_coordinates',
                      address: `${location.address}, ${location.city}, ${location.state}`,
                      timestamp: new Date().toISOString()
                    })
                  })
                  .eq('gcfa', location.gcfa);
                console.log(`Marked location ${location.gcfa} to be skipped after ${geocodingFailures} failed geocoding attempts`);
              }
            } catch (updateError) {
              console.error(`Failed to update failure count for location ${location.gcfa}:`, updateError);
            }
          }
        } catch (error) {
          const timestamp = new Date().toISOString();
          const errorMsg = `[${timestamp}] EXCEPTION: Error processing location ${location.gcfa} (${location.name})\n  Error: ${error.message}\n  Stack: ${error.stack}\n  Address: ${location.address}, ${location.city}, ${location.state}`;
          console.error(errorMsg);
          batchResults.errors.push(errorMsg);
          batchResults.failed++;
          result.error = error;
        }
        
        batchResults.processed++;
        return result;
      });
      
      await Promise.all(locationPromises);
      
      console.log(`Completed batch ${batchNum}/${batches.length}. Success: ${batchResults.success}, Failed: ${batchResults.failed}, Skipped: ${batchResults.skipped}`);
      return batchResults;
    }));
    
    // Aggregate results from all batches
    for (const result of batchResults) {
      processed += result.processed;
      success += result.success;
      failed += result.failed;
      skipped += result.skipped;
      errors = [...errors, ...result.errors];
    }
    
    // Show overall progress after each group of concurrent batches
    const currentCount = await getGeocodedCount();
    console.log(`\nProgress update: ${currentCount}/${totalLocations} locations geocoded (${((currentCount/totalLocations)*100).toFixed(1)}%)\n`);
  }
  
  // Final summary
  console.log('\nGeocoding completed!');
  console.log(`Total locations processed: ${locations.length}`);
  console.log(`Successfully geocoded: ${success}`);
  console.log(`Failed to geocode: ${failed}`);
  console.log(`Skipped (incomplete address): ${skipped}`);
  
  // Run the SQL query to show detailed progress
  try {
    const progressQuery = `
    WITH Total AS (
        -- Calculate the total number of records once
        SELECT CAST(COUNT(*) AS REAL) AS total_records -- Cast to REAL/FLOAT for division
        FROM umc_locations
    ),
    ProcessedByStatus AS (
        -- Calculate counts for processed records grouped by status
        SELECT
            status,
            COUNT(*) AS status_count
        FROM umc_locations
        WHERE latitude IS NOT NULL
        GROUP BY status
    ),
    Aggregates AS (
        -- Calculate overall processed and pending counts
        SELECT
            SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) AS processed_count,
            SUM(CASE WHEN latitude IS NULL THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN skip_geocoding = true THEN 1 ELSE 0 END) AS skipped_count
        FROM umc_locations
    )
    -- Combine the results using UNION ALL (more efficient than UNION if rows are distinct)
    SELECT
        1 AS row_num,
        p.status_count AS count_val,
        -- Format using TO_CHAR (FM removes leading/trailing spaces)
        TO_CHAR((p.status_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
        p.status AS label
    FROM ProcessedByStatus p
    CROSS JOIN Total t

    UNION ALL

    SELECT
        2 AS row_num,
        a.processed_count AS count_val,
        -- Format using TO_CHAR
        TO_CHAR((a.processed_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
        'Subtotal (Processed)' AS label
    FROM Aggregates a
    CROSS JOIN Total t

    UNION ALL

    SELECT
        3 AS row_num,
        a.pending_count - a.skipped_count AS count_val,
        -- Format using TO_CHAR
        TO_CHAR(((a.pending_count - a.skipped_count) / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
        'Subtotal (Pending)' AS label
    FROM Aggregates a
    CROSS JOIN Total t
    
    UNION ALL
    
    SELECT
        4 AS row_num,
        a.skipped_count AS count_val,
        -- Format using TO_CHAR
        TO_CHAR((a.skipped_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
        'Subtotal (Skipped)' AS label
    FROM Aggregates a
    CROSS JOIN Total t

    UNION ALL

    SELECT
        5 AS row_num,
        CAST(t.total_records AS INTEGER) AS count_val,
        '100.00%' AS pct_formatted, -- TO_CHAR(100.0, 'FM990.00%') also works
        'Total Records' AS label
    FROM Total t

    ORDER BY
        row_num, label;
    `;
    
    const { data: progressData, error: progressError } = await supabase.rpc('run_sql', { sql: progressQuery });
    
    if (progressError) {
      console.error('Error running progress query:', progressError);
    } else {
      console.log('\n===== GEOCODING PROGRESS REPORT =====');
      
      // Format and display the report in a nice table
      const columnWidths = {
        count: 10,
        pct: 10,
        label: 30
      };
      
      // Print header
      console.log(
        'Count'.padEnd(columnWidths.count) + 
        'Percentage'.padEnd(columnWidths.pct) + 
        'Category'
      );
      console.log('-'.repeat(columnWidths.count + columnWidths.pct + columnWidths.label));
      
      // Print rows
      progressData.forEach(row => {
        console.log(
          String(row.count_val).padEnd(columnWidths.count) + 
          row.pct_formatted.padEnd(columnWidths.pct) + 
          row.label
        );
      });
      
      console.log('=====================================');
    }
  } catch (error) {
    console.error('Error generating progress report:', error);
  }
  
  // Get final count of geocoded locations
  const finalCount = await getGeocodedCount();
  const totalCount = await getTotalCount();
  console.log(`\nTotal geocoded locations in database: ${finalCount}/${totalCount} (${((finalCount/totalCount)*100).toFixed(1)}%)`);
  
  // Write errors to log file with detailed information
  if (errors.length > 0) {
    const fs = await import('fs');
    const logDir = './scripts/logs';
    
    // Create logs directory if it doesn't exist
    if (!fs.default.existsSync(logDir)) {
      fs.default.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create detailed log content with summary
    const logContent = [
      `====== GEOCODING ERROR LOG (${timestamp}) ======`,
      `Total locations processed: ${processed}`,
      `Successfully geocoded: ${success}`,
      `Failed to geocode: ${failed}`,
      `Skipped (incomplete address): ${skipped}`,
      '',
      '====== DETAILED ERROR MESSAGES ======',
      '',
      ...errors
    ].join('\n');
    
    // Main error log file with all details
    const logFile = `${logDir}/geocoding-errors-${timestamp}.log`;
    fs.default.writeFileSync(logFile, logContent);
    
    // Also create a summary file that contains just the counts
    const summaryFile = `${logDir}/geocoding-summary-${timestamp}.txt`;
    fs.default.writeFileSync(summaryFile, [
      `Geocoding completed at ${new Date().toLocaleString()}`,
      `Total locations processed: ${processed}`,
      `Successfully geocoded: ${success}`,
      `Failed to geocode: ${failed}`,
      `Skipped (incomplete address): ${skipped}`,
      `Total geocoded locations in database: ${await getGeocodedCount()}/${await getTotalCount()} (${((await getGeocodedCount()/await getTotalCount())*100).toFixed(1)}%)`,
      '',
      `See ${logFile} for complete error details.`
    ].join('\n'));
    
    console.log(`\nError details saved to: ${logFile}`);
    console.log(`Summary saved to: ${summaryFile}`);
  }
  
  return { success, failed, skipped };
}

// Get the count of geocoded locations (with latitude filled)
async function getGeocodedCount() {
  try {
    // Use a more reliable count approach
    const { data, error } = await supabase
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

// Get the total count of UMC locations
async function getTotalCount() {
  try {
    // Use a more reliable approach to count all records
    const { data, error } = await supabase
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

// Main function to run the geocoding process
async function main() {
  try {
    // Setup logging directory for this run
    const fs = await import('fs');
    const logDir = './scripts/logs';
    
    // Create logs directory if it doesn't exist
    if (!fs.default.existsSync(logDir)) {
      fs.default.mkdirSync(logDir, { recursive: true });
    }
    
    // Redirect console to log file as well
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `${logDir}/geocoding-${timestamp}.log`;
    
    // Create a write stream for the log file
    const logStream = fs.default.createWriteStream(logFile, { flags: 'a' });
    
    // Store the original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Override console methods to also write to log file
    console.log = function() {
      const args = Array.from(arguments);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
      logStream.write(message + '\n');
      originalConsoleLog.apply(console, arguments);
    };
    
    console.error = function() {
      const args = Array.from(arguments);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
      logStream.write('[ERROR] ' + message + '\n');
      originalConsoleError.apply(console, arguments);
    };
    
    console.log(`Geocoding process started at ${new Date().toLocaleString()}`);
    console.log(`Full log being written to: ${logFile}`);
    
    // Validate table columns
    console.log('Validating required columns in the umc_locations table...');
    const columnsValid = await validateGeoColumns();
    
    if (!columnsValid) {
      console.log('Required columns are missing from the umc_locations table.');
      console.log('Please ensure all required columns exist before continuing.');
      process.exit(1);
    }
    
    // Show initial stats
    const initialGeocodedCount = await getGeocodedCount();
    const totalLocations = await getTotalCount();
    console.log(`\nCurrent status: ${initialGeocodedCount}/${totalLocations} locations geocoded (${((initialGeocodedCount/totalLocations)*100).toFixed(1)}%)`);
    
    // Fetch UMC locations that haven't been geocoded yet
    console.log('Fetching UMC locations from database that need geocoding...');
    const locations = await fetchUMCLocations();
    
    if (locations.length === 0) {
      console.log('No UMC locations found that need geocoding. All locations may already be geocoded.');
      return;
    }
    
    console.log(`Found ${locations.length} UMC locations that need geocoding.`);
    
    // Get batch processing parameters from config
    const batchSize = config.processing.batch_size || 20;     // Process in batches
    const maxConcurrent = config.processing.max_concurrent || 5;  // Process N batches concurrently
    
    console.log(`Processing with batch size ${batchSize} and ${maxConcurrent} concurrent batches`);
    console.log(`Using rate limiting queue ensuring maximum ${requestsPerMinute} requests per minute`);
    console.log(`This keeps us well under Mapbox's rate limit of 600 requests per minute`);
    
    // Start processing in batches with concurrent execution
    const results = await processBatch(locations, batchSize, maxConcurrent);
    
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Close the log stream
    logStream.end();
  } catch (error) {
    console.error('Error in geocoding process:', error);
  }
}

// Run the main function
main().catch(console.error);
