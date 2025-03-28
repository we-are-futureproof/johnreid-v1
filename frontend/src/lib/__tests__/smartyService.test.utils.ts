import { vi } from 'vitest';
import type { UMCLocation } from '../supabase';

// Sample validation response for address validation tests
export const validationResponse = {
  delivery_line_1: '123 Main St',
  last_line: 'Testville TN 12345',
  metadata: {
    latitude: 35.12345,
    longitude: -86.78901,
    county_name: 'Test County',
    state_abbreviation: 'TN',
    zip: '12345',
    precision: 'high',
    smarty_key: 'test-smarty-key-123'
  },
  analysis: {
    dpv_match_code: 'Y',
    dpv_vacant: 'N'
  }
};

// Sample enrichment response for property tests
export const enrichmentResponse = {
  property_id: 'test-property-123',
  address: {
    street: '123 Main St',
    city: 'Testville',
    state: 'TN',
    zipcode: '12345'
  },
  parcel: {
    apn: 'ABC-123-XYZ',
    fips_code: '12345',
    frontage_ft: 150,
    depth_ft: 200,
    area_sq_ft: 30000
  },
  lot: {
    size_acres: 0.689,
    size_sq_ft: 30000,
    zoning: 'R-1'
  }
};

// Sample location for tests
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
 * Create global flag variables for tests
 * These will be used directly by test files and mock implementations
 */
export const apiErrorFlag = { validateAddress: false, enrichProperty: false };
export const emptyResponseFlag = { validateAddress: false };
export const databaseErrorFlag = { updateLocation: false };

/**
 * Reset all flags to their default values
 */
export const resetFlags = () => {
  apiErrorFlag.validateAddress = false;
  apiErrorFlag.enrichProperty = false;
  emptyResponseFlag.validateAddress = false;
  databaseErrorFlag.updateLocation = false;
};

/**
 * Setup mocks for smartyService
 */
export const setupMocks = () => {
  // Setup mock for Smarty Service
  vi.mock('../smartyService', () => ({
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
      success: true,
      message: 'Connection test successful'
    })),
    
    testSmartyApiConnectivity: vi.fn(async () => ({
      success: true,
      message: 'API connectivity test successful'
    })),
    
    enrichProperty: vi.fn(async (smartyKey: string) => {
      // Check API error flag first
      if (apiErrorFlag.enrichProperty) {
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
        await import('../supabase').then(({ supabase }) => {
          supabase
            .from('umc_locations')
            .update({})
            .eq('gcfa', location.gcfa);
        });
        return false;
      }
      
      try {
        const { viable, smarty_key, smarty } = location;
        const updateData = { viable, smarty_key, smarty };
        
        // Use the supabase mock
        await import('../supabase').then(({ supabase }) => {
          supabase
            .from('umc_locations')
            .update(updateData)
            .eq('gcfa', location.gcfa);
        });
          
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
  
  // Setup Supabase mock
  vi.mock('../supabase', () => {
    // Create a proper chain of mock functions that matches how the real code uses them
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    
    return {
      supabase: {
        from: mockFrom
      }
    };
  });
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
    resetFlags,
    setupMocks
  };
};
