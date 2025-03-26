/**
 * UMC Locations Geocoding Script - Wrapper
 * 
 * This is a thin wrapper script that uses the refactored modular geocoding implementation.
 * The core functionality has been moved to the '/scripts/geocoding' directory for better organization.
 */
import { executeGeocoding } from './geocoding/index.js';

// Pass command line arguments to the geocoding module
const cliArgs = process.argv.slice(2);

// Run the geocoding process
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