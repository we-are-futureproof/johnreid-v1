/**
 * Database type definitions for the UMC Property Mapping application
 * Extracted from supabase.ts during refactoring
 */

// Type for geometry field
export type Geometry = any;  // Placeholder for PostGIS geometry data type

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
  // Property enrichment fields
  viable?: boolean;            // Property viability based on lot size
  smarty_key?: string;         // Smarty Key from address validation for property enrichment
  smarty?: any;                // Complete Smarty API response
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

// Interface for map bounds parameters
export interface MapBounds {
  north: number; // Maximum latitude
  south: number; // Minimum latitude
  east: number;  // Maximum longitude
  west: number;  // Minimum longitude
}
