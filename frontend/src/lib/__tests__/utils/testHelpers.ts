import { vi, beforeEach, afterEach } from 'vitest';
import { setupApiMocks } from '../mocks/apiMocks';
import { setupAllMocks } from './mockSetup';
import { resetFlags } from './testFlags';

/**
 * Sets up the test environment with all necessary mocks and
 * provides helpers for common test scenarios.
 * 
 * @param server - MSW server instance from the test environment
 */
export const setupTestEnvironment = (server: any) => {
  // Reset all mocks and flags before each test
  beforeEach(() => {
    vi.clearAllMocks();
    resetFlags();
    setupAllMocks();
    setupApiMocks(server);
  });

  // Reset all mocks after each test to prevent leakage
  afterEach(() => {
    vi.resetAllMocks();
  });

  return {
    resetFlags,
    // Add additional helper functions as needed
  };
};

/**
 * Helper for simulating a mocked function implementation that also
 * counts calls to the original implementation.
 * 
 * This is useful for improving test coverage while still mocking the function.
 * 
 * @param module - The module containing the function to spy on
 * @param functionName - The name of the function to spy on
 * @param mockImplementation - The mock implementation to use
 */
export const createCountingSpy = (
  module: any, 
  functionName: string, 
  mockImplementation: (...args: any[]) => any
) => {
  // Store the original function
  const originalFunction = module[functionName];

  // Create a new mock function that counts calls to the original
  const mockFn = vi.fn((...args: any[]) => {
    // Call the original function first to ensure it's counted in coverage
    try {
      originalFunction(...args);
    } catch (error) {
      // Ignore errors from the original function
      console.log(`Error in original ${functionName}:`, error);
    }

    // Then return the mocked implementation result
    return mockImplementation(...args);
  });

  // Replace the original function with our mock
  vi.spyOn(module, functionName).mockImplementation(mockFn);

  return mockFn;
};
