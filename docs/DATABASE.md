# DATABASE STRUCTURE

The application uses the following tables in Supabase:

- **UMC Locations** (`public.umc_locations`): Contains information about United Methodist Church properties, including property details, addresses, and geographic coordinates (when available)
- **Qualified Census Tracts** (`postgis.qualified_census_tracts`): Census tracts designated by HUD where 50% or more of households have incomes below 60% of the Area Median Gross Income
- **Difficult Development Areas** (`postgis.difficult_development_areas`): Areas with high construction, land, and utility costs relative to area median income
- **Low-Mod Income Areas** (`postgis.low_mod_income`): Areas with low to moderate income data from HUD

## Database Access

The application accesses these tables through SQL functions that provide filtered data with the following considerations:

- Spatial filtering using PostGIS to limit results to the Nashville area
- Performance optimizations to prevent timeout errors
- Security settings to allow appropriate access to the data

## UMC Locations

The `umc_locations` table includes the following key fields:

- `gcfa`: Unique identifier for the UMC property (primary key)
- `name`: Name of the UMC location
- `address`, `city`, `state`: Address components used for geocoding
- `latitude`, `longitude`: Geographic coordinates (populated by the geocoding process)
- `geocoding_accuracy`: Numeric score indicating confidence level of the geocoding result
- `geocoded_at`: Timestamp when geocoding was performed
- `geocoded_address`: The formatted address returned by the geocoding service
- `geocoded_postal_code`: Postal code from the geocoding result
- `details`: JSON field containing church membership and financial information, including:
  - `attending_members`: Number of attending members
  - `professing_members`: Number of professing members
  - `sunday_school`: Sunday school attendance
  - `mission_participation`: Mission participation metric
  - `mission_giving`: Mission giving amount
  - `spending`: Church spending amount
  - `income`: Church income amount
- `skip_geocoding`: Boolean flag to mark locations that should be skipped in future geocoding runs
- `skip_reason`: JSON field indicating why a location was skipped, including:
  - `reason`: Type of skip reason (e.g., "incomplete_address")
  - `missing_fields`: Array of missing fields that led to skipping
  - `provided_data`: Original data that was insufficient
  - `timestamp`: When the location was marked to be skipped
- `conference`: The UMC conference the location belongs to
- `district`: The district within the conference
- `status`: Current status of the church/property (e.g., "closed", "active")
- `url`: URL to the church data page on umdata.org

# DATABASE DICTIONARY

