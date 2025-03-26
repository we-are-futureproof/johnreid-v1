-- Get counts by processing state
SELECT 
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS geocoded,
  COUNT(*) FILTER (WHERE skip_geocoding = true) AS skipped,
  COUNT(*) FILTER (WHERE details->>'geocoding_failures' IS NOT NULL) AS failed_attempts,
  COUNT(*) FILTER (WHERE latitude IS NULL AND longitude IS NULL AND skip_geocoding = false) AS pending,
  COUNT(*) AS total
FROM umc_locations
