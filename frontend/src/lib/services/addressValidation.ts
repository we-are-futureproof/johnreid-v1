/**
 * Address validation service for Smarty Streets API
 * Extracted from smartyService.ts during refactoring
 */

import { UMCLocation } from '../supabase';
import { SmartyAddressValidationResponse, ApiRequestTracker } from '../types/smartyTypes';

// Global request tracker for debouncing
const requestTracker: ApiRequestTracker = {};
const DEBOUNCE_INTERVAL = 5000; // 5 seconds debounce interval

/**
 * Validates and normalizes an address using Smarty Streets API
 * @param location UMC location to validate
 * @returns Promise with validation response
 */
export async function validateAddress(location: UMCLocation | null | undefined): Promise<SmartyAddressValidationResponse | null> {
  // Check if location is null or undefined
  if (!location) {
    console.error('Null or undefined location provided to validateAddress');
    return null;
  }
  
  // Check if location has necessary address components
  if (!location.address || !location.city || !location.state) {
    console.error('Location missing required address components:', location.gcfa);
    return null;
  }

  // Create request key for debouncing
  const requestKey = `validate_${location.gcfa}`;

  // Check if we have a recent request
  const now = Date.now();
  const trackerEntry = requestTracker[requestKey];

  if (trackerEntry && (now - trackerEntry.lastRequestTime) < DEBOUNCE_INTERVAL) {
    // Return existing promise if it's still pending
    if (trackerEntry.pendingPromise) {
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
      const zipPattern = /\\b\\d{5}(-\\d{4})?\\b/;
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
        const stateAbbrPattern = new RegExp(`\\\\b${location.state}\\\\b`, 'i');
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
        const cityPattern = new RegExp(`\\\\b${location.city}\\\\b`, 'i');
        const parts = street.split(cityPattern);
        street = parts[0].trim();
      }

      // Remove any trailing commas and spaces
      street = street.replace(/,+$/, "").trim();

      // Add parameters to the URL directly like in the original implementation
      url.searchParams.append('street', street);
      url.searchParams.append('city', location.city);
      url.searchParams.append('state', location.state);
      url.searchParams.append('candidates', '1');
      url.searchParams.append('match', 'enhanced'); // Adding this missing parameter

      // Make the request - use same format as original implementation
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Address validation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Check if we got valid results
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`No address matches found for ${location.name} (GCFA: ${location.gcfa})`);
        resolve(null);
        return;
      }

      // Smarty returns an array of candidates
      // The smarty_key can be directly on the response object or in the metadata
      const smartyKey = data[0].smarty_key || data[0].metadata?.smarty_key;

      // Make sure we preserve the smarty_key in the expected format for downstream functions
      if (smartyKey && !data[0].metadata) {
        data[0].metadata = { smarty_key: smartyKey };
      } else if (smartyKey && !data[0].metadata?.smarty_key) {
        // Handle case where metadata exists but doesn't have smarty_key
        if (!data[0].metadata) {
          data[0].metadata = {};
        }
        data[0].metadata.smarty_key = smartyKey;
      }

      // Return the first (best) candidate with properly formatted metadata
      resolve(data[0]);

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
          .then(() => {
            // Also test our proxy endpoint
            return fetch('/api/smarty', { method: 'HEAD' });
          })
          .then(() => {})
          .catch(e => {
            console.error('Network connectivity check failed:', e);
          });
      } catch (e) {
        console.error('Could not perform network check:', e);
      }

      resolve(null);
    }
  });

  // Store the promise in the tracker
  requestTracker[requestKey] = {
    lastRequestTime: now,
    pendingPromise: requestPromise
  };

  // Clear the pending promise reference when it resolves
  requestPromise.then(() => {
    if (requestTracker[requestKey]) {
      requestTracker[requestKey].pendingPromise = undefined;
    }
  });

  return requestPromise;
}
