/**
 * Supabase client and database services
 * Main file refactored to improve maintainability and organization
 */

import { createClient } from '@supabase/supabase-js';

// Re-export all types and interfaces from our type modules
export * from './types/dbTypes';

// Re-export all services
export * from './services/locationService';
export * from './services/censusService';
export * from './services/cacheService';

// Re-export test data utilities
export * from './utils/testData';

// These values should be replaced with your actual Supabase URL and anon key
// In a production environment, these should be stored in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anon key. Please check your environment variables.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
