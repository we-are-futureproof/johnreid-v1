-- View most recently geocoded records
SELECT gcfa, name, latitude, longitude, geocoded_address, 
       details->>'geocoding_timestamp' AS geocoded_at
FROM umc_locations
WHERE details->>'geocoding_timestamp' IS NOT NULL
ORDER BY (details->>'geocoding_timestamp')::timestamp DESC
LIMIT 50;
