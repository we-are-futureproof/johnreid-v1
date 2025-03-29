import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processUMCLocation } from '../locationProcessing';
import * as addressValidationModule from '../addressValidation';
import * as propertyEnrichmentModule from '../propertyEnrichment';
import { evaluatePropertyViability } from '../propertyEnrichment';
import { sampleLocation } from '../../__tests__/fixtures/locationFixtures';
import { enrichmentResponse, largePropertyAcres, smallProperty } from '../../__tests__/fixtures/propertyFixtures';

describe('Location Processing Service', () => {
  // Default test setup
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('End-to-End Smarty API Flow Tests', () => {
    beforeEach(() => {
      // Mock the dependent services
      vi.spyOn(addressValidationModule, 'validateAddress').mockResolvedValue({
        metadata: { smarty_key: 'test-smarty-key-123' }
      });
      
      vi.spyOn(propertyEnrichmentModule, 'enrichProperty').mockResolvedValue(enrichmentResponse);
    });
    
    it('should successfully process a location through entire API flow', async () => {
      const result = await processUMCLocation(sampleLocation);
      
      // Verify the complete flow worked
      expect(result.smarty_key).toBe('test-smarty-key-123');
      expect(result.viable).toBeDefined();
      expect(result.smarty).toEqual(enrichmentResponse);
      
      // Verify both services were called with correct parameters
      expect(addressValidationModule.validateAddress).toHaveBeenCalledWith(sampleLocation);
      expect(propertyEnrichmentModule.enrichProperty).toHaveBeenCalledWith('test-smarty-key-123');
    });
    
    it('should handle missing smarty_key gracefully', async () => {
      // Mock address validation to return null (failed validation)
      vi.spyOn(addressValidationModule, 'validateAddress').mockResolvedValueOnce(null);
      
      const result = await processUMCLocation(sampleLocation);
      
      // Should return the original location unmodified
      expect(result).toEqual(sampleLocation);
      
      // Property enrichment should not be called
      expect(propertyEnrichmentModule.enrichProperty).not.toHaveBeenCalled();
    });
    
    it('should handle missing metadata in validation response', async () => {
      // Mock validation without metadata
      vi.spyOn(addressValidationModule, 'validateAddress').mockResolvedValueOnce({
        // No metadata property
        delivery_line_1: '123 Main St'
      });
      
      const result = await processUMCLocation(sampleLocation);
      
      // Should return the original location unmodified
      expect(result).toEqual(sampleLocation);
      
      // Property enrichment should not be called
      expect(propertyEnrichmentModule.enrichProperty).not.toHaveBeenCalled();
    });
    
    it('should skip processing for inactive/closed locations', async () => {
      // Create a location with non-active status
      const inactiveLocation = { 
        ...sampleLocation, 
        status: 'closed' 
      };
      
      const result = await processUMCLocation(inactiveLocation);
      
      // Should return the original location unmodified
      expect(result).toEqual(inactiveLocation);
      
      // Services should not be called for inactive locations
      expect(addressValidationModule.validateAddress).not.toHaveBeenCalled();
      expect(propertyEnrichmentModule.enrichProperty).not.toHaveBeenCalled();
    });
  });
  
  describe('Failure Path Tests', () => {
    it('should handle property enrichment failure gracefully', async () => {
      // Mock successful address validation
      vi.spyOn(addressValidationModule, 'validateAddress').mockResolvedValue({
        metadata: { smarty_key: 'test-smarty-key-123' }
      });
      
      // Mock failed property enrichment
      vi.spyOn(propertyEnrichmentModule, 'enrichProperty').mockResolvedValue(null);
      
      const result = await processUMCLocation(sampleLocation);
      
      // Should still have smarty_key but no viability data
      expect(result.smarty_key).toBe('test-smarty-key-123');
      expect(result.viable).toBeUndefined();
      expect(result.smarty).toBeUndefined();
    });
  });
  
  describe('Property Viability Evaluation Tests', () => {
    it('should correctly identify viable properties by acres', () => {
      const result = evaluatePropertyViability(largePropertyAcres);
      expect(result).toBe(true);
    });
    
    it('should correctly identify non-viable properties', () => {
      const result = evaluatePropertyViability(smallProperty);
      expect(result).toBe(false);
    });
    
    it('should handle undefined property data', () => {
      // Pass an explicitly null value to evaluatePropertyViability
      // @ts-ignore - this is intentionally testing the function's behavior with undefined
      const result = evaluatePropertyViability(undefined);
      expect(result).toBeUndefined();
    });
    
    it('should handle null property data', () => {
      // @ts-ignore - this is intentionally testing the function's behavior with null
      const result = evaluatePropertyViability(null);
      expect(result).toBeUndefined();
    });
    
    it('should handle property data without size information', () => {
      const result = evaluatePropertyViability({
        // Missing size properties
      });
      expect(result).toBeUndefined();
    });
  });
});
