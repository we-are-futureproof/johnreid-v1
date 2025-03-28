import { http, HttpResponse } from 'msw';
import { apiErrorFlag, emptyResponseFlag } from '../utils/testFlags';
import { validationResponse } from '../fixtures/addressFixtures';
import { enrichmentResponse } from '../fixtures/propertyFixtures';

/**
 * MSW handlers for intercepting Smarty API requests
 * 
 * These handlers provide consistent responses for tests and respond
 * based on the test flags to simulate different scenarios.
 */
export const createSmartyApiHandlers = () => [
  // Google connectivity test handler
  http.get('https://www.google.com/', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  
  // HEAD request for API connectivity check - match exactly what code is using
  http.head('/api/smarty', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  
  // HEAD request for any URL as fallback
  http.head('*', () => {
    console.log(`[MSW] Intercepted HEAD request`);
    return new HttpResponse(null, { status: 200 });
  }),
  
  // Catch all Supabase endpoint URLs with smarty-address-validation
  http.get('*smarty-address-validation*', ({ request }) => {
    console.log(`[MSW] Intercepted address validation request: ${request.url}`);
    
    // Check if API error flag is set
    if (apiErrorFlag.validateAddress) {
      console.log('[MSW] Simulating API error for address validation');
      return new HttpResponse('Simulated error', { status: 500 });
    }

    // Check if empty response flag is set
    if (emptyResponseFlag.validateAddress) {
      console.log('[MSW] Simulating empty response for address validation');
      return HttpResponse.json([]);
    }

    // Create a copy to ensure we don't modify the original fixture
    const response = JSON.parse(JSON.stringify(validationResponse));
    
    // Ensure the smarty_key is properly set in the metadata
    if (!response.metadata) {
      response.metadata = {};
    }
    
    // Make sure smarty_key is set in the expected location for the service
    response.metadata.smarty_key = 'test-smarty-key-123';
    
    console.log('[MSW] Returning successful address validation response');
    return HttpResponse.json([response]);
  }),

  // Catch all Supabase endpoint URLs with smarty-property-enrichment
  http.get('*smarty-property-enrichment*', ({ request }) => {
    console.log(`[MSW] Intercepted property enrichment request: ${request.url}`);
    
    // Reject invalid keys
    if (request.url.includes('invalid-key')) {
      console.log('[MSW] Rejecting invalid smarty_key');
      return new HttpResponse('Invalid key', { status: 404 });
    }
    
    // Check if API error flag is set
    if (apiErrorFlag.enrichProperty) {
      console.log('[MSW] Simulating API error for property enrichment');
      return new HttpResponse('Simulated error', { status: 500 });
    }

    // Check if empty response flag is set
    if (emptyResponseFlag.enrichProperty) {
      console.log('[MSW] Simulating empty response for property enrichment');
      return HttpResponse.json({});
    }

    // Create a deep copy to ensure we don't modify the original fixture
    const response = JSON.parse(JSON.stringify(enrichmentResponse));
    
    // Ensure the response has all the required fields for evaluatePropertyViability
    response.property_id = 'test-property-123';
    response.lot_size_acres = 0.689;
    response.lot_size_sqft = 30000;
    response.property_use_type = 'religious';
    
    console.log('[MSW] Returning successful property enrichment response');
    return HttpResponse.json(response);
  }),

  // Basic connectivity test handler
  http.get('*/smarty-api/test-basic-connectivity', () => {
    if (apiErrorFlag.connectivityTest) {
      return HttpResponse.error();
    }
    
    return HttpResponse.json({ 
      success: true, 
      message: 'Connection test successful' 
    });
  }),

  // API connectivity test handler
  http.get('*/smarty-api/test-api-connectivity', () => {
    if (apiErrorFlag.smartyApiTest) {
      return HttpResponse.error();
    }
    
    return HttpResponse.json({ 
      success: true, 
      message: 'API connectivity test successful' 
    });
  })
];

/**
 * Setup MSW API handlers for a specific test
 * 
 * @param server - MSW server instance from the test environment
 */
export const setupApiMocks = (server: any) => {
  // Add these handlers to the server
  server.use(...createSmartyApiHandlers());
};
