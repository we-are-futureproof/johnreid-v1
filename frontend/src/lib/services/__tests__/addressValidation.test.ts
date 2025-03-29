import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/setup';
import { validateAddress } from '../addressValidation';
import { sampleLocation, incompleteLocation } from '../../__tests__/fixtures/locationFixtures';

// Test API environment variables
vi.stubEnv('VITE_SUPABASE_FUNCTIONS_URL', 'https://test-project.supabase.co/functions/v1');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

describe('Address Validation Service', () => {
  // Default test setup
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('API Request Structure Tests', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    
    beforeEach(() => {
      // Use a spy that captures request details without preventing actual fetch
      fetchSpy = vi.spyOn(global, 'fetch') as unknown as MockInstance<(this: unknown, ...args: unknown[]) => unknown>;
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ([{
          delivery_line_1: '123 Main St',
          metadata: { smarty_key: 'test-smarty-key-123' }
        }])
      } as unknown as Response);
    });
    
    afterEach(() => {
      fetchSpy.mockRestore();
    });
    
    it('should include proper authorization headers in address validation requests', async () => {
      await validateAddress(sampleLocation);
      
      // Verify the fetch was called with correct URL and headers
      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      const url = callArgs[0] as string;
      const options = callArgs[1] as RequestInit;
      
      // Verify URL structure
      expect(url).toContain('/smarty-address-validation');
      expect(url).toContain('match=enhanced');
      
      // Verify headers include Authorization with bearer token
      expect(options.headers).toBeDefined();
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toContain('Bearer test-anon-key');
    });
    
    it('should correctly construct the URL with all required parameters', async () => {
      await validateAddress(sampleLocation);
      
      const callArgs = fetchSpy.mock.calls[0];
      const url = callArgs[0] as string;
      const urlObj = new URL(url);
      
      // Check all required parameters are present
      expect(urlObj.searchParams.get('street')).toBeTruthy();
      expect(urlObj.searchParams.get('city')).toBe(sampleLocation.city);
      expect(urlObj.searchParams.get('state')).toBe(sampleLocation.state);
      expect(urlObj.searchParams.get('candidates')).toBe('1');
      expect(urlObj.searchParams.get('match')).toBe('enhanced');
    });
  });
  
  describe('Response Transformation Tests', () => {
    
    beforeEach(() => {
      // Reset mocks between tests
      vi.resetAllMocks();
    });
    
    it('should properly extract and format smarty_key when not in metadata', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          // Response without metadata structure
          delivery_line_1: '123 Main St',
          smarty_key: 'test-key-without-metadata'
        }])
      } as unknown as Response);
      
      const result = await validateAddress(sampleLocation);
      
      // Verify the smarty_key was properly extracted and formatted
      expect(result).toBeDefined();
      expect(result?.metadata).toBeDefined();
      expect(result?.metadata?.smarty_key).toBe('test-key-without-metadata');
    });
    
    it('should preserve existing metadata when smarty_key is present', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          delivery_line_1: '123 Main St',
          metadata: {
            latitude: 123.456,
            smarty_key: 'test-key-in-metadata'
          }
        }])
      } as unknown as Response);
      
      const result = await validateAddress(sampleLocation);
      
      expect(result?.metadata?.latitude).toBe(123.456);
      expect(result?.metadata?.smarty_key).toBe('test-key-in-metadata');
    });
    
    it('should add smarty_key to existing metadata when missing', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          delivery_line_1: '123 Main St',
          smarty_key: 'outside-key',
          metadata: {
            latitude: 123.456
            // No smarty_key here
          }
        }])
      } as unknown as Response);
      
      const result = await validateAddress(sampleLocation);
      
      expect(result?.metadata?.latitude).toBe(123.456);
      expect(result?.metadata?.smarty_key).toBe('outside-key');
    });
  });
  
  describe('Edge Function Integration Tests', () => {
    // We'll use MSW to mock the edge function
    beforeEach(() => {
      // Reset mock server handlers
      server.resetHandlers();
      
      // Setup server mocks for address validation
      server.use(
        http.get('*/smarty-address-validation*', ({ request }) => {
          // Verify authentication header is present
          const authHeader = request.headers.get('Authorization');
          if (!authHeader || !authHeader.includes('Bearer')) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          
          // Check for required URL parameters
          const url = new URL(request.url);
          if (!url.searchParams.get('match') || url.searchParams.get('match') !== 'enhanced') {
            return HttpResponse.json({ error: 'Missing required parameter' }, { status: 400 });
          }
          
          // Return successful response
          return HttpResponse.json([{
            delivery_line_1: '123 Main St',
            metadata: { smarty_key: 'valid-key-from-edge' }
          }]);
        })
      );
    });
    
    it('should successfully call address validation edge function', async () => {
      const result = await validateAddress(sampleLocation);
      
      expect(result).toBeDefined();
      expect(result?.metadata?.smarty_key).toBe('valid-key-from-edge');
    });
    
    it('should handle 401 errors from edge functions', async () => {
      // Modify the mock to simulate 401 errors
      server.use(
        http.get('*/smarty-address-validation*', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );
      
      // Should return null when API call fails
      const result = await validateAddress(sampleLocation);
      expect(result).toBeNull();
    });
    
    it('should handle 400 bad request errors', async () => {
      // Modify the mock to simulate 400 errors
      server.use(
        http.get('*/smarty-address-validation*', () => {
          return HttpResponse.json({ error: 'Bad Request' }, { status: 400 });
        })
      );
      
      // Should return null when API call fails
      const result = await validateAddress(sampleLocation);
      expect(result).toBeNull();
    });
  });
  
  describe('Input Validation Tests', () => {
    it('should return null for incomplete location data', async () => {
      const result = await validateAddress(incompleteLocation);
      expect(result).toBeNull();
    });
    
    it('should handle null or undefined inputs', async () => {
      // @ts-ignore - Testing invalid input
      const result = await validateAddress(null);
      expect(result).toBeNull();
      
      // @ts-ignore - Testing invalid input
      const result2 = await validateAddress(undefined);  
      expect(result2).toBeNull();
    });
  });
});
