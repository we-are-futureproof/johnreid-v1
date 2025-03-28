/**
 * Smarty Streets API service
 * 
 * This file now serves as a backward-compatible entry point for the refactored smartyService modules.
 * It re-exports all the functionality from the modularized services.
 * 
 * The code has been refactored into smaller, specialized modules:
 * - types/smartyTypes.ts: Type definitions and constants
 * - services/addressValidation.ts: Address validation functionality
 * - services/propertyEnrichment.ts: Property enrichment and viability evaluation
 * - services/locationProcessing.ts: UMC location processing functions
 * - services/connectivityTesting.ts: API connectivity testing
 */

// Re-export types
export type {
  SmartyAddressValidationResponse,
  SmartyPropertyEnrichmentResponse,
  ApiRequestTracker,
  ConnectivityTestResult
} from './types/smartyTypes';

// Re-export constants
export {
  MIN_VIABLE_ACRES,
  MIN_VIABLE_LOT_SQFT,
  SQFT_PER_ACRE
} from './types/smartyTypes';

// Re-export all service functions
export { validateAddress } from './services/addressValidation';
export { 
  enrichProperty,
  evaluatePropertyViability
} from './services/propertyEnrichment';
export { 
  processUMCLocation,
  updateLocationInDatabase
} from './services/locationProcessing';
export { 
  testBasicConnectivity,
  testSmartyApiConnectivity
} from './services/connectivityTesting';
