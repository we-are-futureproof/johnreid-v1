-- SQL functions to access postgis schema tables

-- Function to get Qualified Census Tracts within map bounds
CREATE OR REPLACE FUNCTION public.get_qualified_census_tracts_data(
  north DOUBLE PRECISION DEFAULT NULL,
  south DOUBLE PRECISION DEFAULT NULL,
  east DOUBLE PRECISION DEFAULT NULL,
  west DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
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
    -- Use provided map bounds to filter the data
    -- ST_MakeEnvelope creates a bounding box from the coordinates
    -- Using spatial filtering to get QCTs that intersect with the current map view
    RETURN QUERY SELECT to_jsonb(qct.*) FROM postgis.qualified_census_tracts qct
    WHERE ST_Intersects(
      qct.geom,
      ST_MakeEnvelope(west, south, east, north, 4326) -- 4326 is the SRID for WGS84
    )
    LIMIT 150; -- Increased limit but still capped for performance
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
SECURITY DEFINER -- This runs with the privileges of the function creator
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
    -- Use provided map bounds to filter the data
    -- Using spatial filtering to get DDAs that intersect with the current map view
    RETURN QUERY SELECT to_jsonb(dda.*) FROM postgis.difficult_development_areas dda
    WHERE ST_Intersects(
      dda.geom,
      ST_MakeEnvelope(west, south, east, north, 4326) -- 4326 is the SRID for WGS84
    )
    LIMIT 150; -- Increased limit but still capped for performance
  END IF;
END;
$$;

-- Function to get Low-Mod Income Areas
CREATE OR REPLACE FUNCTION public.get_low_mod_income_data()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
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
GRANT EXECUTE ON FUNCTION public.get_qualified_census_tracts_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_difficult_development_areas_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_low_mod_income_data() TO service_role;

-- Optional: Grant execute permissions to the anon role if needed
GRANT EXECUTE ON FUNCTION public.get_qualified_census_tracts_data() TO anon;
GRANT EXECUTE ON FUNCTION public.get_difficult_development_areas_data() TO anon;
GRANT EXECUTE ON FUNCTION public.get_low_mod_income_data() TO anon;