| Field       | Definition |
|-------------|------------|
| **CDBGUOGID** | The CDBG Unit of Government Identification Code. This is a HUD assigned identifier to each grantee. The first two characters of the CDBGUOGID is the Federal Information Processing Standards (FIPS) numeric state code; the last 4 characters of the CDBGUOGID is the HUD Place Code. |
| **CDBGNAME** | The name of the CDBG formula program jurisdiction that covers this area. |
| **CDBGTYPE** | Metropolitan Cities are "51" (principal city) and "52" (other city). Urban Counties are "66", and States are "22". |
| **STUSAB** | The alpha Federal Information Processing Standards (FIPS) state abbreviation. |
| **LOGRECNO** | This is the state abbreviation and the Logical Record Number for the area in Census Bureau Summary File 3. This field may be used to link the split block group to all Census Bureau Summary File 3 data files. |
| **STATE** | The numeric Federal Information Process Standards (FIPS) state code. |
| **COUNTY** | The numeric Federal Information Processing Standards (FIPS) county code. |
| **COUNTYNAME** | The name of the county. |
| **COUSUB** | The numeric Federal Information Processing Standards (FIPS) county subdivision code. |
| **COUSUBNAME** | The name of the county subdivision. |
| **PLACE** | The Federal Information Processing Standards (FIPS) numeric city/place code. |
| **PLACENAME** | The name of the place. |
| **TRACT** | The numeric code for the census tract. In other publications or reports, the code sometimes appears as a 2 digit decimal XXXX.XX. |
| **BLKGRP** | The block group code. |
| **LOWMOD** | The count of Low Mod Persons. Synonym for PMOD. This is the revised count of low/mod persons. |
| **LOWMODUNIV** | Persons with the potential for being deemed Low Mod. Use as the denominator for MOD, LOW, and VLOW %'s. |
| **LOWMODPCT** | The percentage of persons who are of low/moderate income; calculated by LOWMOD/LOWMODUNIV times 100. This is the revised lowmod percentage. |
| **POP100** | The 100% count of population for the area from the 2000 census. |
| **HU100** | The 100% count of housing units for the area from the 2000 census. |
| **FAMUNIV** | The estimate of persons in family households. |
| **FAMMOD** | Number of family households below the moderate-income threshold for the area. |
| **FAMLOW** | Number of family households below the low-income threshold for the area. |
| **FAMVLOW** | Number of family households below the very low-income threshold for the area. |
| **NFAMUNIV** | The estimate of persons in non-family households. |
| **NFAMMOD** | Number of non-family households below the moderate-income threshold for the area. |
| **NFAMLOW** | Number of non-family households below the low-income threshold for the area. |
| **NFAMVLOW** | Number of non-family households below the very low-income threshold for the area. |
| **HHUNIV** | The total estimate of persons in households. |
| **HHMOD** | The number moderate-income households; calculated by FAMMOD + NFAMMOD. |
| **HHLOW** | The number low-income households; calculated by FAMLOW + NFAMLOW. |
| **HHVLOW** | The number very low-income households; calculated by FAMVLOW + NFAMVLOW. |
| **FAMPMOD** | Persons in family households below the moderate-income threshold for the area. |
| **FAMPLOW** | Persons in family households below the low-income threshold for the area. |
| **FAMPVLOW** | Persons in family households below the very low-income threshold for the area. |
| **NFAMPMOD** | Persons in non-family households below the moderate-income threshold for the area. |
| **NFAMPLOW** | Persons in non-family households below the low-income threshold for the area. |
| **NFAMPVLOW** | Persons in non-family households below the very low-income threshold for the area. |
| **PMOD** | The total number of persons below the moderate-income threshold. Synonym for LOWMOD; calculated by FAMPMOD + NFAMPMOD. |
| **PLOW** | The total number of persons below the low-income threshold; calculated by FAMPLOW + NFAMPLOW. |
| **PVLOW** | The total number of persons below the very low-income threshold; calculated by FAMPVLOW + NFAMPLOW. |
| **HHTOT** | The total estimate of family and non-family households. |



# DATABASE TYPES

// Database Schema TypeScript Types
// Generated from database schema images

// Table: difficult_development_areas
interface DifficultDevelopmentArea {
  id: number;                  // int4
  objectid: number;            // int4
  zcta5: string;               // varchar, character varying
  dda_code: string;            // varchar, character varying
  dda_type: string;            // varchar, character varying
  dda_name: string;            // varchar, character varying
  geom: any;                   // geometry, USER-DEFINED
}

// Table: low_mod_income
interface LowModIncome {
  id: number;                  // int4
  objectid: number;            // int4
  geoid: string;               // varchar, character varying
  source: string;              // varchar, character varying
  geoname: string;             // varchar, character varying
  stusab: string;              // varchar, character varying
  countyname: string;          // varchar, character varying
  state: string;               // varchar, character varying
  county: string;              // varchar, character varying
  tract: string;               // varchar, character varying
  blkgrp: string;              // varchar, character varying
  low: string;                 // varchar, character varying
  lowmod: string;              // varchar, character varying
  lmmi: string;                // varchar, character varying
  lowmoduniv: string;          // varchar, character varying
  lowmod_pct: number;          // float8, double precision
  uclow: string;               // varchar, character varying
  uclowmod: string;            // varchar, character varying
  uclowmod_p: number;          // float8, double precision
  moe_lowmod_pct: string;      // varchar, character varying
  moe_uclowmod_pct: string;    // varchar, character varying
  geom: any;                   // geometry, USER-DEFINED
}

// Table: qualified_census_tracts
interface QualifiedCensusTract {
  id: number;                  // int4
  objectid: number;            // int4
  geoid: string;               // varchar, character varying
  state: string;               // varchar, character varying
  county: string;              // varchar, character varying
  tract: string;               // varchar, character varying
  name: string;                // varchar, character varying
  geom: any;                   // geometry, USER-DEFINED
}

