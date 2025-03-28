import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../../test/setup';
import * as smartyService from '../smartyService';

// Import the new test utilities
import { sampleLocation, incompleteLocation } from './fixtures/locationFixtures';
import { apiErrorFlag, emptyResponseFlag } from './utils/testFlags';
import { setupTestEnvironment } from './utils/testHelpers';
import { setupApiMocks } from './mocks/apiMocks';
import { setupAllMocks } from './utils/mockSetup';

describe('validateAddress', () => {
  // Setup the test environment
  setupTestEnvironment(server);
  
  // Run before each test to ensure proper setup
  beforeEach(() => {
    // Setup API mocks and reset flags
    setupApiMocks(server);
    setupAllMocks();
  });
  
  it('should successfully validate a complete address', async () => {
    const result = await smartyService.validateAddress(sampleLocation);
    
    expect(result).not.toBeNull();
    expect(result?.delivery_line_1).toBe('123 Main St');
    expect(result?.metadata?.smarty_key).toBe('test-smarty-key-123');
  });
  
  it('should return null when address components are missing', async () => {
    // Use the pre-defined incomplete location
    const result = await smartyService.validateAddress(incompleteLocation);
    expect(result).toBeNull();
    
    // Test other variations
    const noState = { ...sampleLocation, state: '' };
    const result2 = await smartyService.validateAddress(noState);
    expect(result2).toBeNull();
  });
  
  it('should handle API errors gracefully', async () => {
    // Set the API error flag
    apiErrorFlag.validateAddress = true;
    
    const result = await smartyService.validateAddress(sampleLocation);
    
    expect(result).toBeNull();
  });
  
  it('should handle empty response arrays', async () => {
    // Set the empty response flag
    emptyResponseFlag.validateAddress = true;
    
    const result = await smartyService.validateAddress(sampleLocation);
    
    expect(result).toBeNull();
  });
});
