import type { UMCLocation } from '../../supabase';

/**
 * Sample location for tests
 * Represents a UMC church location with complete address information
 */
export const sampleLocation: UMCLocation = {
  gcfa: 123456,
  url: 'https://example.com/church',
  name: 'Test UMC Church',
  conference: 'Test Conference',
  district: 'Test District',
  address: '123 Main St',
  city: 'Testville',
  state: 'TN',
  zip: '12345',
  status: 'active',
  longitude: -86.78901,
  latitude: 35.12345,
  details: {}
};

/**
 * Sample location with inactive status
 * Used for testing status-dependent logic
 */
export const inactiveLocation: UMCLocation = {
  ...sampleLocation,
  status: 'closed'
};

/**
 * Sample location with missing address components
 * Used for testing address validation error handling
 */
export const incompleteLocation: UMCLocation = {
  ...sampleLocation,
  address: '',
  city: ''
};

/**
 * Sample location with existing viability data
 * Used for testing processing logic for pre-processed locations
 */
export const alreadyProcessedLocation: UMCLocation = {
  ...sampleLocation,
  smarty_key: 'test-smarty-key-123',
  viable: false
};

/**
 * Sample location without a valid GCFA identifier
 * Used for testing database update error handling
 */
export const invalidGcfaLocation: UMCLocation = {
  ...sampleLocation,
  gcfa: 0 // 0 is falsy in JavaScript
} as UMCLocation;
