-- Add skip_geocoding and skip_reason fields to umc_locations table
ALTER TABLE umc_locations ADD COLUMN IF NOT EXISTS skip_geocoding BOOLEAN DEFAULT FALSE;
ALTER TABLE umc_locations ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Create an index on skip_geocoding to optimize queries that filter on this field
CREATE INDEX IF NOT EXISTS idx_umc_skip_geocoding ON umc_locations (skip_geocoding);

-- Comments explaining purpose
COMMENT ON COLUMN umc_locations.skip_geocoding IS 'Flag to indicate whether this record should be skipped during geocoding attempts';
COMMENT ON COLUMN umc_locations.skip_reason IS 'Explanation for why this record was marked to be skipped during geocoding';
