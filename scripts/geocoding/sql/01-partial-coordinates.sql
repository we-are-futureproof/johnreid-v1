-- Find records that were partially processed
-- This SQL should detect records with incomplete coordinate data
SELECT gcfa, name, address, latitude, longitude
FROM umc_locations
WHERE (latitude IS NOT NULL OR longitude IS NOT NULL)
  AND (latitude IS NULL OR longitude IS NULL)
