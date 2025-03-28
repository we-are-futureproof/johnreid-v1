import { supabase } from './supabase';
import { UMCLocation } from './supabase';

// Constants and service configuration

// With the server proxy setup, we no longer need to manage credentials in client-side code
// The credentials are now handled securely in the Vite server proxy

console.log('Smarty service initialized - using secure server proxy for API calls.');


// Minimum lot size in square feet (4.5 acres ≈ 196,020 sq ft)
const MIN_VIABLE_LOT_SQFT = 200000;
const MIN_VIABLE_ACRES = 4.5;

// Types for Smarty API responses
interface SmartyAddressValidationResponse {
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

interface SmartyPropertyEnrichmentResponse {
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

// Track API requests to implement debouncing
interface ApiRequestTracker {
  [key: string]: {
    lastRequestTime: number;
    pendingPromise?: Promise<any>;
  };
}

// Global request tracker for debouncing
const requestTracker: ApiRequestTracker = {};
const DEBOUNCE_INTERVAL = 5000; // 5 seconds debounce interval

/**
 * Validates and normalizes an address using Smarty Streets API
 * @param location UMC location to validate
 * @returns Promise with validation response
 */
export async function validateAddress(location: UMCLocation): Promise<SmartyAddressValidationResponse | null> {
  console.log('validateAddress called for:', {
    gcfa: location.gcfa,
    name: location.name,
    address: location.address,
    city: location.city,
    state: location.state
  });

  // Check if location has necessary address components
  if (!location.address || !location.city || !location.state) {
    console.error('Location missing required address components:', location.gcfa);
    return null;
  }
  
  // Using secure server-side proxy for API calls
  console.log('Using Smarty API via secure proxy');

  // Create request key for debouncing
  const requestKey = `validate_${location.gcfa}`;

  // Check if we have a recent request
  const now = Date.now();
  const trackerEntry = requestTracker[requestKey];
  
  if (trackerEntry && (now - trackerEntry.lastRequestTime) < DEBOUNCE_INTERVAL) {
    // Return existing promise if it's still pending
    if (trackerEntry.pendingPromise) {
      console.log(`Returning cached promise for ${requestKey}`);
      return trackerEntry.pendingPromise;
    }
  }

  // Create a new promise for this request
  const requestPromise = new Promise<SmartyAddressValidationResponse | null>(async (resolve) => {
    try {
      // Build URL using Supabase edge function
      // Instead of calling Smarty API directly, we'll use our edge function
      // No need to append auth credentials - handled securely by the edge function
      const url = new URL(import.meta.env.VITE_SUPABASE_FUNCTIONS_URL + '/smarty-address-validation', window.location.origin);
      
      // Parse address to extract the street portion (possibly contains city/zip in the field)
      let street = location.address;
      
      // More robust parsing approach
      // First, check for ZIP code pattern and remove it and anything after
      const zipPattern = /\b\d{5}(-\d{4})?\b/;
      const zipMatch = street.match(zipPattern);
      
      if (zipMatch) {
        const zipIndex = street.indexOf(zipMatch[0]);
        if (zipIndex > 0) {
          street = street.substring(0, zipIndex).trim();
        }
      }
      
      // Then check for state abbreviation or full state name
      if (location.state) {
        // Try state abbreviation (2 letter code)
        const stateAbbrPattern = new RegExp(`\\b${location.state}\\b`, 'i');
        if (stateAbbrPattern.test(street)) {
          const parts = street.split(stateAbbrPattern);
          street = parts[0].trim();
        }
        
        // Try full state name if available
        const stateFullNames: Record<string, string> = {
          'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
          'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
          'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
          'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
          'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
          'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
          'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
          'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
          'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
          'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
          'DC': 'District of Columbia'
        };
        
        const fullStateName = stateFullNames[location.state.toUpperCase()];
        if (fullStateName && street.includes(fullStateName)) {
          const parts = street.split(fullStateName);
          street = parts[0].trim();
        }
      }
      
      // Next, remove city name
      if (location.city && street.includes(location.city)) {
        const cityPattern = new RegExp(`\\b${location.city}\\b`, 'i');
        const parts = street.split(cityPattern);
        street = parts[0].trim();
      }
      
      // Remove commas, double spaces and other artifacts
      street = street.replace(/,/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
      
      console.log('Parsed street address:', {
        original: location.address,
        parsed: street
      });
      
      url.searchParams.append('street', street);
      url.searchParams.append('city', location.city);
      url.searchParams.append('state', location.state);
      url.searchParams.append('candidates', '1');
      url.searchParams.append('match', 'enhanced');

      const fullUrl = url.toString();
      console.log(`Validating address for ${location.name} (GCFA: ${location.gcfa})`);
      
      // Create a properly redacted URL for logging
      const redactedUrl = new URL(fullUrl);
      redactedUrl.searchParams.set('auth-token', 'REDACTED');
      console.log('API request URL:', redactedUrl.toString());

      // Make API request
      console.log('Making API request to Smarty...');
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        }
      });
      console.log('API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`Address validation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response data:', JSON.stringify(data).substring(0, 500) + '...');

      // Smarty returns an array of candidates
      if (Array.isArray(data) && data.length > 0) {
        console.log('Found address match with smarty_key:', data[0].metadata?.smarty_key);
        resolve(data[0]);
      } else {
        console.warn(`No address matches found for ${location.name} (GCFA: ${location.gcfa})`);
        resolve(null);
      }
    } catch (error) {
      console.error('Error validating address:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      console.error('Error during fetch - checking network connectivity and API endpoint accessibility');
      
      // Try to log additional information about the request
      try {
        // Check both general network connectivity and our local proxy
        fetch('https://www.google.com')
          .then(response => {
            console.log('General network connectivity check:', response.ok ? 'Success' : 'Failed');
            
            // Also test our proxy endpoint
            return fetch('/api/smarty', { method: 'HEAD' });
          })
          .then(response => {
            console.log('Proxy endpoint accessibility check:', response.ok ? 'Success' : 'Failed');
          })
          .catch(e => {
            console.error('Network connectivity check failed:', e);
          });
      } catch (e) {
        console.error('Could not perform network check:', e);
      }
      
      resolve(null);
    }
  });

