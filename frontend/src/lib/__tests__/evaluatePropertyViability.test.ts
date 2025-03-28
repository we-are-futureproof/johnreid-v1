import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../../test/setup';
import * as smartyService from '../smartyService';

// Import our refactored test utilities
import { setupTestEnvironment } from './utils/testHelpers';
import { largePropertyAcres, largePropertySqft, smallProperty, arrayProperty, noSizeProperty } from './fixtures/propertyFixtures';

describe('evaluatePropertyViability', () => {
  // Setup the test environment
  setupTestEnvironment(server);
  
  beforeEach(() => {
    // No need for API mocks as this is a pure function test
  });
  
  it('should return true for properties above minimum viable size (acres)', () => {
    // Cast our test fixture to the type expected by the service
    const result = smartyService.evaluatePropertyViability(largePropertyAcres as any);
    
    expect(result).toBe(true);
  });
  
  it('should return true for properties above minimum viable size (sqft)', () => {
    // Cast our test fixture to the type expected by the service
    const result = smartyService.evaluatePropertyViability(largePropertySqft as any);
    
    expect(result).toBe(true);
  });
  
  it('should return false for properties below minimum viable size', () => {
    // Cast our test fixture to the type expected by the service
    const result = smartyService.evaluatePropertyViability(smallProperty as any);
    
    expect(result).toBe(false);
  });
  
  it('should handle array data structure from edge function', () => {
    // Cast our test fixture to the type expected by the service
    const result = smartyService.evaluatePropertyViability(arrayProperty as any);
    
    expect(result).toBe(true);
  });
  
  it('should return undefined when no lot size data is present', () => {
    // Cast our test fixture to the type expected by the service
    const result = smartyService.evaluatePropertyViability(noSizeProperty as any);
    
    expect(result).toBeUndefined();
  });
  
  it('should return undefined when property data is null', async () => {
    const result = smartyService.evaluatePropertyViability(null);
    
    expect(result).toBeUndefined();
  });
});
