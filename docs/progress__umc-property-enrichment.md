# UMC Property Enrichment Implementation Progress

This document tracks the implementation progress of the UMC Property Enrichment feature as outlined in the [feature requirements document](./feature__umc-property-enrichment.md).

## Recent Updates

### March 28, 2025: Map Component Refactoring
- [x] Completed extensive refactoring of the Map component code to improve maintainability
- [x] Extracted functionality into modular components:
  - [x] `MapLayers`: Handling QCT and DDA layer rendering
  - [x] `MapStyleToggle`: Managing satellite/street view toggle
  - [x] `MapHeader`: Containing navigation controls and loading indicators
  - [x] `PropertyMarkers`: Handling all marker rendering and interactions
- [x] Removed unused code and imports
- [x] Simplified the `MapContainer` component
- [x] Successfully tested the refactored components

This refactoring provides a cleaner foundation for completing the UMC Property Enrichment feature implementation and testing.

## Implementation Plan

### 1. Database Enhancements
- [x] Define SQL migration for adding `viable` and `smarty` columns to the `umc_locations` table
- [x] Update TypeScript interfaces to include new fields

### 2. Smarty API Integration
- [x] Create `smartyService.ts` for API interactions
- [x] Implement address validation function to get `smarty_key`
- [x] Implement property enrichment function using `smarty_key`
- [x] Add logic to evaluate property viability (≥ 4.5 acres / 200,000 sq ft)
- [x] Create function to update property in the database with enrichment results
- [x] Add debouncing mechanism to prevent repeated API calls

### 3. UI Updates
- [x] Update `MapContainer.tsx` to use new color coding:
  - [x] Blue: Active UMC locations (not evaluated)
  - [x] Red: Closed UMC locations (not evaluated)
  - [x] Green: Viable properties (4.5+ acres / 200,000+ sq ft)
  - [x] Gray: Non-viable properties (less than 4.5 acres)
- [x] Update click handlers for different property statuses
- [x] Update property interaction behavior:
  - [x] Active locations (blue): Enable Smarty API calls on click
  - [x] Closed locations (red): No API calls on click
  - [x] Viable locations (green): No additional API calls needed
  - [x] Non-viable locations (gray): No additional API calls needed

### 4. Data Fetching Updates
- [x] Update `fetchUMCLocations` in `supabase.ts` to include new fields
- [x] Add function to update property data with Smarty enrichment results

### 5. Security & API Integration
- [x] Implement secure server-side proxy for Smarty API in vite.config.ts
- [x] Remove browser-identifying headers to prevent API security errors
- [x] Add server-like headers to make requests appear server-originated
- [x] Ensure API credentials are never exposed in client-side code
- [x] Configure proxy to always include `match=enhanced` parameter for obtaining `smarty_key`
- [x] Test successful retrieval of `smarty_key` via secure proxy

### 6. Testing & Validation
- [x] Test address validation with sample UMC locations
- [ ] Test property enrichment data retrieval
- [ ] Validate lot size determination logic
- [ ] Test UI color coding and interaction behaviors
- [ ] Test data persistence (enriched properties should maintain status)

#### Testing Strategy

##### Property Selection for Testing
- Analyzed church metrics in the `details` JSON field using `attending_members` counts
- Statistical analysis shows: min=0, max=8,576, avg=97.5, median=39 members
- Selected test candidates across the distribution spectrum:

###### Small Churches (Likely < 4.5 acres)
- GCFA: 649811 - Bells United Methodist Church (Caldwell, OH) - 9 members
- GCFA: 193650 - Bethel UMC (Salisbury, MD) - 9 members
- GCFA: 926700 - Aberdeen: First United Methodist Church (Aberdeen, WA) - 9 members

###### Large Churches (Likely > 4.5 acres)
- GCFA: 456401 - Centenary United Methodist Church (New Bern, NC) - 887 members
- GCFA: 357178 - Cypress Lake - Ft Myers UMC (Ft Myers, FL) - 879 members
- GCFA: 203715 - Wesley Evans UMC (Evans, GA) - 877 members

##### Address Format Testing
- Identified properties with significant differences between `address` and `geocoded_address`
- Test candidates with potentially problematic addresses:
  - GCFA: 973778 - ABBEVILLE, BRIGGS UMC (address vs. geocoded: specific street vs. city only)
  - GCFA: 328201 - Aberdeen First UMC (address vs. geocoded: specific college location vs. city only)
  - GCFA: 545198 - Aberdeen North Highland UMC (specific street address vs. city only)

##### Implementation Verification
- Verify color-coding implementation (green: viable, gray: non-viable, blue: active/not evaluated, red: closed)
- Confirm status messages appear during enrichment process
- Test persistence of property states after page refresh

### 6. Database Schema Updates
- [x] Execute SQL statements to add `viable` and `smarty` columns
- [x] Add column comments documenting the purpose of each field

## Implementation Notes

### Smarty API Integration
- Created a comprehensive `smartyService.ts` with dedicated functions for address validation and property enrichment
- Implemented debouncing with a 5-second interval to prevent repeated API calls for the same property
- Used a request tracking mechanism to cache in-flight requests and avoid redundant API calls
- Added thorough error handling and logging throughout the service
- Set up viability evaluation based on both acres and square footage metrics

## Next Steps

1. ~~Execute the SQL statements to update the database schema~~ ✅ Done
2. Test the Smarty API integration with real UMC locations
3. Verify the color coding of properties based on viability
4. Monitor API usage and performance
5. Address any testing issues that arise
