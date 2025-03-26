#!/usr/bin/env node
/**
 * UMC Geocoding Script
 *
 * This script is the main entry point for the UMC geocoding process.
 * It includes argument parsing, validation, and calls the core geocoding functionality.
 *
 * Usage:
 *   pnpm geocode             - Process up to 100 records (default)
 *   pnpm geocode --all       - Process all records (unlimited)
 *   pnpm geocode --limit 500 - Process exactly 500 records
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { executeGeocoding } from './geocoding/index.js';

// Parse command line arguments
const args = process.argv.slice(2);

// Display help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
UMC Geocoding Script
====================

Usage:
  pnpm geocode             - Process up to 100 records (default)
  pnpm geocode --all       - Process all records (unlimited)
  pnpm geocode --limit N   - Process exactly N records (e.g., --limit 500)
  pnpm geocode --report    - Run data integrity checks on geocoded data

Examples:
  pnpm geocode --limit 1000
  pnpm geocode --all
  pnpm geocode --report
  `);
  process.exit(0);
}

// Validate --limit argument if provided
const limitIndex = args.findIndex(arg => arg === '--limit');
if (limitIndex !== -1 && limitIndex === args.length - 1) {
  console.error('Error: --limit requires a numeric value');
  console.log('Example: pnpm geocode --limit 500');
  process.exit(1);
}

if (limitIndex !== -1) {
  const limitValue = parseInt(args[limitIndex + 1], 10);
  if (isNaN(limitValue) || limitValue <= 0) {
    console.error('Error: --limit value must be a positive number');
    console.log('Example: pnpm geocode --limit 500');
    process.exit(1);
  }
}

// Execute the geocoding process
console.log('Starting UMC Locations geocoding');

// Run the geocoding process with the validated arguments
executeGeocoding(args)
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
