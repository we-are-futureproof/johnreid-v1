# Product Requirements Document (PRD)
# Supabase to Airtable Sync for UMC Locations

## Project Overview

This document outlines the requirements for implementing a synchronization system between the umc_locations table in Supabase and the "UMC Locations" table in Airtable. The system will use Supabase Edge Functions to perform real-time updates to Airtable whenever a record is updated in Supabase.

## Business Requirements

1. Whenever a record in the umc_locations table in Supabase is updated, the corresponding record in Airtable should be updated (or created if it doesn't exist)
2. The synchronization should be one-way: Supabase → Airtable
3. Records should be matched using the "gcfa" field as the primary key in both systems
4. All applicable fields should be mapped and synchronized between the two systems

## Technical Specifications

### Supabase Configuration

**Project URL:** https://supabase.com/dashboard/project/ylczspypbkblmwrpicek

**Table Structure (umc_locations):**
| Column Name | Data Type | Nullable | Notes |
|-------------|-----------|----------|-------|
| gcfa | bigint | NO | Primary key |
| details | json | YES | JSON object |
| latitude | double precision | YES | |
| longitude | double precision | YES | |
| geocoding_accuracy | double precision | YES | |
| geocoded_at | timestamp with time zone | YES | |
| skip_geocoding | boolean | YES | |
| viable | boolean | YES | |
| smarty | jsonb | YES | JSON object |
| skip_reason | text | YES | |
| geocoded_address | text | YES | |
| geocoded_postal_code | text | YES | |
| smarty_key | text | YES | |
| url | text | YES | |
| name | text | YES | |
| conference | text | YES | |
| district | text | YES | |
| city | text | YES | |
| state | text | YES | |
| status | text | YES | |
| address | text | YES | |

### Airtable Configuration

**Base ID:** appKiAZGKLCMpCnZP
**Table ID:** tblwYEtXtfEY4nQ3v
**Table Name:** UMC Locations
**View ID:** viwGeYA6kEklrGlh6

**Table Structure:**
| Field ID | Field Name | Type | Notes |
|----------|------------|------|-------|
| fldJfIKaNlwbTrNhc | gcfa | number | Primary Field, precision: 0 |
| fldBMRADOeICwJp4L | url | multilineText | |
| fldXn1pBcjzBu1abA | name | multilineText | |
| fldUxwE1bYH8l7CT7 | conference | singleSelect | Has predefined choices |
| flddPMPqJNdqpOGXS | district | singleSelect | Has predefined choices |
| fldCqJhzQQZAZgMGX | city | singleSelect | Has predefined choices |
| fldZUjnpLFDmjBr4V | state | singleSelect | Has predefined choices |
| fldLx2707ZCLr5Wc7 | status | singleSelect | Has predefined choices |
| fldQlooZ3jHx5H4Xk | address | multilineText | |
| fldXxQf7ppIExfGhu | quoted_details | multilineText | This should receive JSON.stringify of details |
| fldXxmaJmbWqE1z2i | latitude | number | precision: 6 |
| fld0JxJhYBD7d4M2A | longitude | number | precision: 6 |
| fldbCBqHOMwgPMhWp | geocoding_accuracy | number | precision: 6 |
| fld1cSLkw53Q5uWhm | geocoded_at | dateTime | Format: YYYY-MM-DD HH:mm |
| fldtJzunYueBR7czf | geocoded_address | multilineText | |
| fldlg248gXIhvhFb9 | geocoded_postal_code | number | precision: 0 |
| flduIdHLFHkQsFKRk | skip_geocoding | multilineText | Convert boolean to string |
| fldnQ07q3sxQ1g0jT | skip_reason | multilineText | |
| fldItFx9pYC2LgVMx | viable | checkbox | Convert boolean to checkbox |
| fldH6zitKgJuH8ZVV | quoted_smarty | multilineText | This should receive JSON.stringify of smarty |
| fldKItO847SPP7NK7 | smarty_key | number | precision: 0 |

### Field Mapping

| Supabase Field | Airtable Field ID | Airtable Field Name | Data Transformation |
|----------------|-------------------|---------------------|---------------------|
| gcfa | fldJfIKaNlwbTrNhc | gcfa | None |
| url | fldBMRADOeICwJp4L | url | None |
| name | fldXn1pBcjzBu1abA | name | None |
| conference | fldUxwE1bYH8l7CT7 | conference | None (must match SingleSelect options) |
| district | flddPMPqJNdqpOGXS | district | None (must match SingleSelect options) |
| city | fldCqJhzQQZAZgMGX | city | None (must match SingleSelect options) |
| state | fldZUjnpLFDmjBr4V | state | None (must match SingleSelect options) |
| status | fldLx2707ZCLr5Wc7 | status | None (must match SingleSelect options) |
| address | fldQlooZ3jHx5H4Xk | address | None |
| details | fldXxQf7ppIExfGhu | details | JSON.stringify(details) |
| latitude | fldXxmaJmbWqE1z2i | latitude | None |
| longitude | fld0JxJhYBD7d4M2A | longitude | None |
| geocoding_accuracy | fldbCBqHOMwgPMhWp | geocoding_accuracy | None |
| geocoded_at | fld1cSLkw53Q5uWhm | geocoded_at | Format as ISO string |
| geocoded_address | fldtJzunYueBR7czf | geocoded_address | None |
| geocoded_postal_code | fldlg248gXIhvhFb9 | geocoded_postal_code | Convert to String |
| skip_geocoding | flduIdHLFHkQsFKRk | skip_geocoding | Convert to string |
| skip_reason | fldnQ07q3sxQ1g0jT | skip_reason | None |
| viable | fldItFx9pYC2LgVMx | viable | Convert boolean to checkbox (true/false) |
| smarty | fldH6zitKgJuH8ZVV | smarty | JSON.stringify(smarty) |
| smarty_key | fldKItO847SPP7NK7 | smarty_key | Convert to Number |

## Technical Implementation

### Edge Function Implementation

1. Create a new Edge Function in Supabase named "umc-locations-sync"
2. The function will trigger only on UPDATE operations to the umc_locations table via webhook
3. The function will:
   - Extract the updated record from the webhook payload
   - Check if the record contains a valid "gcfa" field
   - Check if a record with the same "gcfa" exists in Airtable
   - If exists: update the record in Airtable
   - If not exists: create a new record in Airtable
   - Apply all the field mappings as defined above
   - Handle any type conversions as needed
   - Enable typecasting for single-select fields in Airtable
   - Include comprehensive logging for troubleshooting
   - Return success/error information

### Webhook Implementation

1. Create a Supabase webhook named `umc_locations_sync`
2. Configure the webhook with the following settings:

   **General:**
   - Name: `umc_locations_sync`
   
   **Conditions to fire webhook:**
   - Table: `umc_locations`
   - Events: Select only `Update` (Any update operation, of any column in the table)
   
   **Webhook configuration:**
   - Type of webhook: `Supabase Edge Functions`
   - Choose a Supabase edge function to run
   
   **Edge Function:**
   - Method: `POST`
   - Select which edge function to trigger: `umc-locations-sync`
   - Timeout: `5000 ms` (or between 1000ms to 10,000ms based on your needs)
   
   **HTTP Headers:**
   - Content-type: `application/json`
   - Authorization: `Bearer [REDACTED]` (use your project's anon key from Project Settings > API)

3. No database trigger is needed as the webhook approach is more flexible

## Error Handling

1. Comprehensive logging has been added to the edge function to capture detailed information at each step of the process:
   - Initial function triggering with URL information
   - Webhook payload examination
   - Record validation checks
   - All Airtable API interactions including requests and responses
   - Detailed error states with context
2. Return detailed error information in the function response including stack traces for debugging
3. No additional error notification or monitoring required at this time

## Troubleshooting Common Issues

### 401 Unauthorized Error

If you see a 401 Unauthorized error in the logs when the webhook tries to call the edge function, this indicates an authentication problem:

```
{ "event_message": "POST | 401 | https://[project-ref].supabase.co/functions/v1/umc-locations-sync", ... }
```

**Solution:** The webhook needs proper authentication to invoke the edge function. Make sure to:

1. Go to your webhook configuration in the Supabase dashboard
2. Under "HTTP Headers", add a new header:
   - Name: `Authorization`
   - Value: `Bearer [your-anon-key]`
3. The anon key can be found in the Supabase dashboard under Project Settings > API (use the anon public key, which starts with eyJ...)

This allows the webhook to properly authenticate to the edge function.

## Deployment

The solution will be deployed directly to production with no staging or development environment required.

## Testing Protocol

After implementation, the following tests should be performed:

1. Basic Update Test:
   - Update a field in an existing record in umc_locations
   - Verify the update is reflected in Airtable
   - Check logs to ensure the process was captured properly

2. JSON Field Update Test:
   - Update the "details" or "smarty" JSON field in umc_locations
   - Verify the stringified JSON appears correctly in Airtable

3. Boolean Conversion Test:
   - Update the "viable" field in umc_locations
   - Verify the checkbox status changes correctly in Airtable

4. Type Conversion Test:
   - Update fields that require type conversion (smarty_key, geocoded_postal_code)
   - Verify they appear correctly in Airtable

5. Single-Select Field Test:
   - Update fields that use single-select in Airtable (state, conference, district, city, status)
   - Verify the typecast parameter correctly handles these fields

6. New Record Test:
   - Update a record with a unique "gcfa" that doesn't exist in Airtable yet
   - Verify a new record is created in Airtable

7. Error Case Test:
   - Try updating a record with invalid data
   - Verify the error is logged appropriately with details

## Code Implementation

### Edge Function (index.ts)

```typescript
// supabase/functions/umc-locations-sync/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// CORS headers for options requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Airtable Configuration - using environment variables
const AIRTABLE_TOKEN = Deno.env.get('AIRTABLE_TOKEN')
const AIRTABLE_BASE_ID = Deno.env.get('AIRTABLE_BASE_ID')
const AIRTABLE_TABLE_ID = Deno.env.get('AIRTABLE_TABLE_ID') || 'tblwYEtXtfEY4nQ3v'

// Helper function to format dates for Airtable
const formatDateForAirtable = (dateString: string): string => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toISOString();
};

// Define UMC Location interface to match database structure
interface UmcLocation {
  gcfa: number;
  url?: string;
  name?: string;
  conference?: string;
  district?: string;
  city?: string;
  state?: string;
  status?: string;
  address?: string;
  details?: any;
  latitude?: number;
  longitude?: number;
  geocoding_accuracy?: number;
  geocoded_at?: string;
  geocoded_address?: string;
  geocoded_postal_code?: string;
  skip_geocoding?: boolean;
  skip_reason?: string;
  viable?: boolean;
  smarty?: any;
  smarty_key?: string;
}

// Interface for database webhook payload based on Supabase format
interface WebhookPayload {
  type: string;       // 'INSERT', 'UPDATE', or 'DELETE'
  table: string;      // Table name
  schema: string;     // Schema name (e.g., 'public')
  record: UmcLocation | null;   // The new/current record (null for DELETE)
  old_record: UmcLocation | null; // The previous record state (null for INSERT)
}

// Helper function to transform Supabase record to Airtable format
const transformRecord = (record: UmcLocation): any => {
  return {
    fields: {
      'fldJfIKaNlwbTrNhc': record.gcfa, // gcfa
      'fldBMRADOeICwJp4L': record.url, // url
      'fldXn1pBcjzBu1abA': record.name, // name
      'fldUxwE1bYH8l7CT7': record.conference, // conference
      'flddPMPqJNdqpOGXS': record.district, // district
      'fldCqJhzQQZAZgMGX': record.city, // city
      'fldZUjnpLFDmjBr4V': record.state, // state
      'fldLx2707ZCLr5Wc7': record.status, // status
      'fldQlooZ3jHx5H4Xk': record.address, // address
      'fldXxQf7ppIExfGhu': record.details ? JSON.stringify(record.details) : null, // details
      'fldXxmaJmbWqE1z2i': record.latitude, // latitude
      'fld0JxJhYBD7d4M2A': record.longitude, // longitude
      'fldbCBqHOMwgPMhWp': record.geocoding_accuracy, // geocoding_accuracy
      'fld1cSLkw53Q5uWhm': record.geocoded_at ? formatDateForAirtable(record.geocoded_at) : null, // geocoded_at
      'fldtJzunYueBR7czf': record.geocoded_address, // geocoded_address
      'fldlg248gXIhvhFb9': record.geocoded_postal_code ? String(record.geocoded_postal_code) : null, // geocoded_postal_code
      'flduIdHLFHkQsFKRk': record.skip_geocoding !== undefined ? String(record.skip_geocoding) : null, // skip_geocoding
      'fldnQ07q3sxQ1g0jT': record.skip_reason, // skip_reason
      'fldItFx9pYC2LgVMx': record.viable, // viable
      'fldH6zitKgJuH8ZVV': record.smarty ? JSON.stringify(record.smarty) : null, // smarty
      'fldKItO847SPP7NK7': record.smarty_key ? Number(record.smarty_key) : null, // smarty_key
    }
  };
};
      'skip_geocoding': record.skip_geocoding !== null ? String(record.skip_geocoding) : null,
      'skip_reason': record.skip_reason,
      'viable': record.viable,
      'quoted_smarty': record.smarty ? JSON.stringify(record.smarty) : null,
      'smarty_key': record.smarty_key
    }
  };
};

// CORS handler function
function handleCors(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }
  return null
}

// Main request handler
serve(async (req) => {
  console.log('🔔 Edge function triggered with URL:', req.url);
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) {
    console.log('✅ Handled CORS preflight request');
    return corsResponse
  }

  try {
    console.log('🔑 Checking required credentials');
    // Check if we have the required credentials
    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      console.error('❌ Missing Airtable credentials - AIRTABLE_TOKEN:', !!AIRTABLE_TOKEN, 'AIRTABLE_BASE_ID:', !!AIRTABLE_BASE_ID);
      return new Response(
        JSON.stringify({ error: 'Airtable API credentials not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Get the request payload
    const payload: WebhookPayload = await req.json();
    console.log('📦 Received webhook payload:', JSON.stringify(payload, null, 2));
    
    // Verify this is a table update event
    if (!payload.type || payload.type !== 'UPDATE' || !payload.table || payload.table !== 'umc_locations') {
      return new Response(
        JSON.stringify({ message: 'Not a umc_locations update event' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get the updated record
    const record = payload.record;
    
    // Verify GCFA exists as it's our primary key
    if (!record.gcfa) {
      return new Response(
        JSON.stringify({ message: 'GCFA field is missing in the updated record' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Format the data for Airtable
    // First, we need to find if record already exists in Airtable using GCFA
    const findRecordUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula={gcfa}="${record.gcfa}"`;
    
    const findResponse = await fetch(findRecordUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const findResult = await findResponse.json();
    
    let airtableRecordId = null;
    if (findResult.records && findResult.records.length > 0) {
      airtableRecordId = findResult.records[0].id;
    }
    
    // Transform the record for Airtable
    const airtableData = transformRecord(record);
    
    let airtableResponse;
    
    if (airtableRecordId) {
      // Update existing record
      airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${airtableRecordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(airtableData)
      });
    } else {
      // Create new record
      airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [airtableData]
        })
      });
    }
    
    const airtableResult = await airtableResponse.json();
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Record synced to Airtable successfully',
        airtableResult 
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    // Log the error for debugging
    console.error('Error syncing to Airtable:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error syncing record to Airtable', 
        error: error.message 
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

### Database Trigger (SQL)

```sql
-- Create a trigger function that calls the edge function
CREATE OR REPLACE FUNCTION trigger_umc_locations_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM http((
    'POST',
    'https://ylczspypbkblmwrpicek.supabase.co/functions/v1/umc-locations-sync', -- Supabase project URL
    ARRAY[('Authorization', 'Bearer your-anon-key')],  -- Replace with your Supabase anon key
    'application/json',
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    )::text
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the umc_locations table
DROP TRIGGER IF EXISTS umc_locations_sync_trigger ON "umc_locations";
CREATE TRIGGER umc_locations_sync_trigger
  AFTER UPDATE ON "umc_locations"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_umc_locations_sync();
```
