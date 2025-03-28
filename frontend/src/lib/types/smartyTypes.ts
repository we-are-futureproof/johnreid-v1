/**
 * Types for Smarty Streets API responses and related data structures
 * Extracted from smartyService.ts during refactoring
 */

// Conversion constants
export const SQFT_PER_ACRE = 43560;

// Minimum viable acreage and square footage thresholds
export const MIN_VIABLE_ACRES = 4.5;
export const MIN_VIABLE_LOT_SQFT = MIN_VIABLE_ACRES * SQFT_PER_ACRE;  // 4.5 acres ≈ 196,020 sq ft

/**
 * Response from Smarty Streets address validation API
 */
export interface SmartyAddressValidationResponse {
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
 * Response from Smarty Streets property enrichment API
 */
export interface SmartyPropertyEnrichmentResponse {
  smarty_key?: string;
  property_type?: string;
  property_use_type?: string;
  property_use_description?: string;
  lot_size_acres?: number;
  lot_size_sqft?: number;
  lot_size_irregular?: boolean;
  lot_size_dimensions?: string;
  assessed_value?: {
    total_value?: number;
    land_value?: number;
    improvement_value?: number;
    assessment_year?: number;
  };
  market_value?: {
    total_value?: number;
    land_value?: number;
    improvement_value?: number;
    market_year?: number;
  };
  deed?: {
    sale_price?: number;
    sale_date?: string;
    document_type?: string;
  };
  building?: {
    construction?: {
      year_built?: number;
      effective_year_built?: number;
      renovation_year?: number;
      renovation_description?: string;
      construction_type?: string;
      exterior_walls?: string;
      roof_material?: string;
      foundation_type?: string;
    };
    features?: {
      baths?: number;
      bedrooms?: number;
      fireplaces?: number;
      stories?: number;
      total_sqft?: number;
      partial_sqft?: number;
      rooms?: number;
      pool?: boolean;
      parking_type?: string;
      parking_spaces?: number;
      parking_sqft?: number;
    };
  };
}

/**
 * Interface for tracking API requests to implement debouncing
 */
export interface ApiRequestTracker {
  [key: string]: {
    lastRequestTime: number;
    pendingPromise?: Promise<any>;
  };
}

/**
 * Interface for connectivity test results
 */
export interface ConnectivityTestResult {
  success: boolean;
  message: string;
}
