-- This will create a simulated integrity issue with a large enough result for the report
WITH test_data AS (
  SELECT 1 as id, 'Test Issue 1' as description, 'HIGH' as severity UNION ALL
  SELECT 2 as id, 'Test Issue 2' as description, 'MEDIUM' as severity UNION ALL
  SELECT 3 as id, 'Test Issue 3' as description, 'LOW' as severity
)
SELECT * FROM test_data
