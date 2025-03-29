import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

// Mock window.location.origin
const originalLocation = window.location
Object.defineProperty(window, 'location', {
  value: {
    ...originalLocation,
    origin: 'http://localhost:5173'
  },
  writable: true
})

// Mock environment variables
// Using vi.mock to handle the readonly import.meta.env
import { vi } from 'vitest';

// Define our mock environment variables
const mockEnv = {
  VITE_SUPABASE_FUNCTIONS_URL: 'http://localhost:54321/functions/v1',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  VITE_SUPABASE_URL: 'http://localhost:54321',
  MODE: 'test'
};

// Mock the import.meta object
vi.stubGlobal('import', {
  meta: {
    env: mockEnv
  }
});

// Create MSW server for API mocking
export const server = setupServer(
  // Network connectivity check handlers
  http.head('*/api/smarty', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
  
  // Handle the google.com connectivity check
  http.get('https://www.google.com', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
  
  // Default handlers with 404 response - specific handlers will be added in individual test files
  http.get('*', () => {
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
  }),
  http.post('*', () => {
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
  })
)

// Start the MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test
afterEach(() => server.resetHandlers())

// Close the MSW server after all tests
afterAll(() => server.close())
