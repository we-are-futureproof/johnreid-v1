/**
 * Type definitions for test fixtures
 * These are simplified versions of the types used in the actual application
 */

/**
 * Test specific representation of the SmartyPropertyEnrichmentResponse
 * This mirrors the interface defined in smartyService.ts
 */
// Define types for both object and array formats that the service uses
export type TestSmartyPropertyEnrichmentResponse = 
  | TestSmartyPropertyObjectResponse 
  | TestSmartyPropertyArrayResponse;

// Object format response (typical API response)
export interface TestSmartyPropertyObjectResponse {
  smarty_key?: string;
  property_id?: string;
  property_type?: string;
  property_use_type?: string;
  property_use_description?: string;
  lot_size_acres?: number;
  lot_size_sqft?: number;
  lot_size_irregular?: boolean;
  lot_size_dimensions?: string;
  
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  
  parcel?: {
    apn?: string;
    fips_code?: string;
    frontage_ft?: number;
    depth_ft?: number;
    area_sq_ft?: number;
  };
  
  lot?: {
    size_acres?: number;
    size_sq_ft?: number;
    zoning?: string;
  };
}

// Array format (edge function response)
export interface TestSmartyPropertyArrayItem {
  attributes?: {
    acres?: string;
    lot_sqft?: string;
  };
  property_use_type?: string;
}

// Create an interface that extends Array but also has the properties tests expect
export interface TestSmartyPropertyArrayResponse extends Array<TestSmartyPropertyArrayItem> {
  // Add common properties that tests expect to be available
  property_id?: string;
  lot?: {
    size_acres?: number;
    size_sq_ft?: number;
    zoning?: string;
  };
  // These properties are used by evaluatePropertyViability
  lot_size_acres?: number;
  lot_size_sqft?: number;
  property_use_type?: string;
}

/**
 * Test specific representation of the SmartyAddressValidationResponse
 * This mirrors the interface defined in smartyService.ts
 */
export interface TestSmartyAddressValidationResponse {
  candidate_index?: number;
  delivery_line_1?: string;
  last_line?: string;
  components?: {
    primary_number?: string;
    street_name?: string;
    street_suffix?: string;
    city_name?: string;
    state_abbreviation?: string;
    zipcode?: string;
    plus4_code?: string;
  };
  metadata?: {
    latitude?: number;
    longitude?: number;
    county_name?: string;
    county_fips?: string;
    carrier_route?: string;
    congressional_district?: string;
    smarty_key?: string;  // Key used for property enrichment
  };
  analysis?: {
    dpv_match_code?: string;
    dpv_footnotes?: string;
    dpv_cmra?: string;
    dpv_vacant?: string;
    active?: string;
    footnotes?: string;
  };
}

/**
 * Test specific representation of the UMCLocation
 * This mirrors the interface defined in supabase.ts
 */
export interface TestUMCLocation {
  id?: number;
  gcfa?: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  district?: string;
  status?: string;
  viable?: boolean;
  smarty_key?: string;
  smarty?: TestSmartyPropertyEnrichmentResponse;
}