// Table: umc_locations
interface UmcLocation {
  gcfa: number;                // int8, bigint (primary key)
  url: string;                 // text
  name: string;                // text
  conference: string;          // text
  district: string;            // text
  city: string;                // text
  state: string;               // text
  status: string;              // text
  address: string;             // text
  latitude: number;            // float8, double precision
  longitude: number;           // float8, double precision
  details: {                   // json
    geocoding_data?: {
      source: string;
      timestamp: string;
      low_confidence: boolean;
      relevance_score: number;
      original_query: string;
      address_components?: any;
    };
    [key: string]: any;        // Other properties
  };
  skip_geocoding: boolean;     // boolean
  skip_reason: string;         // text
}

// Type for geometry field - could be extended with specific geometry types
type Geometry = any;  // Placeholder for geometry data type


# DATA KNOWLEDGE

Low and Moderate Income Data Set Frequently Asked Questions
Question: What do all the column headers mean?

Answer: All of the column headers are explained in the data element dictionary.

Question: Why are there duplicate block groups?

Answer: The census tract/block group combinations are often duplicated and this occurs when a block group splits any type of a boundary defined by the Census Bureau. Some of those boundaries include places, county subdivisions, voting districts and council districts. When you come across a set of identical tract/block groups that are within the boundaries you want, you should add the values (except one) to obtain the total for that census tract/block group. The one variable you cannot add is the low/mod percentage (LOWMODPCT). This must be calculated by dividing the LOWMOD by LOWMODUNIV.

Low/Mod data has been summarized at the block group level within each grantee's jurisdiction.

Question: Can I link the low/mod data with other Census data?

Answer: Yes! The low/mod data includes the LOGRECNO, which is the key field used to link the geography to all Census SF3 tables.

Question: Why is the LOWMODUNIV sometimes greater than POP100?

Answer: The POP100 represents the 100% population count for that geographic area. This value is taken from the Census Bureau's SF1 tables, which is the information derived from the Census "short form." But because income data is not on the SF1 tables, we use the SF3 tables, or the info derived from the Census "long form." (The POP100 data field is put on the low/mod data tables for information and reference only.) Because the long form went to, on average, 1 in 6 households, the population count on the SF3 tables is estimated, and as a result, the population counts for the same piece of geography is very often different in the Census Bureau's SF1 and SF3 tables. Additional information on this can be found on the Census Bureau's website.

Question: Why is the LOWMODUNIV sometimes significantly lower than POP100?

Answer: CPD uses the Census Bureau's definition of persons eligible, which removes persons in group housing such as college students, jails and nursing homes. There are some block groups in which a significant portion, and sometimes all, of the population is within group housing. For example, if a block group has a 100% population count (POP100) of 2,200 persons, and 1,500 of those persons are in group housing, the LOWMODUNIV would be 700.

Question: Why does the total of the LOW and VLOW values sometimes add up to more than the MOD total?

Answer: There are 6 different sets of data elements which provide counts at the moderate, the low, and the very-low income levels. These are FAM (number of family households), NFAM (number of non-family households), HH (number of households), FAMP (number of persons in family households), NFAMP (number of persons in non-family households), and P (persons).
Each of these sets of data are cumulative. For example, PVLOW contains the count of all persons below the 30% income threshold; PLOW contains the count of all persons below the 50% income level; and PMOD contains the count of all persons below the 80% income level. Therefore, if you add PMOD+PLOW+PVLOW, you would double count the persons who are low income, and triple count the persons who are very low income.

Question: When does the LOWMOD data change?

Answer:  There are two types of updates. The first change is an annual update which re-associates every one of the split block groups (almost 400,000 nationally!) to the CDBG grantees based on their participation each fiscal year. This update does not change the low/mod values.

The other type of change occurs infrequently. The values of the low/mod data are recalculated only when income values change. These are the reported income and income limits and changes must reflect the same point in time (The low/mod data is changing for FY07).

Question: Can I get LOWMOD data at the block level?

Answer: The low/mod data is calculated at the split block group level, specifically at the Census SF3 SUMLEV 090 level. The low/mod data cannot be generated at the block level because income data is not available at the block level.



## UMC Locations Geocoding Report

| Status    | Count | Percentage |
|-----------|-------|------------|
| Active    | 20666 | 48.59%     |
| Closed    | 20797 | 48.89%     |
| Processed | 41463 | 97.48%     |
| Skipped   | 1072  | 2.52%      |
| Pending   | 0     | 0.00%      |
| **Total** | 42535 | 100.00%    |