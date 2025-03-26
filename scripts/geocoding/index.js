/**
 * Main entry point for the geocoding module
 * This file orchestrates the geocoding process by combining the functionality
 * from all the specialized modules.
 */
import dotenv from 'dotenv';
import { loadConfig, validateEnv } from './lib/config.js';
import { RateLimiter } from './lib/rate-limiter.js';
import { Geocoder } from './lib/geocoder.js';
import { Logger } from './lib/logger.js';
import * as db from './lib/db.js';
import * as processor from './lib/processor.js';
import * as reporting from './lib/reporting.js';

/**
 * Execute the geocoding process
 * @param {Array} cliArgs - Command line arguments
 * @returns {Promise<boolean>} - True if process completed successfully
 */
export async function executeGeocoding(cliArgs = []) {
  try {
    // Setup logging
    const logger = new Logger();
    logger.setup();
    console.log('Starting UMC Locations geocoding script');
    
    // Load environment variables
    dotenv.config();
    
    // Validate environment variables are present
    if (!validateEnv()) {
      console.error('Missing required environment variables. Aborting.');
      return false;
    }
    
    // Load configuration from YAML file with CLI overrides
    const config = loadConfig(cliArgs);
    
    // Initialize Supabase client
    const supabase = db.initSupabase(
      process.env.VITE_SUPABASE_URL, 
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Validate database schema
    if (!await db.validateGeoColumns()) {
      console.error('Database schema validation failed. Aborting.');
      return false;
    }
    
    // Show initial progress report from the database
    const initialProgressQuery = await supabase.rpc('run_sql', { 
      sql_query: reporting.GEOCODING_PROGRESS_SQL 
    });
    
    if (initialProgressQuery.data) {
      console.log('Current status before starting geocoding:');
      reporting.displayProgressReport(initialProgressQuery.data);
    }
    
    // Create rate limiter
    const rateLimiter = new RateLimiter(config.rate_limits.requests_per_minute);
    
    // Create geocoder instance
    const geocoder = new Geocoder(
      process.env.VITE_MAPBOX_ACCESS_TOKEN,
      config,
      rateLimiter
    );
    
    // Fetch locations that need geocoding
    const locations = await db.fetchUMCLocations(config);
    
    if (locations.length === 0) {
      console.log('No UMC locations need geocoding. Exiting.');
      return true;
    }
    
    // Process all locations in batches
    console.log(`Starting geocoding process for ${locations.length} locations...`);
    const results = await processor.processAllLocations(locations, geocoder, config);
    
    // Show final results
    console.log('\n===== GEOCODING COMPLETED =====');
    console.log(`Total locations processed: ${results.processed}`);
    console.log(`Successfully geocoded: ${results.success}`);
    console.log(`Failed to geocode: ${results.failed}`);
    console.log(`Skipped (incomplete address): ${results.skipped}`);
    
    // Show final progress report from the database
    const finalProgressQuery = await supabase.rpc('run_sql', { 
      sql_query: reporting.GEOCODING_PROGRESS_SQL 
    });
    
    if (finalProgressQuery.data) {
      console.log('\nFinal status after geocoding:');
      reporting.displayProgressReport(finalProgressQuery.data);
    }
    
    // Save results to file
    await reporting.saveResultsToFile(results, results.errors, db);
    
    // Cleanup and close logger
    logger.cleanup();
    
    return true;
  } catch (error) {
    console.error('Fatal error during geocoding process:', error);
    return false;
  }
}

// If this module is executed directly, run the geocoding process
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  // Extract command line arguments, skipping node and script name
  const cliArgs = process.argv.slice(2);
  
  executeGeocoding(cliArgs)
    .then(success => {
      if (success) {
        console.log('Geocoding process completed successfully.');
        process.exit(0);
      } else {
        console.error('Geocoding process failed.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error in geocoding process:', error);
      process.exit(1);
    });
}
