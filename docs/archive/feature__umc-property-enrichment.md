# UMC Property Enrichment Feature

## Overview
This document outlines the requirements for enhancing the UMC (United Methodist Church) property mapping application with a new property enrichment feature. The enhancement will allow users to identify UMC properties with parcel lot sizes of 4.5 acres or more by integrating with the Smarty API.

## Business Objectives
- Enable users to identify UMC properties with sufficient land area (4.5+ acres) for potential development or repurposing
- Streamline the property assessment process through automated data enrichment
- Provide visual differentiation between viable and non-viable properties based on lot size

## User Stories
1. As a user, I want to see at a glance which UMC properties have sufficient land area so I can focus my attention on viable properties.
2. As a user, I want to retrieve detailed parcel information for active UMC locations directly from the map interface.
3. As a user, I want the system to visually differentiate between properties based on their viability status.
4. As a user, I want the system to remember which properties have been evaluated so I don't have to request the same information repeatedly.

## Technical Requirements

### Database Enhancements
1. Add two new columns to the `umc_locations` table:
   - `viable`: Boolean field (default NULL)
     - TRUE: Property has 4.5+ acres (200,000+ sq ft)
     - FALSE: Property has less than 4.5 acres
     - NULL: Property not yet evaluated
   - `smarty`: JSON field (default NULL)
     - Stores the complete response from the Smarty API

### API Integration
1. Implement integration with Smarty API, requiring two sequential API calls:
   - First call: Address validation to obtain `smarty_key`
   - Second call: Property data enrichment using the obtained `smarty_key`

2. API Authentication:
   - Use environment variables for authentication credentials:
     - `VITE_SMARTY_AUTH_ID`
     - `VITE_SMARTY_AUTH_TOKEN`

> _A note on Secret keys VITE_SMARTY_AUTH_ID and VITE_SMARTY_AUTH_TOKEN_
>
> Secret keys must be kept secret (hence the name). This means they should not be embededded or exposed in HTML or Javascript of public-facing web applications or untrusted desktop and mobile applications. Use secret keys only in code executing in a trusted or controlled environment that connects directly to the various Smarty APIs. A secret key is not limited to any particular hostname like embedded keys are. Secret keys consist of pair of values—an ID to identify your account along with a corresponding token which is like a password. While the ID value is safe to disclose over insecure or plaintext channels (such as emails to our customer service team), the token portion must remain secure and private at all times. WARNING: Disclosing, publishing, or broadcasting of secret key pair values is a direct violation of the Terms of Service and may be grounds for immediate termination of account privileges without prior notice or warning.
>
> This means the keys MUST remain on the server and be used for server-side calls to the Smarty API, either in the Vite application or in Supabase edge functions.  The keys MAY NOT be used to make calls to the Smarty API from client-side code (!)

### Implementation Notes

1. **Server-Side Proxy**: A secure proxy has been implemented in `vite.config.ts` that handles API requests to Smarty without exposing credentials to the client.
   - The proxy forwards requests from client-side endpoints to Smarty API endpoints
   - API credentials are added server-side to the requests
   - The `match=enhanced` parameter is ensured for all address validation requests to obtain the required `smarty_key`

2. **Header Modification**: The proxy modifies request headers to prevent Smarty API security restrictions:
   - Removes browser-identifying headers (Origin, Referer)
   - Adds server-like headers (User-Agent, X-Requested-With, Accept)
   - This prevents the "Secret key in browser request" error that would occur with direct browser requests

3. **Client-Side Implementation**: Client code makes requests to local proxy endpoints:
   - Address validation: `/api/smarty/street-address`
   - Property enrichment: `/api/smarty/lookup/{smarty_key}/property/principal`


### User Interface Updates
1. Update map visualization with new color coding:
   - Blue: Active UMC locations (not evaluated)
   - Red: Closed UMC locations (not evaluated)
   - Green: Viable properties (4.5+ acres / 200,000+ sq ft)
   - Gray: Non-viable properties (less than 4.5 acres)

2. Update interaction behavior:
   - Active locations (blue): Enable Smarty API calls on click
   - Closed locations (red): No API calls on click
   - Viable locations (green): No additional API calls needed
   - Non-viable locations (gray): No additional API calls needed

### Data Processing Logic
1. When a user clicks on an active (blue) UMC location:
   - Extract address components (street, city, state)
   - Make first API call to retrieve `smarty_key`
   - Make second API call using `smarty_key` to get property details
   - Store complete response in the `smarty` field
   - Extract and evaluate lot size:
     - If `lot_sqft` >= 200,000 OR `acres` >= 4.5, set `viable` to TRUE
     - Otherwise, set `viable` to FALSE
   - Update the map display to reflect the new status

## Technical Implementation Details

### Smarty API Integration

#### First API Call (Address Validation)
**Endpoint**: `https://us-street.api.smarty.com/street-address`

**Parameters**:
- `auth-id`: `$VITE_SMARTY_AUTH_ID`
- `auth-token`: `$VITE_SMARTY_AUTH_TOKEN`
- `street`: Extracted from UMC location data
- `city`: Extracted from UMC location data
- `state`: Extracted from UMC location data
- `candidates`: 1
- `match`: enhanced

**Response Processing**:
- Extract `smarty_key` from response

#### Second API Call (Property Enrichment)
**Endpoint**: `https://us-enrichment.api.smarty.com/lookup/{smarty_key}/property/principal`

**Parameters**:
- `auth-id`: `$VITE_SMARTY_AUTH_ID`
- `auth-token`: `$VITE_SMARTY_AUTH_TOKEN`

**Response Processing**:
- Store complete response in `smarty` field
- Extract `lot_sqft` and/or `acres` values
- Calculate viability:
  - `viable` = TRUE if `lot_sqft` >= 200,000 OR `acres` >= 4.5
  - `viable` = FALSE otherwise

### Database Update Operations
1. Create migration for adding new columns to `umc_locations` table
2. Update database access functions to include new fields in queries
3. Implement update logic to save API response and viability status

### UI Implementation
1. Update map rendering logic to use new color coding based on status and viability
2. Update click handler for UMC locations to implement the appropriate behavior based on status
3. Ensure UI refreshes to display updated status after API calls complete

## Error Handling
1. Implement appropriate error handling for API calls:
   - Network errors
   - Authentication failures
   - Missing or invalid address data
   - Missing property information
2. Display appropriate error messages to users when API calls fail
3. Maintain existing state of map when errors occur

## Performance Considerations
1. Implement basic blocking or caching to avoid repeated API calls for the same property like debouncing the calls for 5000ms
2. Optimize database queries to handle the new fields efficiently

## Security Considerations
1. Ensure API keys are properly secured in environment variables
2. Implement proper error handling to avoid exposing sensitive information
3. Validate and sanitize data before storage in database

## Implementation Timeline
To be determined by the Windsurf AI development team.

## Acceptance Criteria
1. Users can visually identify viable properties (4.5+ acres) on the map
2. Clicking on active UMC locations retrieves and displays property information
3. System correctly calculates and stores viability status
4. Map correctly updates to reflect viability status
5. Previously evaluated properties maintain their status without requiring re-evaluation