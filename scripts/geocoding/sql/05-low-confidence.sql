-- Find addresses with low confidence scores
SELECT gcfa, name, address, city, state, latitude, longitude, 
       geocoded_address, details->'geocoding_data'->>'relevance' AS confidence_score
FROM umc_locations
WHERE details->'geocoding_data'->>'low_confidence' = 'true'
