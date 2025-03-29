import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/setup';
import { enrichProperty } from '../propertyEnrichment';
import { enrichmentResponse } from '../../__tests__/fixtures/propertyFixtures';

// Test API environment variables
vi.stubEnv('VITE_SUPABASE_FUNCTIONS_URL', 'https://test-project.supabase.co/functions/v1');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

describe('Property Enrichment Service', () => {
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
      fetchSpy = vi.spyOn(global, 'fetch') as unknown as MockInstance<(this: unknown, ...args: unknown[]) => unknown>;
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => enrichmentResponse
      } as unknown as Response);
    });
    
    afterEach(() => {
      fetchSpy.mockRestore();
    });
    
    it('should include proper authorization headers in property enrichment requests', async () => {
      await enrichProperty('test-smarty-key-123');
      
      // Verify the fetch was called with correct URL and headers
      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      const options = callArgs[1] as RequestInit;
      
      // Verify headers include Authorization with bearer token
      expect(options.headers).toBeDefined();
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toContain('Bearer test-anon-key');
    });
    
    it('should correctly construct the URL with the smarty_key path parameter', async () => {
      const smartyKey = 'test-smarty-key-123';
      await enrichProperty(smartyKey);
      
      // Check the URL from the fetch call
      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      const url = callArgs[0] as string;
      
      // Verify URL structure
      expect(url).toContain('/smarty-property-enrichment/lookup');
      expect(url).toContain(`/${smartyKey}/property/principal`);
    });
  });
  
  describe('Edge Function Integration Tests', () => {
    beforeEach(() => {
      // Reset mock server handlers
      server.resetHandlers();
      
      // Setup server mocks for property enrichment
      server.use(
        http.get('*/smarty-property-enrichment/lookup/*/property/principal', ({ request }) => {
          // Verify authentication header is present
          const authHeader = request.headers.get('Authorization');
          if (!authHeader || !authHeader.includes('Bearer')) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          
          // Extract the smarty_key from URL path
          const url = request.url.toString();
          const keyMatch = url.match(/lookup\/(.*?)\/property/);
          const smartyKey = keyMatch ? keyMatch[1] : null;
          
          if (smartyKey === 'invalid-key') {
            return HttpResponse.json({ error: 'Not found' }, { status: 404 });
          }
          
          // Return successful response for valid keys
          return HttpResponse.json(enrichmentResponse);
        })
      );
    });
    
    it('should successfully call property enrichment edge function', async () => {
      const result = await enrichProperty('valid-key');
      
      expect(result).toBeDefined();
      expect(result).toEqual(enrichmentResponse);
    });
    
    it('should handle 401 unauthorized errors', async () => {
      // Modify the mock to simulate 401 errors
      server.use(
        http.get('*/smarty-property-enrichment/lookup/*/property/principal', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );
      
      // Should return null when API call fails
      const result = await enrichProperty('test-key');
      expect(result).toBeNull();
    });
    
    it('should handle 404 not found errors', async () => {
      const result = await enrichProperty('invalid-key');
      expect(result).toBeNull();
    });
  });
  
  describe('Input Validation Tests', () => {
    it('should return null for empty smarty key', async () => {
      const result = await enrichProperty('');
      expect(result).toBeNull();
    });
    
    it('should handle null or undefined inputs', async () => {
      // @ts-ignore - Testing invalid input
      const result = await enrichProperty(null);
      expect(result).toBeNull();
      
      // @ts-ignore - Testing invalid input
      const result2 = await enrichProperty(undefined);  
      expect(result2).toBeNull();
    });
  });
  
  describe('Error Handling Tests', () => {
    it('should handle network errors gracefully', async () => {
      // Mock a network error
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      const result = await enrichProperty('test-key');
      expect(result).toBeNull();
    });
    
    it('should handle malformed JSON responses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      } as unknown as Response);
      
      const result = await enrichProperty('test-key');
      expect(result).toBeNull();
    });
  });
});
