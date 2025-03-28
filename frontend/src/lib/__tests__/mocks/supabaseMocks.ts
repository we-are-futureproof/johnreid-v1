import { vi } from 'vitest';
import { databaseErrorFlag } from '../utils/testFlags';

/**
 * Creates a mock implementation for the Supabase client
 * 
 * This provides a chainable API that mimics the actual Supabase client,
 * allowing tests to mock database operations with consistent behavior.
 */
export const createSupabaseMock = () => {
  // Create mock functions for the query chain - declare them first
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockIs = vi.fn();
  const mockNeq = vi.fn();
  const mockMatch = vi.fn();
  const mockOr = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSelect = vi.fn();
  
  // Now implement the functions
  mockEq.mockImplementation(() => {
    // Return error if the database error flag is set
    if (databaseErrorFlag.updateLocation) {
      return { data: null, error: new Error('Database error') };
    }
    
    // Otherwise return success
    return { data: [], error: null };
  });

  mockIn.mockReturnValue({ data: [], error: null });
  mockIs.mockReturnValue({ data: [], error: null });
  mockNeq.mockReturnValue({ data: [], error: null });
  mockMatch.mockReturnValue({ data: [], error: null });
  mockSelect.mockImplementation(() => ({
    eq: mockEq,
    in: mockIn,
    is: mockIs,
    neq: mockNeq,
    match: mockMatch,
    or: mockOr,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle
  }));
  mockOr.mockReturnValue({ select: mockSelect });
  mockOrder.mockReturnValue({ limit: mockLimit, select: mockSelect });
  mockLimit.mockReturnValue({ select: mockSelect });
  mockSingle.mockReturnValue({ data: null, error: null });
  mockMaybeSingle.mockReturnValue({ data: null, error: null });

  const mockUpdate = vi.fn().mockImplementation(() => ({
    eq: mockEq,
    match: mockMatch
  }));
  
  const mockInsert = vi.fn().mockImplementation(() => ({
    select: mockSelect
  }));

  const mockDelete = vi.fn().mockImplementation(() => ({
    eq: mockEq,
    match: mockMatch
  }));
  
  const mockFrom = vi.fn().mockImplementation(() => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete
  }));

  // Create the supabase client mock
  const supabaseMock = {
    from: mockFrom
  };

  return {
    supabaseMock,
    mockFunctions: {
      from: mockFrom,
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      is: mockIs,
      neq: mockNeq,
      match: mockMatch,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle
    }
  };
};

/**
 * Setup Supabase mock for use with vi.mock
 * 
 * This can be used to override the ../supabase import in tests.
 */
export const setupSupabaseMock = () => {
  const { supabaseMock } = createSupabaseMock();
  
  // Create a mock for the supabase module
  vi.mock('../../supabase', () => {
    return {
      supabase: supabaseMock
    };
  });

  return supabaseMock;
};
