# UMC Property Enrichment: Next Steps

After successfully refactoring the Map component to improve maintainability and modularity, we now need to focus on completing the Smarty API integration for property enrichment. Let's break this down into manageable sub-tasks for our next session.

## Task Breakdown for Next Session

### 1. Testing Smarty API Integration (High Priority)
- Test address validation with the selected test properties
- Verify property enrichment data retrieval through our secure server-side proxy
- Validate the lot size determination logic (≥ 4.5 acres / 200,000 sq ft)
- Add proper error handling and user feedback

### 2. UI Implementation Verification
- Verify color-coding based on property status:
  - Blue: Active UMC locations (not evaluated)
  - Red: Closed UMC locations (not evaluated)
  - Green: Viable properties (4.5+ acres)
  - Gray: Non-viable properties (less than 4.5 acres)
- Test the UI interaction behaviors for different property types
- Ensure status messages appear during the enrichment process

### 3. Persistence Testing
- Verify that property viability status persists after page refresh
- Test that the database correctly stores the enrichment data
- Confirm that previously evaluated properties maintain their status

### 4. Performance & Error Handling
- Test debouncing to prevent repeated API calls
- Verify error handling for network issues and API failures
- Test performance with multiple properties

## Testing Properties

Let's use our pre-selected test properties from different size categories:

### Small Churches (Likely < 4.5 acres)
- GCFA: 649811 - Bells United Methodist Church (Caldwell, OH)
- GCFA: 193650 - Bethel UMC (Salisbury, MD)
- GCFA: 926700 - Aberdeen: First United Methodist Church (Aberdeen, WA)

### Large Churches (Likely > 4.5 acres)
- GCFA: 456401 - Centenary United Methodist Church (New Bern, NC)
- GCFA: 357178 - Cypress Lake - Ft Myers UMC (Ft Myers, FL)
- GCFA: 203715 - Wesley Evans UMC (Evans, GA)

## Prompt for Next Session

"Let's complete the Smarty API integration for UMC property enrichment. We've already refactored the Map component for better maintainability, and now we need to test and finalize the property viability feature.

First, let's test the address validation and property enrichment API calls with our selected test properties. We'll then verify the UI color-coding and interactions work correctly based on property status, and finally ensure that the enrichment data persists correctly in the database.

Can you help me implement a systematic testing approach to validate each aspect of this feature?"
