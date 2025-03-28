# UMC Property Viability Testing Strategy

## Overview

This document outlines our testing strategy for the UMC property viability assessment feature. The application will evaluate United Methodist Church (UMC) properties to determine if they meet the minimum viable size threshold of 4.5 acres (approximately 200,000 sq ft).

## Test Data Selection Strategy

Based on our database analysis, we should select test properties that represent a diverse range of characteristics to ensure comprehensive testing of the viability assessment feature.

### Church Size Categories

We've analyzed the attendance data and determined the following statistics for active UMC locations:
- Minimum attendance: 0
- Maximum attendance: 8576
- Average attendance: ~97.5
- Median attendance: 39

Based on these metrics, we'll select test properties from the following categories:

#### Small Churches (10th percentile attendance)
These locations likely have smaller properties that will fall below the 4.5-acre threshold. Examples include:
- Bells United Methodist Church (Caldwell, OH) - 9 members
- Bethel UMC (Salisbury, MD) - 9 members
- Aberdeen: First United Methodist Church (Aberdeen, WA) - 9 members

#### Medium Churches (around median attendance)
These locations may be near the threshold and provide good edge cases:
- ABBEVILLE, BRIGGS United Methodist Church - 25 members
- Abide - Ncs United Methodist Church - 25 members
- Aberdeen North Highland United Methodist Church - 70 members

#### Large Churches (99th percentile attendance)
These locations likely have larger properties that will exceed the threshold:
- Centenary United Methodist Church (New Bern, NC) - 887 members
- Cypress Lake - Ft Myers United Methodist Church (Ft Myers, FL) - 879 members
- Grace (Lee's Summit) United Methodist Church (Lee's Summit, MO) - 898 members

### Address Quality Testing

To test the address validation component, we'll select properties where the original address and geocoded address differ significantly, indicating potential issues with address quality:

| Church Name | Original Address | Geocoded Address |
|-------------|------------------|------------------|
| ABBEVILLE, BRIGGS United Methodist Church | 13528 Community Rd Abbeville LA 70510-0306 | Abbeville, Louisiana 70510, United States |
| Aberdeen First United Methodist Church | 100 College PL Aberdeen MS 39730 | Aberdeen, Mississippi, United States |
| Aberdeen North Highland United Methodist Church | 620 15th Ave NE Aberdeen SD 57401 | Aberdeen, South Dakota 57401, United States |

## Test Scenarios

### 1. Address Validation

| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Valid Address | Click on a location with a complete, accurate address | API call succeeds, returns valid `smarty_key` |
| Incomplete Address | Click on a location with partial address information | API returns appropriate error, UI shows error message |
| Malformed Address | Click on a location where geocoded address differs from original | Test both addresses to verify handling of malformed inputs |

### 2. Property Size Assessment

| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Large Property | Click on a church with high attendance (likely >4.5 acres) | Property assessed as viable, marker turns green |
| Borderline Property | Test properties around the 4.5-acre threshold | Accurate assessment based on actual size |
| Small Property | Click on a church with low attendance (likely <4.5 acres) | Property assessed as non-viable, marker turns gray |

### 3. UI Feedback

| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Status Messages | Process properties of various sizes | Appropriate status messages appear during enrichment |
| Color Coding | Process viable and non-viable properties | Markers change color appropriately (green for viable, gray for non-viable) |
| Information Display | View property details after processing | Accurate property information displayed including acreage |

### 4. Error Handling

| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| API Timeout | Simulate slow API response | Appropriate timeout handling and user feedback |
| API Failure | Simulate API failure | Error message displayed, system remains stable |
| Invalid Response | Inject invalid property data | System handles unexpected data gracefully |

### 5. Persistence

| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| Data Retention | Process properties, then refresh page | Processed properties retain their viability status and color |
| Session Handling | Test across different sessions | Property status persists between sessions |

## Implementation Notes

1. The application should include detailed logging of API calls and responses to assist with debugging.
2. Error handling should provide meaningful feedback

## Smarty API Integration

### Server-Side Proxy Implementation

The Smarty API is designed with security measures that prevent direct calls from browsers. To address this limitation, we've implemented a server-side proxy using Vite's built-in proxy feature.

#### How the Proxy Works

1. **Configuration**: The proxy is configured in `vite.config.ts` with three key endpoints:
   - `/api/smarty/street-address` → Routes to the Smarty address validation API
   - `/api/smarty/lookup` → Routes to the Smarty property enrichment API
   - `/api/smarty` → General test endpoint for checking connectivity

2. **Client-Side Implementation**: All client-side code in `smartyService.ts` now sends requests to these local proxy endpoints instead of directly to the Smarty API:
   - The `validateAddress` function uses `/api/smarty/street-address`
   - The `enrichProperty` function uses `/api/smarty/lookup/{smarty_key}/property/principal`

3. **Credentials Handling**: API credentials are now managed entirely server-side in the Vite proxy configuration. Client-side code no longer handles or has access to the credentials, significantly improving security. Additionally, we modify request headers to prevent the "Secret key in browser request" error.

4. **Essential Parameters**: The proxy configuration ensures that the `match=enhanced` parameter is always included in requests to the Smarty address validation API. This parameter is crucial for obtaining the `smarty_key` value that's necessary for subsequent property enrichment queries.

#### Testing the Proxy

Debug tools in the application include:

1. **Basic HTTP Test** - Tests basic network connectivity to confirm browser can make HTTP requests
2. **Smarty API Test** - Tests the Smarty API through our proxy
3. **Bethel UMC Test** - Tests a specific property enrichment flow

#### Advantages of this Approach

- **Enhanced Security**: API credentials are never exposed in client-side code or browser requests
- **Resolves Smarty API Limitations**: Addresses the "Secret key in browser request" error from the Smarty API by:
  - Removing browser-identifying headers (Origin, Referer)
  - Setting server-like headers (User-Agent, X-Requested-With)
  - Adding credentials server-side after the browser request is received
  - Always including the `match=enhanced` parameter to ensure `smarty_key` is returned
- **Simplified Client Code**: Removes credential management concerns from client-side code
- **Developer-Friendly**: Makes the application usable in development without complex setup
- **Future-Proof**: Provides a foundation for a production-ready server implementation
3. Consider implementing a batch processing option for testing multiple properties simultaneously.
4. Add instrumentation to track API call success rates and response times.

## Performance Considerations

- Monitor API call latency across different regions
- Implement caching for frequently accessed property data
- Consider rate limiting to prevent API quota exhaustion during testing

## Next Steps

1. Select specific test properties from each category
2. Create test scripts for automated testing where applicable
3. Establish a test environment that doesn't affect production data
4. Document specific API request/response patterns for reference