import { createClient } from '@supabase/supabase-js';

// These values should be replaced with your actual Supabase URL and anon key
// In a production environment, these should be stored in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anon key. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



// Types for our database tables based on DATABASE.md

// Type for geometry field
type Geometry = any;  // Placeholder for PostGIS geometry data type

export interface UMCLocation {
  gcfa: number;                // Unique identifier
  url: string;                 // URL to property details
  name: string;                // Name of the UMC location
  conference: string;          // Conference name
  district: string;            // District name
  city: string;                // City
  state: string;               // State
  zip?: string;                // ZIP/Postal code
  status: string;              // Status of the property
  address: string;             // Full address
  details: any;                // JSON with additional details
  // Additional fields needed for the map but not in the DB schema
  latitude?: number;           // For mapping
  longitude?: number;          // For mapping
}

export interface QualifiedCensusTract {
  id: number;                  // Primary key
  objectid: number;            // Object ID
  geoid: string;               // Geographic ID
  state: string;               // State
  county: string;              // County
  tract: string;               // Census tract
  name: string;                // Name of the tract
  geom: Geometry;              // PostGIS geometry
  // Additional fields for compatibility with existing code
  properties?: any;            // Additional properties
}

export interface DifficultDevelopmentArea {
  id: number;                  // Primary key
  objectid: number;            // Object ID
  zcta5: string;               // ZIP Code Tabulation Area
  dda_code: string;            // DDA code
  dda_type: string;            // DDA type
  dda_name: string;            // DDA name
  geom: Geometry;              // PostGIS geometry
  // Additional fields for compatibility with existing code
  state?: string;              // State
  county?: string;             // County
  properties?: any;            // Additional properties
}

export interface LowModIncome {
  id: number;                  // Primary key
  objectid: number;            // Object ID
  geoid: string;               // Geographic ID
  source: string;              // Data source
  geoname: string;             // Geographic name
  stusab: string;              // State/US abbreviation
  countyname: string;          // County name
  state: string;               // State
  county: string;              // County
  tract: string;               // Census tract
  blkgrp: string;              // Block group
  low: string;                 // Low income count
  lowmod: string;              // Low-moderate income count
  lmmi: string;                // Low-moderate-middle income count
  lowmoduniv: string;          // Low-moderate universe
  lowmod_pct: number;          // Low-moderate percentage
  uclow: string;               // Upper confidence limit low
  uclowmod: string;            // Upper confidence limit low-moderate
  uclowmod_p: number;          // Upper confidence limit low-moderate percentage
  moe_lowmod_pct: string;      // Margin of error for low-moderate percentage
  moe_uclowmod_pct: string;    // Margin of error for upper confidence limit
  geom: Geometry;              // PostGIS geometry
}

// Nashville-area church coordinates for testing
const NASHVILLE_CHURCHES = [
  { name: 'Belmont United Methodist Church', lat: 36.1352, lng: -86.7988 },
  { name: 'West End United Methodist Church', lat: 36.1492, lng: -86.8074 },
  { name: 'McKendree United Methodist Church', lat: 36.1640, lng: -86.7819 },
  { name: 'Edgehill United Methodist Church', lat: 36.1486, lng: -86.7892 },
  { name: 'East End United Methodist Church', lat: 36.1782, lng: -86.7551 },
  { name: 'Calvary United Methodist Church', lat: 36.1663, lng: -86.7742 },
  { name: 'Sixty-First Avenue United Methodist Church', lat: 36.1686, lng: -86.8466 },
  { name: 'Woodbine United Methodist Church', lat: 36.1248, lng: -86.7318 },
  { name: 'Glendale United Methodist Church', lat: 36.0996, lng: -86.8157 }
];

// Generate dummy locations around Nashville
function generateDummyLocations() {
  const nashvilleCenter = { lat: 36.1627, lng: -86.7816 };
  const locations = [];

  // Add the known Nashville churches
  for (const church of NASHVILLE_CHURCHES) {
    locations.push(church);
  }

  // Generate a few random locations around Nashville
  for (let i = 0; i < 10; i++) {
    // Random offset between -0.1 and 0.1 degrees (roughly 6-7 miles)
    const latOffset = (Math.random() - 0.5) * 0.2;
    const lngOffset = (Math.random() - 0.5) * 0.2;
    locations.push({
      name: `Nashville Area Church ${i+1}`,
      lat: nashvilleCenter.lat + latOffset,
      lng: nashvilleCenter.lng + lngOffset
    });
  }

  return locations;
}

