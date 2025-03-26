// Configuration loading and validation for geocoding
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from YAML file and apply CLI overrides
 * @param {Array} cliArgs - Command line arguments
 * @returns {Object} Configuration object
 */
export function loadConfig(cliArgs = []) {
  // Check if --all flag is provided
  const processAllRecords = cliArgs.includes('--all');
  
  // Default configuration with conservative settings
  const defaultConfig = {
    processing: {
      max_records: processAllRecords ? 0 : 100, // 0 = no limit when --all flag is used, otherwise 100
      batch_size: 20,   // Process in batches of 20
      max_concurrent: 5 // Process 5 batches concurrently
    },
    rate_limits: {
      requests_per_minute: 300 // Keep under Mapbox's free tier limit
    },
    geocoding: {
      max_failures: 3,   // Mark to skip after 3 consecutive failures
      min_relevance: 0.3 // Minimum relevance score to accept
    },
    filters: {
      states: [],    // Only process records for these states (empty = all)
      statuses: []   // Only process records with these statuses (empty = all)
    }
  };

  // Try to load custom configuration
  try {
    // Config file is in the scripts directory (2 levels up from lib dir)
    const scriptsDir = path.resolve(__dirname, '../..');
    const configPath = path.resolve(scriptsDir, 'geocoding-config.yaml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    console.log('Loaded configuration from geocoding-config.yaml');
    
    // Override max_records if --all flag is present
    if (processAllRecords) {
      config.processing.max_records = 0;
    }
    
    return config;
  } catch (error) {
    console.warn('Warning: Could not load configuration file, using defaults', error);
    return defaultConfig;
  }
}

/**
 * Validate that environment variables needed for geocoding are present
 * @returns {boolean} True if all required env vars are present
 */
export function validateEnv() {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_MAPBOX_ACCESS_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}
