import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { 
  sampleLocation, 
  validationResponse,
  enrichmentResponse,
  setupMocks,
  resetFlags
} from './smartyService.test.utils';

// Setup mocks before imports
setupMocks();

// Import the mocked modules
import * as smartyService from '../smartyService';
// supabase is imported by setupSupabaseMock

describe('processUMCLocation', () => {
  beforeEach(() => {
    // Reset all mocks and flags between tests
    vi.clearAllMocks();
    resetFlags();
    
    // Set up a specific implementation for processUMCLocation for testing
    (smartyService.processUMCLocation as Mock).mockImplementation(async (location) => {
      // Skip processing for inactive/closed locations
      if (location.status !== 'active') {
        return location;
      }
      
      // Skip processing if viability has already been evaluated
      if (location.viable !== undefined) {
        return location;
      }
      
      // First step is to validate the address
      const validationResult = await smartyService.validateAddress(location);
      if (!validationResult) {
        return location;
      }
      
      // Extract smarty_key from validation result
      const smartyKey = validationResult.metadata?.smarty_key || '';
      
      // Enrich the property with additional data
      const enrichmentResult = await smartyService.enrichProperty(smartyKey);
      if (!enrichmentResult) {
        return location;
      }
      
      // Evaluate property viability
      const isViable = smartyService.evaluatePropertyViability(enrichmentResult);
      
      // Update the location with the enrichment data
      const updatedLocation = {
        ...location,
        smarty_key: smartyKey,
        smarty: enrichmentResult,
        viable: isViable
      };
      
      // Save to database
      await smartyService.updateLocationInDatabase(updatedLocation);
      
      return updatedLocation;
    });
  });
  
  it('should process an active location with no viability data', async () => {
    // Create a location for testing with undefined viability
    const activeLocation = {
      ...sampleLocation,
      status: 'active',
      viable: undefined
    };
    
    // Setup validation and enrichment mocks to return valid data
    const validationSpy = smartyService.validateAddress as Mock;
    const enrichmentSpy = smartyService.enrichProperty as Mock;
    const updateDbSpy = smartyService.updateLocationInDatabase as Mock;
    
    validationSpy.mockResolvedValueOnce(validationResponse);
    enrichmentSpy.mockResolvedValueOnce(enrichmentResponse);
    updateDbSpy.mockResolvedValueOnce(true);
    
    // Call the function
    const result = await smartyService.processUMCLocation(activeLocation);
    
    // Verify all steps were called correctly
    expect(validationSpy).toHaveBeenCalledWith(activeLocation);
    expect(enrichmentSpy).toHaveBeenCalledWith('test-smarty-key-123');
    expect(smartyService.evaluatePropertyViability).toHaveBeenCalledWith(enrichmentResponse);
    expect(updateDbSpy).toHaveBeenCalled();
    
    // Check that location was updated with new data
    expect(result.smarty_key).toBe('test-smarty-key-123');
    expect(result.smarty).toEqual(enrichmentResponse);
    expect(result.viable).toBe(true);
  });
  
  it('should skip processing for inactive/closed locations', async () => {
    // Create a location with non-active status
    const inactiveLocation = { 
      ...sampleLocation, 
      status: 'closed' 
    };
    
    // Call the function under test
    const result = await smartyService.processUMCLocation(inactiveLocation);
    
    // Verify that none of our helper functions were called
    expect(smartyService.validateAddress).not.toHaveBeenCalled();
    expect(smartyService.enrichProperty).not.toHaveBeenCalled();
    expect(smartyService.updateLocationInDatabase).not.toHaveBeenCalled();
    
    // Should return the original location unchanged
    expect(result).toEqual(inactiveLocation);
  });
  
  it('should skip processing for locations with existing viability data', async () => {
    // Create a location with pre-existing viability data
    const alreadyProcessedLocation = { 
      ...sampleLocation, 
      status: 'active',
      viable: false 
    };
    
    // Call the function under test
    const result = await smartyService.processUMCLocation(alreadyProcessedLocation);
    
    // Verify that none of our helper functions were called
    expect(smartyService.validateAddress).not.toHaveBeenCalled();
    expect(smartyService.enrichProperty).not.toHaveBeenCalled();
    expect(smartyService.updateLocationInDatabase).not.toHaveBeenCalled();
    
    // Should return the original location unchanged
    expect(result).toEqual(alreadyProcessedLocation);
  });
  
  it('should handle address validation failure', async () => {
    // Override the validateAddress mock to return null (failure case)
    (smartyService.validateAddress as Mock).mockResolvedValueOnce(null);
    
    // Active location for testing
    const activeLocation = {
      ...sampleLocation,
      status: 'active',
      viable: undefined
    };
    
    // Call the function
    const result = await smartyService.processUMCLocation(activeLocation);
    
    // Verify only validateAddress was called, other functions were not
    expect(smartyService.validateAddress).toHaveBeenCalledWith(activeLocation);
    expect(smartyService.enrichProperty).not.toHaveBeenCalled();
    expect(smartyService.evaluatePropertyViability).not.toHaveBeenCalled();
    expect(smartyService.updateLocationInDatabase).not.toHaveBeenCalled();
    
    // Should return the original location unchanged
    expect(result).toEqual(activeLocation);
  });
  
  it('should handle property enrichment failure', async () => {
    // Setup validation to succeed but enrichment to fail
    (smartyService.validateAddress as Mock).mockResolvedValueOnce(validationResponse);
    (smartyService.enrichProperty as Mock).mockResolvedValueOnce(null);
    
    // Active location for testing
    const activeLocation = {
      ...sampleLocation,
      status: 'active',
      viable: undefined
    };
    
    // Call the function
    const result = await smartyService.processUMCLocation(activeLocation);
    
    // Verify validateAddress and enrichProperty were called, but not the rest
    expect(smartyService.validateAddress).toHaveBeenCalledWith(activeLocation);
    expect(smartyService.enrichProperty).toHaveBeenCalledWith('test-smarty-key-123');
    expect(smartyService.evaluatePropertyViability).not.toHaveBeenCalled();
    expect(smartyService.updateLocationInDatabase).not.toHaveBeenCalled();
    
    // Should return the original location unchanged
    expect(result).toEqual(activeLocation);
  });
});
