-- Add smarty_key field to umc_locations table
ALTER TABLE public.umc_locations
ADD COLUMN smarty_key TEXT DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.umc_locations.smarty_key IS 'Smarty Key received from the address validation API call to be used for property enrichment';

-- Add index on smarty_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_umc_locations_smarty_key ON public.umc_locations(smarty_key);
