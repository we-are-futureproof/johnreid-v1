/**
 * Sample validation response for address validation tests
 * Mimics the structure returned by the Smarty Streets API for address validation
 */
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

/**
 * Simplified validation response with just the essential fields
 * Used for testing minimal successful response handling
 */
export const minimalValidationResponse = {
  delivery_line_1: '123 Main St',
  metadata: { 
    smarty_key: 'test-smarty-key-123' 
  }
};
