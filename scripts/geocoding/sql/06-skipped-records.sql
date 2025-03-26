-- Check records marked to skip due to errors
SELECT gcfa, name, skip_reason, 
       details->>'geocoding_failures' AS failure_count
FROM umc_locations
WHERE skip_geocoding = true
ORDER BY (details->>'geocoding_failures')::integer DESC NULLS LAST;
