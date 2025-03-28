import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  enrichmentResponse, 
  apiErrorFlag, 
  resetFlags, 
  setupMocks 
} from './smartyService.test.utils';

// Setup mocks before imports
setupMocks();

// Import the mocked module
import * as smartyService from '../smartyService';

describe('enrichProperty', () => {
  beforeEach(() => {
    // Reset all mocks and flags between tests
    vi.clearAllMocks();
    resetFlags();
  });
  
  it('should successfully enrich a property with a valid smarty_key', async () => {
    const result = await smartyService.enrichProperty('test-smarty-key-123');
    
    expect(result).not.toBeNull();
    expect(result).toEqual(enrichmentResponse);
    // Use type assertion to access properties for testing
    expect((result as any)?.property_id).toBe('test-property-123');
    expect((result as any)?.lot?.size_acres).toBe(0.689);
  });
  
  it('should handle API errors gracefully', async () => {
    // Set the API error flag
    apiErrorFlag.enrichProperty = true;
    
    const result = await smartyService.enrichProperty('test-smarty-key-123');
    
    expect(result).toBeNull();
  });
  
  it('should return null for unknown smarty_key values', async () => {
    const result = await smartyService.enrichProperty('unknown-key');
    
    expect(result).toBeNull();
  });
});
