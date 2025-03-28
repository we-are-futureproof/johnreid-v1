# UMC Property Viability Testing - Progress Document

## Current Status

We've successfully implemented property viability checking using the Smarty API. The application can now determine if a UMC property meets the minimum viable size threshold of 4.5 acres (approximately 200,000 sq ft).

### March 28, 2025 Update

We've improved the acreage calculation logic in `PropertyMarkers.tsx` to better handle different data structures from the Smarty API. The application now:

1. Correctly prioritizes direct `acres` values when available in the data
2. Falls back to calculating acreage from `lot_sqft` values when needed
3. Properly handles both array and object structures in the Smarty API response
4. Displays accurate acreage values in property tooltips

This enhancement ensures more accurate property viability assessments and solves inconsistencies in acreage display.

## Property States

Properties now exist in one of four states:

1. **Closed Properties** (gray markers)
   - Properties marked as closed/inactive
   - No viability assessment needed
   - No API lookups should be triggered when clicked

2. **Active & Viable Properties** (green markers)
   - Active properties with lot size ≥ 4.5 acres
   - Viability already determined (viable = true)
   - No API lookups should be triggered when clicked

3. **Active & Non-Viable Properties** (red markers)
   - Active properties with lot size < 4.5 acres
   - Viability already determined (viable = false)
   - No API lookups should be triggered when clicked

4. **Active & Viability Unknown** (blue markers)
   - Active properties with undetermined viability (viable = null)
   - API lookups should be triggered when clicked
   - These are the only properties that should trigger Smarty API calls

## Testing Requirements

### Click Behavior Testing

| Property State | Expected Behavior | API Call | Database Update |
|----------------|-------------------|----------|----------------|
| Closed | Open Focus panel only | No | No |
| Active & Viable | Open Focus panel only | No | No |
| Active & Non-Viable | Open Focus panel only | No | No |
| Active & Viability Unknown | Open Focus panel AND conduct API lookup | Yes | Yes |

### Test Cases

1. **Closed Property Test**
   - Select a property with status = "closed"
   - Click on marker
   - Verify Focus panel opens
   - Verify no API call is made (check console)
   - Verify database is not updated

2. **Active & Viable Property Test**
   - Select a property with status = "active" and viable = true
   - Click on marker
   - Verify Focus panel opens
   - Verify no API call is made (check console)
   - Verify database is not updated

3. **Active & Non-Viable Property Test**
   - Select a property with status = "active" and viable = false
   - Click on marker
   - Verify Focus panel opens
   - Verify no API call is made (check console)
   - Verify database is not updated

4. **Active & Viability Unknown Property Test**
   - Select a property with status = "active" and viable = null
   - Click on marker
   - Verify Focus panel opens
   - Verify Smarty API call is made (check console)
   - Verify database is updated with new smarty_key, smarty data, and viable flag

## Implementation Notes

To properly implement this behavior, we need to:

1. Modify the `PropertyMarkers.tsx` click handler to only trigger smarty lookups for active properties with null viability.
2. Add appropriate logging to verify behavior.
3. Ensure the UI correctly reflects the property state (correct marker colors).

## Progress Tracking

- [x] Successfully implemented property viability checking via Smarty API
- [x] Updated marker colors to reflect property states
- [x] Updated property filters UI to show different states
- [x] Enhanced acreage calculation logic to properly handle various Smarty data structures
- [x] Fixed tooltip display to show accurate acreage information
- [ ] Modify click handler to only trigger API calls for appropriate properties
- [ ] Add comprehensive logging for verification
- [ ] Run all test cases and document results

## Next Steps

1. Update the `PropertyMarkers.tsx` click handler
2. Add console logging for verification
3. Execute test cases
4. Document results
5. Investigate geocoding accuracy issues for certain properties

## Recent Findings

### Acreage Calculation Improvements

During our testing, we identified and resolved several issues with acreage calculation:

1. **Data Structure Handling**: We improved how the application handles different Smarty API response structures. The data sometimes comes as an array of objects, and sometimes as a direct object, each with different nested structures for acreage information.

2. **Multiple Data Sources**: We now properly prioritize direct `acres` values over calculated values from square footage:
   - Some properties (like First Farragut UMC) have explicit acres values in `smartyData[0].attributes.acres`
   - Others (like Concord UMC) require calculation from `smartyData[0].attributes.lot_sqft`

3. **Deep Search Enhancement**: We optimized the deep search function to only run when necessary, preventing it from overriding more accurate values found in common locations.

### Potential Geocoding Issues

While testing property marker display, we observed that some properties may have inaccurate geocoding. For example, First Farragut UMC's marker appears to be offset from the actual church building location visible in satellite imagery. This suggests a need for further investigation into the geocoding process and potential data quality issues.
