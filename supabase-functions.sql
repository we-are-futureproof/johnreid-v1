-- SQL functions to access postgis schema tables

-- Function to get Qualified Census Tracts
CREATE OR REPLACE FUNCTION public.get_qualified_census_tracts_data()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
BEGIN
  -- Filter for Nashville area using state and county codes (Davidson County, TN)
  -- Focusing on just Davidson County to minimize data
  RETURN QUERY SELECT to_jsonb(qct.*) FROM postgis.qualified_census_tracts qct
  WHERE qct.state = '47' -- Tennessee state FIPS code
    AND qct.county = '037' -- Davidson County FIPS code
  LIMIT 50; -- Limit to 50 records for performance
END;
$$;

-- Function to get Difficult Development Areas
CREATE OR REPLACE FUNCTION public.get_difficult_development_areas_data()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
BEGIN
  -- The DDA table has a different structure
  -- Simply limiting results for Nashville area (TN)
  -- Using dda_name to find entries containing 'NASHVILLE' or 'TN'
  RETURN QUERY SELECT to_jsonb(dda.*) FROM postgis.difficult_development_areas dda
  WHERE dda.dda_name ILIKE '%NASHVILLE%' 
     OR dda.dda_name ILIKE '%TN%' 
     OR dda.dda_name ILIKE '%TENNESSEE%'
  LIMIT 30; -- Further limiting for performance
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
