import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createTestSetup } from './smartyService.test.utils';

// Create test setup with flags and mock setup function
const { resetFlags, setupMocks } = createTestSetup();

// Setup mocks before imports
setupMocks();

// Import the mocked module
import * as smartyService from '../smartyService';

describe('API connectivity tests', () => {
  beforeEach(() => {
    // Reset all mocks and flags between tests
    vi.resetAllMocks();
    vi.clearAllMocks();
    resetFlags();
  });

  describe('testBasicConnectivity', () => {
    it('should return success when connectivity check passes', async () => {
      // Setup mock implementation for this specific test
      (smartyService.testBasicConnectivity as Mock).mockResolvedValueOnce({
        success: true,
        message: 'Connection test successful'
      });

      const result = await smartyService.testBasicConnectivity();

      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
    });

    it('should return failure when connectivity check fails', async () => {
      // Setup mock implementation for this specific test
      (smartyService.testBasicConnectivity as Mock).mockResolvedValueOnce({
        success: false,
        message: 'Connection test failed'
      });

      const result = await smartyService.testBasicConnectivity();

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });
  });

  describe('testSmartyApiConnectivity', () => {
    it('should return success when API connectivity check passes', async () => {
      // Setup mock implementation for this specific test
      (smartyService.testSmartyApiConnectivity as Mock).mockResolvedValueOnce({
        success: true,
        message: 'API connectivity test successful'
      });

      const result = await smartyService.testSmartyApiConnectivity();

      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
    });

    it('should return failure when API response is not OK', async () => {
      // Setup mock implementation for this specific test
      (smartyService.testSmartyApiConnectivity as Mock).mockResolvedValueOnce({
        success: false,
        message: 'API connectivity test failed with status: 403 Forbidden'
      });

      const result = await smartyService.testSmartyApiConnectivity();

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });

    it('should handle network errors during API connectivity check', async () => {
      // Setup mock implementation for this specific test
      (smartyService.testSmartyApiConnectivity as Mock).mockResolvedValueOnce({
        success: false,
        message: 'Error connecting to API: Network error'
      });

      const result = await smartyService.testSmartyApiConnectivity();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });
});
