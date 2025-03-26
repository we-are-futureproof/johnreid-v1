-- Find records that were partially processed
SELECT * FROM umc_locations
WHERE (latitude IS NOT NULL OR longitude IS NOT NULL)
  AND (latitude IS NULL OR longitude IS NULL);

-- Check for records with geocoding data but missing coordinates
SELECT * FROM umc_locations
WHERE details->>'geocoding_data' IS NOT NULL 
  AND (latitude IS NULL OR longitude IS NULL);
