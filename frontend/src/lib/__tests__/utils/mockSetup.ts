import { vi } from 'vitest';
import type { UMCLocation } from '../../supabase';
import { apiErrorFlag, emptyResponseFlag, databaseErrorFlag } from './testFlags';
import { validationResponse } from '../fixtures/addressFixtures';
import { enrichmentResponse } from '../fixtures/propertyFixtures';
import { createSupabaseMock } from '../mocks/supabaseMocks';

/**
 * Sets up mocks for the smartyService module
 * 
 * This creates mocks for all exported functions in the smartyService module,
 * allowing tests to control their behavior using the test flags.
 */
export const setupSmartyServiceMocks = () => {
  // Setup mock for Smarty Service
  vi.mock('../../smartyService', () => ({
    validateAddress: vi.fn(async (location: UMCLocation) => {
      // Handle missing address components
      if (!location.address || !location.city || !location.state) {
        return null;
      }
      
      // Check the flags
      if (apiErrorFlag.validateAddress) {
        return null;
      }
      
      if (emptyResponseFlag.validateAddress) {
        return null;
      }
      
      // Default success case
      return validationResponse;
    }),
    
    testBasicConnectivity: vi.fn(async () => ({
      success: !apiErrorFlag.connectivityTest,
      message: apiErrorFlag.connectivityTest 
        ? 'Connection test failed' 
        : 'Connection test successful'
    })),
    
    testSmartyApiConnectivity: vi.fn(async () => ({
      success: !apiErrorFlag.smartyApiTest,
      message: apiErrorFlag.smartyApiTest 
        ? 'API connectivity test failed' 
        : 'API connectivity test successful'
    })),
    
    enrichProperty: vi.fn(async (smartyKey: string) => {
      // Check API error flag first
      if (apiErrorFlag.enrichProperty) {
        return null;
      }
      
      // Check empty response flag
      if (emptyResponseFlag.enrichProperty) {
        return null;
      }
      
      // Then check for valid smarty_key
      if (smartyKey === 'test-smarty-key-123') {
        return enrichmentResponse;
      }
      
      // Default case for unknown keys
      return null;
    }),
    
    evaluatePropertyViability: vi.fn((property) => {
      if (!property) return undefined;
      
      // Handle array data structure from edge function
      if (Array.isArray(property)) {
        const lotSizeAcres = property[0]?.attributes?.acres ? parseFloat(property[0]?.attributes?.acres) : undefined;
        const lotSizeSqft = property[0]?.attributes?.lot_sqft ? parseFloat(property[0]?.attributes?.lot_sqft) : undefined;
        const lotSize = lotSizeAcres || (lotSizeSqft ? lotSizeSqft / 43560 : undefined);
        return lotSize ? lotSize >= 0.5 : undefined;
      }
      
      // Special case: if this is our test enrichmentResponse object with lot.size_acres
      if (property.lot && property.lot.size_acres !== undefined) {
        return property.lot.size_acres >= 0.5;
      }
      
      // Handle various property data formats
      const lotSizeAcres = property.lot_size_acres || property.primary_lot?.size_acres;
      const lotSizeSqft = property.lot_size_sqft || property.primary_lot?.size_sq_ft;
      const lotSize = lotSizeAcres || (lotSizeSqft ? lotSizeSqft / 43560 : undefined);
      
      if (lotSize === undefined) return undefined;
      return lotSize >= 4.5;
    }),
    
    updateLocationInDatabase: vi.fn(async (location: UMCLocation) => {
      if (!location.gcfa) {
        return false;
      }
      
      // Handle database error flag
      if (databaseErrorFlag.updateLocation) {
        console.log('Database error flag is set for updateLocationInDatabase');
        // Still call the database functions for assertion testing
        const { supabase } = await import('../../supabase');
        await supabase
          .from('umc_locations')
          .update({})
          .eq('gcfa', location.gcfa);
        return false;
      }
      
      try {
        const { viable, smarty_key, smarty } = location;
        const updateData = { viable, smarty_key, smarty };
        
        // Use the supabase mock
        const { supabase } = await import('../../supabase');
        await supabase
          .from('umc_locations')
          .update(updateData)
          .eq('gcfa', location.gcfa);
          
        // Mock implementations will always return success in tests
        return true;
      } catch (error) {
        console.error('Error updating location:', error);
        return false;
      }
    }),
    
    processUMCLocation: vi.fn(async (location: UMCLocation) => {
      // This implementation will be overridden in the specific test suite
      return location;
    })
  }));
};

/**
 * Sets up all mocks needed for testing
 * 
 * This is a convenience function that sets up all mocks at once,
 * making it easier to prepare the test environment consistently.
 */
export const setupAllMocks = () => {
  setupSmartyServiceMocks();
  createSupabaseMock();
};

/**
 * For backward compatibility with existing tests
 * This is primarily a helper for migrating tests over time
 */
export const createTestSetup = () => {
  return {
    apiErrorFlag,
    emptyResponseFlag,
    databaseErrorFlag,
    resetFlags: () => {
      apiErrorFlag.validateAddress = false;
      apiErrorFlag.enrichProperty = false;
      emptyResponseFlag.validateAddress = false;
      databaseErrorFlag.updateLocation = false;
    },
    setupMocks: setupAllMocks
  };
};
