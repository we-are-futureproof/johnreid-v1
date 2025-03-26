-- Ensure geocoded addresses have corresponding coordinates
SELECT gcfa, name, latitude, longitude, geocoded_address 
FROM umc_locations
WHERE (geocoded_address IS NOT NULL AND (latitude IS NULL OR longitude IS NULL))
   OR ((latitude IS NOT NULL OR longitude IS NOT NULL) AND geocoded_address IS NULL)
