import type { TestSmartyPropertyEnrichmentResponse } from '../utils/testTypes';

/**
 * Sample enrichment response for property tests
 * Mimics the structure returned by the Smarty API for property enrichment
 */
export const enrichmentResponse: TestSmartyPropertyEnrichmentResponse = {
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
  },
  // Add these properties to match what evaluatePropertyViability expects
  lot_size_acres: 0.689,
  lot_size_sqft: 30000,
  property_use_type: 'religious'
};

/**
 * Sample small property below minimum viable size
 * Used for testing property viability evaluations
 */
export const smallProperty: TestSmartyPropertyEnrichmentResponse = {
  lot_size_acres: 3.0, // Below 4.5 acre minimum
  property_use_type: 'religious'
};

/**
 * Sample large property above minimum viable size (acres)
 */
export const largePropertyAcres: TestSmartyPropertyEnrichmentResponse = {
  lot_size_acres: 5.0, // Above 4.5 acre minimum
  property_use_type: 'religious'
};

/**
 * Sample large property above minimum viable size (square feet)
 */
export const largePropertySqft: TestSmartyPropertyEnrichmentResponse = {
  lot_size_sqft: 200000, // Above ~196,020 sqft minimum
  property_use_type: 'religious'
};

/**
 * Sample property without size data
 * Used for testing undefined viability evaluations
 */
export const noSizeProperty: TestSmartyPropertyEnrichmentResponse = {
  property_use_type: 'religious',
  // No lot size information
};

/**
 * Sample property data in array format (from edge function)
 * Using any type here since this represents a special case format
 * that doesn't match the standard SmartyPropertyEnrichmentResponse
 */
export const arrayProperty: TestSmartyPropertyEnrichmentResponse = [{
  attributes: {
    acres: '5.0',
    lot_sqft: '217800'
  },
  property_use_type: 'religious'
}];
