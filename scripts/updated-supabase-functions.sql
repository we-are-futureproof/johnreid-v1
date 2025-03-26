-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_qualified_census_tracts_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.get_difficult_development_areas_data(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

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
BEGIN
  -- If no bounds provided, use default Nashville area
  IF north IS NULL OR south IS NULL OR east IS NULL OR west IS NULL THEN
    -- Default to Nashville area
    RETURN QUERY SELECT to_jsonb(qct.*) FROM postgis.qualified_census_tracts qct
    WHERE qct.state = '47' -- Tennessee state FIPS code
      AND qct.county = '037' -- Davidson County FIPS code
    LIMIT 50;
  ELSE
    -- Try PostGIS spatial function first
    BEGIN
      RETURN QUERY 
      SELECT to_jsonb(qct.*) FROM postgis.qualified_census_tracts qct
      WHERE ST_Intersects(
        qct.geom,
        ST_MakeEnvelope(west, south, east, north, 4326) -- 4326 is the SRID for WGS84
      )
      LIMIT 150;
    EXCEPTION 
      WHEN undefined_function OR undefined_object OR others THEN
        -- Fallback to JSONB extraction with LATERAL join to avoid set-returning functions in WHERE
        RETURN QUERY 
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
        LIMIT 150;
    END;
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
BEGIN
  -- If no bounds provided, use default Nashville area
  IF north IS NULL OR south IS NULL OR east IS NULL OR west IS NULL THEN
    -- Default to Nashville area
    RETURN QUERY SELECT to_jsonb(dda.*) FROM postgis.difficult_development_areas dda
    WHERE dda.dda_name ILIKE '%NASHVILLE%' 
       OR dda.dda_name ILIKE '%TN%' 
       OR dda.dda_name ILIKE '%TENNESSEE%'
    LIMIT 30;
  ELSE
    -- Try PostGIS spatial function first
    BEGIN
      RETURN QUERY 
      SELECT to_jsonb(dda.*) FROM postgis.difficult_development_areas dda
      WHERE ST_Intersects(
        dda.geom,
        ST_MakeEnvelope(west, south, east, north, 4326) -- 4326 is the SRID for WGS84
      )
      LIMIT 150;
    EXCEPTION 
      WHEN undefined_function OR undefined_object OR others THEN
        -- Fallback to JSONB extraction with LATERAL join to avoid set-returning functions in WHERE
        RETURN QUERY 
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
        LIMIT 150;
    END;
  END IF;
END;
$$;

-- For consistency, updating the Low-Mod Income function as well
CREATE OR REPLACE FUNCTION public.get_low_mod_income_data()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Filter for Nashville area using state and county codes (Davidson County, TN)
  -- Focusing on just Davidson County to minimize data
  RETURN QUERY SELECT to_jsonb(lmi.*) FROM postgis.low_mod_income lmi
  WHERE lmi.state = '47' -- Tennessee state FIPS code
    AND lmi.county = '037' -- Davidson County FIPS code
  LIMIT 50; -- Limit to 50 records for performance
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
