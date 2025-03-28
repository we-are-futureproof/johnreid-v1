/**
 * Census and area data services
 * Extracted from supabase.ts during refactoring
 */

import { supabase } from '../supabase';
import { 
  QualifiedCensusTract,
  DifficultDevelopmentArea, 
  LowModIncome,
  MapBounds 
} from '../types/dbTypes';

/**
 * Fetches Qualified Census Tracts from the database
 * @param bounds Optional map bounds to filter the census tracts
 * @returns Promise with qualified census tracts
 */
export async function fetchQualifiedCensusTracts(
  bounds?: MapBounds
): Promise<QualifiedCensusTract[]> {
  try {
    // Use the RPC function if available (for future implementation)
    if (bounds) {
      try {
        const { data, error } = await supabase.rpc('get_qualified_census_tracts_data', {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west
        });
        
        if (!error && data && data.length > 0) {
          return data;
        }
        // If RPC fails, fall back to regular query below
      } catch (rpcError) {
        console.warn('RPC not available, falling back to regular query');
      }
    }
    
    // Regular query as fallback
    let query = supabase
      .from('qualified_census_tracts')
      .select('*');
    
    // Add bounds filtering if bounds are provided
    // Note: This is a simplified approach. For production, we'd use PostGIS
    // spatial queries to filter by geometry intersection with the bounds.
    if (bounds) {
      // For simplicity, we're returning all tracts for now
      // In a real implementation, this would use a spatial query
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching qualified census tracts:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn('No qualified census tracts found');
      return [];
    }
    
    // Process data for the frontend
    return data.map(tract => ({
      ...tract,
      properties: {
        name: tract.name,
        geoid: tract.geoid,
        state: tract.state,
        county: tract.county,
        tract: tract.tract
      }
    }));
  } catch (error) {
    console.error('Error in fetchQualifiedCensusTracts:', error);
    return [];
  }
}

/**
 * Fetches Difficult Development Areas from the database
 * @param bounds Optional map bounds to filter the areas
 * @returns Promise with difficult development areas
 */
export async function fetchDifficultDevelopmentAreas(
  bounds?: MapBounds
): Promise<DifficultDevelopmentArea[]> {
  try {
    // Use the RPC function if available (for future implementation)
    if (bounds) {
      try {
        const { data, error } = await supabase.rpc('get_difficult_development_areas_data', {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west
        });
        
        if (!error && data && data.length > 0) {
          return data;
        }
        // If RPC fails, fall back to regular query below
      } catch (rpcError) {
        console.warn('RPC not available, falling back to regular query');
      }
    }
    
    // Regular query as fallback
    let query = supabase
      .from('difficult_development_areas')
      .select('*');
    
    // Add bounds filtering if bounds are provided
    // Note: This is a simplified approach. For production, we'd use PostGIS
    // spatial queries to filter by geometry intersection with the bounds.
    if (bounds) {
      // For simplicity, we're returning all areas for now
      // In a real implementation, this would use a spatial query
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching difficult development areas:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn('No difficult development areas found');
      return [];
    }
    
    // Process data for the frontend
    return data.map(area => ({
      ...area,
      state: area.dda_name.split(',')[1]?.trim() || '',
      county: area.dda_name.split(',')[0]?.trim() || '',
      properties: {
        name: area.dda_name,
        code: area.dda_code,
        type: area.dda_type
      }
    }));
  } catch (error) {
    console.error('Error in fetchDifficultDevelopmentAreas:', error);
    return [];
  }
}

/**
 * Fetches Low to Moderate Income areas from the database
 * @returns Promise with low-mod income areas
 */
export async function fetchLowModIncomeAreas(): Promise<LowModIncome[]> {
  try {
    const { data, error } = await supabase
      .from('low_mod_income')
      .select('*');
    
    if (error) {
      console.error('Error fetching low-mod income areas:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn('No low-mod income areas found');
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error in fetchLowModIncomeAreas:', error);
    return [];
  }
}