// Note: We removed the geocoding and delay functions since we're now using
// only hardcoded data for simplicity and reliability

// Interface for map bounds parameters
export interface MapBounds {
  north: number; // Maximum latitude
  south: number; // Minimum latitude
  east: number;  // Maximum longitude
  west: number;  // Minimum longitude
}

// Utility functions for data fetching
export async function fetchUMCLocations(
  bounds?: MapBounds
): Promise<UMCLocation[]> {
  try {
    // Fetch UMC locations from database

    // Build the query with filters
    let query = supabase
      .from('umc_locations')
      .select('gcfa, url, name, conference, district, city, state, status, address, latitude, longitude, details')
      .not('latitude', 'is', null);

    // Apply map bounds filters if provided
    if (bounds) {
      // Filter locations within the visible map bounds
      query = query
        .gte('latitude', bounds.south)
        .lte('latitude', bounds.north)
        .gte('longitude', bounds.west)
        .lte('longitude', bounds.east);

      // Filter by map bounds
    }

    const { data, error } = await query;

    if (error) {
      // Fall back to dummy data if database query fails
      const fallbackLocations = createFallbackUMCLocations(bounds);
      return fallbackLocations;
    }

    // Get raw data from database result
    const rawData = data || [];

    // Convert raw database results to UMCLocation objects
    const filteredData: UMCLocation[] = rawData.map(location => {
      // Create a new UMCLocation object with all properties from the database result
      const umcLocation: UMCLocation = {
        gcfa: location.gcfa,
        url: location.url,
        name: location.name,
        conference: location.conference,
        district: location.district,
        city: location.city,
        state: location.state,
        status: location.status,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        details: location.details
      };

      return umcLocation;
    });

    // Retrieved UMC locations after filtering
    return filteredData;
  } catch (error) {
    // Handle unexpected error in fetchUMCLocations
    // Fall back to dummy data if an unexpected error occurs
    const fallbackLocations = createFallbackUMCLocations(bounds);
    return fallbackLocations;
  }
}

// Create fallback UMC locations using the dummy data
function createFallbackUMCLocations(bounds?: MapBounds): UMCLocation[] {
  const dummyLocations = generateDummyLocations();

  // Filter by bounds if provided
  const filteredLocations = bounds
    ? dummyLocations.filter(loc =>
        loc.lat >= bounds.south &&
        loc.lat <= bounds.north &&
        loc.lng >= bounds.west &&
        loc.lng <= bounds.east
      )
    : dummyLocations;

  // Convert the dummy locations to UMCLocation objects
  return filteredLocations.map((loc, index) => ({
    gcfa: 1000 + index,
    url: '',
    name: loc.name,
    conference: 'Tennessee Conference',
    district: 'Nashville District',
    city: 'Nashville',
    state: 'TN',
    status: 'Active',
    address: '123 Main St',
    details: {},
    latitude: loc.lat,
    longitude: loc.lng
  }));
}

export async function fetchQualifiedCensusTracts(bounds?: MapBounds): Promise<QualifiedCensusTract[]> {
  try {
    // Call the SQL function with map bounds parameters (once deployed to Supabase)
    const { data, error } = await supabase.rpc('get_qualified_census_tracts_data', bounds ? {
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west
    } : {});

    if (error) {
      console.error('Error fetching Qualified Census Tracts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchQualifiedCensusTracts:', error);
    return [];
  }
}

export async function fetchDifficultDevelopmentAreas(bounds?: MapBounds): Promise<DifficultDevelopmentArea[]> {
  try {
    // Call the SQL function with map bounds parameters (once deployed to Supabase)
    const { data, error } = await supabase.rpc('get_difficult_development_areas_data', bounds ? {
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west
    } : {});

    if (error) {
      console.error('Error fetching Difficult Development Areas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchDifficultDevelopmentAreas:', error);
    return [];
  }
}

export async function fetchLowModIncomeAreas(): Promise<LowModIncome[]> {
  try {
    // Use raw SQL to query from the postgis schema
    const { data, error } = await supabase
      .rpc('get_low_mod_income_data');

    if (error) {
      console.error('Error fetching Low-Mod Income Areas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in fetchLowModIncomeAreas:', error);
    return [];
  }
}
