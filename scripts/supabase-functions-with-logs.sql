-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_qualified_census_tracts_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.get_difficult_development_areas_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.get_low_mod_income_data();

-- Function to get Qualified Census Tracts within map bounds
CREATE OR REPLACE FUNCTION public.get_qualified_census_tracts_data(
  north DOUBLE PRECISION DEFAULT NULL,
  south DOUBLE PRECISION DEFAULT NULL,
  east DOUBLE PRECISION DEFAULT NULL,
  west DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  result_count INTEGER;
  query_method TEXT;
  bbox TEXT;
BEGIN
  -- Record start time for performance tracking
  start_time := clock_timestamp();
  
  -- Log request parameters
  bbox := format('N:%s, S:%s, E:%s, W:%s', north, south, east, west);
  RAISE LOG 'QCT data requested with bounds: %', bbox;
  
  -- If no bounds provided, use default Nashville area
  IF north IS NULL OR south IS NULL OR east IS NULL OR west IS NULL THEN
    -- Default to Nashville area
    RAISE LOG 'QCT data using default Nashville area (state=47, county=037)';
    
    FOR result IN
      SELECT to_jsonb(qct.*) FROM postgis.qualified_census_tracts qct
      WHERE qct.state = '47' -- Tennessee state FIPS code
        AND qct.county = '037' -- Davidson County FIPS code
      LIMIT 50
    LOOP
      RETURN NEXT result;
      result_count := coalesce(result_count, 0) + 1;
    END LOOP;
    
    RAISE LOG 'QCT data for Nashville default: % rows returned in % ms', 
      result_count, 
      extract(epoch from clock_timestamp() - start_time) * 1000;
    
    RETURN;
  ELSE
    -- Try PostGIS spatial function first
    BEGIN
      RAISE LOG 'QCT data attempt using PostGIS ST_Intersects with bounding box';
      query_method := 'PostGIS';
      
      FOR result IN
        SELECT to_jsonb(qct.*) FROM postgis.qualified_census_tracts qct
        WHERE ST_Intersects(
          qct.geom,
          ST_MakeEnvelope(west, south, east, north, 4326) -- 4326 is the SRID for WGS84
        )
        LIMIT 150
      LOOP
        RETURN NEXT result;
        result_count := coalesce(result_count, 0) + 1;
      END LOOP;
      
    EXCEPTION 
      WHEN undefined_function OR undefined_object OR others THEN
        -- Log the fallback to alternative method
        RAISE LOG 'QCT data PostGIS method failed, falling back to JSONB extraction';
        query_method := 'JSONB';
        result_count := 0;
        
        -- Fallback to JSONB extraction with LATERAL join to avoid set-returning functions in WHERE
        FOR result IN
          SELECT to_jsonb(qct.*) 
          FROM postgis.qualified_census_tracts qct
          CROSS JOIN LATERAL (
            SELECT 
              -- Extract the first coordinate as a scalar value
              (qct.geom->'coordinates'->0->0->0)::float8 AS lon,
              (qct.geom->'coordinates'->0->0->1)::float8 AS lat
          ) coords
          WHERE coords.lon BETWEEN west AND east
            AND coords.lat BETWEEN south AND north
          LIMIT 150
        LOOP
          RETURN NEXT result;
          result_count := coalesce(result_count, 0) + 1;
        END LOOP;
    END;
    
    -- Log results
    RAISE LOG 'QCT data (%): % rows returned in % ms for bounds %', 
      query_method,
      result_count, 
      extract(epoch from clock_timestamp() - start_time) * 1000,
      bbox;
      
    RETURN;
  END IF;
END;
$$;

-- Function to get Difficult Development Areas within map bounds
CREATE OR REPLACE FUNCTION public.get_difficult_development_areas_data(
  north DOUBLE PRECISION DEFAULT NULL,
  south DOUBLE PRECISION DEFAULT NULL,
  east DOUBLE PRECISION DEFAULT NULL,
  west DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  result_count INTEGER;
  query_method TEXT;
  bbox TEXT;
BEGIN
  -- Record start time for performance tracking
  start_time := clock_timestamp();
  
  -- Log request parameters
  bbox := format('N:%s, S:%s, E:%s, W:%s', north, south, east, west);
  RAISE LOG 'DDA data requested with bounds: %', bbox;
  
  -- If no bounds provided, use default Nashville area
  IF north IS NULL OR south IS NULL OR east IS NULL OR west IS NULL THEN
    -- Default to Nashville area
    RAISE LOG 'DDA data using default Nashville area (name filter: NASHVILLE/TN/TENNESSEE)';
    
    FOR result IN
      SELECT to_jsonb(dda.*) FROM postgis.difficult_development_areas dda
      WHERE dda.dda_name ILIKE '%NASHVILLE%' 
         OR dda.dda_name ILIKE '%TN%' 
         OR dda.dda_name ILIKE '%TENNESSEE%'
      LIMIT 30
    LOOP
      RETURN NEXT result;
      result_count := coalesce(result_count, 0) + 1;
    END LOOP;
    
    RAISE LOG 'DDA data for Nashville default: % rows returned in % ms', 
      result_count, 
      extract(epoch from clock_timestamp() - start_time) * 1000;
      
    RETURN;
  ELSE
    -- Try PostGIS spatial function first
    BEGIN
      RAISE LOG 'DDA data attempt using PostGIS ST_Intersects with bounding box';
      query_method := 'PostGIS';
      
      FOR result IN
        SELECT to_jsonb(dda.*) FROM postgis.difficult_development_areas dda
        WHERE ST_Intersects(
          dda.geom,
          ST_MakeEnvelope(west, south, east, north, 4326) -- 4326 is the SRID for WGS84
        )
        LIMIT 150
      LOOP
        RETURN NEXT result;
        result_count := coalesce(result_count, 0) + 1;
      END LOOP;
      
    EXCEPTION 
      WHEN undefined_function OR undefined_object OR others THEN
        -- Log the fallback to alternative method
        RAISE LOG 'DDA data PostGIS method failed, falling back to JSONB extraction';
        query_method := 'JSONB';
        result_count := 0;
        
        -- Fallback to JSONB extraction with LATERAL join to avoid set-returning functions in WHERE
        FOR result IN
          SELECT to_jsonb(dda.*) 
          FROM postgis.difficult_development_areas dda
          CROSS JOIN LATERAL (
            SELECT 
              -- Extract the first coordinate as a scalar value
              (dda.geom->'coordinates'->0->0->0)::float8 AS lon,
              (dda.geom->'coordinates'->0->0->1)::float8 AS lat
          ) coords
          WHERE coords.lon BETWEEN west AND east
            AND coords.lat BETWEEN south AND north
          LIMIT 150
        LOOP
          RETURN NEXT result;
          result_count := coalesce(result_count, 0) + 1;
        END LOOP;
    END;
    
    -- Log results
    RAISE LOG 'DDA data (%): % rows returned in % ms for bounds %', 
      query_method,
      result_count, 
      extract(epoch from clock_timestamp() - start_time) * 1000,
      bbox;
      
    RETURN;
  END IF;
END;
$$;

-- Function to get Low-Mod Income Areas (AMI data)
CREATE OR REPLACE FUNCTION public.get_low_mod_income_data()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  result_count INTEGER;
BEGIN
  -- Record start time for performance tracking
  start_time := clock_timestamp();
  
  -- Log request
  RAISE LOG 'AMI/Low-Mod Income data requested';
  
  -- Filter for Nashville area using state and county codes (Davidson County, TN)
  -- Focusing on just Davidson County to minimize data
  FOR result IN
    SELECT to_jsonb(lmi.*) FROM postgis.low_mod_income lmi
    WHERE lmi.state = '47' -- Tennessee state FIPS code
      AND lmi.county = '037' -- Davidson County FIPS code
    LIMIT 50
  LOOP
    RETURN NEXT result;
    result_count := coalesce(result_count, 0) + 1;
  END LOOP;
  
  -- Log results
  RAISE LOG 'AMI/Low-Mod Income data: % rows returned in % ms', 
    result_count, 
    extract(epoch from clock_timestamp() - start_time) * 1000;
    
  RETURN;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION public.get_qualified_census_tracts_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_difficult_development_areas_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_low_mod_income_data() TO service_role;

-- Optional: Grant execute permissions to the anon role if needed
GRANT EXECUTE ON FUNCTION public.get_qualified_census_tracts_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
GRANT EXECUTE ON FUNCTION public.get_difficult_development_areas_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
GRANT EXECUTE ON FUNCTION public.get_low_mod_income_data() TO anon;