  // Update request tracker
  requestTracker[requestKey] = {
    lastRequestTime: now,
    pendingPromise: requestPromise
  };

  // Clear the pending promise reference when it resolves
  requestPromise.then(result => {
    if (requestTracker[requestKey]) {
      requestTracker[requestKey].pendingPromise = undefined;
    }
    return result;
  });

  return requestPromise;
}

/**
 * Enriches a property with data from Smarty API using the smarty_key from address validation
 * @param smartyKey Smarty key obtained from address validation
 * @returns Promise with property enrichment data
 */
export async function enrichProperty(smartyKey: string): Promise<SmartyPropertyEnrichmentResponse | null> {
  // Create request key for debouncing
  const requestKey = `enrich_${smartyKey}`;

  // Check if we have a recent request
  const now = Date.now();
  const trackerEntry = requestTracker[requestKey];
  
  if (trackerEntry && (now - trackerEntry.lastRequestTime) < DEBOUNCE_INTERVAL) {
    // Return existing promise if it's still pending
    if (trackerEntry.pendingPromise) {
      console.log(`Returning cached promise for ${requestKey}`);
      return trackerEntry.pendingPromise;
    }
  }

  // Create a new promise for this request
  const requestPromise = new Promise<SmartyPropertyEnrichmentResponse | null>(async (resolve) => {
    try {
      // Build URL for property enrichment using Supabase edge function
      // Instead of calling Smarty API directly, we'll use our edge function
      // No need to append auth credentials - handled securely by the edge function
      const url = new URL(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/smarty-property-enrichment/lookup/${smartyKey}/property/principal`, window.location.origin);

      console.log(`Enriching property with smarty_key: ${smartyKey}`);

      // Make API request
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Property enrichment failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      resolve(data);
    } catch (error) {
      console.error('Error enriching property:', error);
      resolve(null);
    }
  });

  // Update request tracker
  requestTracker[requestKey] = {
    lastRequestTime: now,
    pendingPromise: requestPromise
  };

  // Clear the pending promise reference when it resolves
  requestPromise.then(result => {
    if (requestTracker[requestKey]) {
      requestTracker[requestKey].pendingPromise = undefined;
    }
    return result;
  });

  return requestPromise;
}

/**
 * Evaluates if a property is viable based on lot size
 * @param propertyData Smarty property enrichment data
 * @returns Boolean indicating viability (true = viable, false = not viable, undefined = couldn't determine)
 */
export function evaluatePropertyViability(propertyData: SmartyPropertyEnrichmentResponse | null): boolean | undefined {
  if (!propertyData) {
    return undefined;
  }

  // Extract lot size information
  const lotSizeAcres = propertyData.lot_size_acres;
  const lotSizeSqft = propertyData.lot_size_sqft;

  // Check if we have lot size data
  if (lotSizeAcres === undefined && lotSizeSqft === undefined) {
    console.warn('Property data missing lot size information');
    return undefined;
  }

  // Evaluate viability based on available data
  if (lotSizeAcres !== undefined && lotSizeAcres >= MIN_VIABLE_ACRES) {
    return true;
  }

  if (lotSizeSqft !== undefined && lotSizeSqft >= MIN_VIABLE_LOT_SQFT) {
    return true;
  }

  // If we have either metric and it's below threshold, property is not viable
  if (lotSizeAcres !== undefined || lotSizeSqft !== undefined) {
    return false;
  }

  // Default case - couldn't determine
  return undefined;
}

/**
 * Process a UMC location to determine its viability using Smarty API
 * @param location UMC location to evaluate
 * @returns Updated location with viability and Smarty data
 */
export async function processUMCLocation(location: UMCLocation): Promise<UMCLocation> {
  console.log('processUMCLocation called for:', {
    gcfa: location.gcfa,
    name: location.name,
    status: location.status,
    viable: location.viable,
  });
  
  // Skip processing if not active or location has already been processed
  if (location.status?.toLowerCase() !== 'active' || (location.viable !== undefined && location.viable !== null)) {
    console.log('Skipping processing - inactive or already processed');
    return location;
  }
  
  console.log('Property eligible for enrichment, proceeding with API calls');

  try {
    // Step 1: Validate address to get smarty_key
    const validationResult = await validateAddress(location);
    
    if (!validationResult || !validationResult.metadata?.smarty_key) {
      console.warn(`Could not obtain smarty_key for ${location.name} (GCFA: ${location.gcfa})`);
      return location;
    }

    // Step 2: Use smarty_key to get property enrichment data
    const smartyKey = validationResult.metadata.smarty_key;
    const enrichmentResult = await enrichProperty(smartyKey);
    
    if (!enrichmentResult) {
      console.warn(`Could not enrich property data for ${location.name} (GCFA: ${location.gcfa})`);
      return location;
    }

    // Step 3: Evaluate property viability
    const isViable = evaluatePropertyViability(enrichmentResult);

    // Step 4: Update location with new data
    const updatedLocation = {
      ...location,
      smarty_key: smartyKey,
      smarty: enrichmentResult,
      viable: isViable
    };

    // Step 5: Save to database (exclude this if you want to handle updates separately)
    await updateLocationInDatabase(updatedLocation);

    return updatedLocation;
  } catch (error) {
    console.error(`Error processing location ${location.name} (GCFA: ${location.gcfa}):`, error);
    return location;
  }
}

/**
 * Updates a UMC location in the database with enrichment data
 * @param location Updated UMC location
 * @returns Promise resolving to success status
 */


/**
 * Test function to verify Smarty API connectivity
 * @returns Promise resolving to connectivity status
 */
export async function testBasicConnectivity(): Promise<{success: boolean, message: string}> {
  try {
    console.log('Testing basic connectivity to public endpoint...');
    const response = await fetch('https://httpbin.org/get');
    const data = await response.json();
    return {
      success: true,
      message: `Basic HTTP fetch works: ${JSON.stringify(data).substring(0, 50)}...`
    };
  } catch (error) {
    return {
      success: false,
      message: `Basic HTTP fetch failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function testSmartyApiConnectivity(): Promise<{success: boolean, message: string}> {
  try {
    console.log('Testing Smarty API connectivity...');
    
    // Use local proxy for the test request
    // Create simple test URL using our secure proxy
    const url = new URL('/api/smarty/street-address', window.location.origin);
    url.searchParams.append('street', '1600 Amphitheatre Parkway');
    url.searchParams.append('city', 'Mountain View');
    url.searchParams.append('state', 'CA');
    url.searchParams.append('candidates', '1');
    
    console.log('Making test request to Smarty API...');
    const response = await fetch(url.toString());
    
    console.log('Test response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      return {
        success: false,
        message: `API responded with error: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      message: `API connectivity successful. Response contains ${Array.isArray(data) ? data.length : 0} results`
    };
  } catch (error) {
    console.error('Error testing API connectivity:', error);
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function updateLocationInDatabase(location: UMCLocation): Promise<boolean> {
  try {
    // Only update if we have a valid GCFA
    if (!location.gcfa) {
      console.error('Cannot update location without GCFA identifier');
      return false;
    }

    // Update only the necessary fields
    const { error } = await supabase
      .from('umc_locations')
      .update({
        viable: location.viable,
        smarty_key: location.smarty_key,
        smarty: location.smarty
      })
      .eq('gcfa', location.gcfa);

    if (error) {
      console.error('Error updating location in database:', error);
      return false;
    }

    console.log(`Successfully updated location ${location.name} (GCFA: ${location.gcfa}) with enrichment data`);
    return true;
  } catch (error) {
    console.error('Unexpected error updating location:', error);
    return false;
  }
}
