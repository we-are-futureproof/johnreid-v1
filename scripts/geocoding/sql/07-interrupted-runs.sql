-- Find records that may be from an interrupted run
SELECT gcfa, name, 
       details->>'last_geocoding_attempt' AS last_attempt,
       details->>'geocoding_timestamp' AS completion_time
FROM umc_locations
WHERE details->>'last_geocoding_attempt' IS NOT NULL 
  AND details->>'geocoding_timestamp' IS NULL;
