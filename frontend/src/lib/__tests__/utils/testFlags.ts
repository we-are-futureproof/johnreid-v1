/**
 * Test flags for controlling test behavior
 * 
 * These flags are used to simulate different scenarios during testing,
 * such as API errors, empty responses, and database errors.
 */

/**
 * API error flags
 * Set these to true to simulate API request failures
 */
export const apiErrorFlag = { 
  validateAddress: false, 
  enrichProperty: false,
  connectivityTest: false,
  smartyApiTest: false
};

/**
 * Empty response flags
 * Set these to true to simulate empty responses from APIs
 */
export const emptyResponseFlag = { 
  validateAddress: false,
  enrichProperty: false 
};

/**
 * Database error flags
 * Set these to true to simulate database operation failures
 */
export const databaseErrorFlag = { 
  updateLocation: false,
  fetchLocation: false 
};

/**
 * Reset all flags to their default values
 * Call this in beforeEach to ensure a clean test state
 */
export const resetFlags = () => {
  // API error flags
  apiErrorFlag.validateAddress = false;
  apiErrorFlag.enrichProperty = false;
  apiErrorFlag.connectivityTest = false;
  apiErrorFlag.smartyApiTest = false;
  
  // Empty response flags
  emptyResponseFlag.validateAddress = false;
  emptyResponseFlag.enrichProperty = false;
  
  // Database error flags
  databaseErrorFlag.updateLocation = false;
  databaseErrorFlag.fetchLocation = false;
};
