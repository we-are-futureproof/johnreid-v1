// @ts-ignore: Deno import will be available in the Supabase Edge Function runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Airtable Configuration
// @ts-ignore: Deno namespace will be available in the Supabase Edge Function runtime
const AIRTABLE_TOKEN = Deno.env.get('AIRTABLE_TOKEN')
// @ts-ignore: Deno namespace will be available in the Supabase Edge Function runtime
const AIRTABLE_BASE_ID = Deno.env.get('AIRTABLE_BASE_ID')
const AIRTABLE_TABLE_ID = 'tblwYEtXtfEY4nQ3v'

// Create a Cors headers object for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle OPTIONS requests for CORS
function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }
  return null
}

// Helper function to format dates for Airtable
const formatDateForAirtable = (dateString: string | null): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toISOString();
};

// Interface for Supabase record structure
interface UmcLocation {
  gcfa: number;
  details?: any;
  latitude?: number;
  longitude?: number;
  geocoding_accuracy?: number;
  geocoded_at?: string;
  skip_geocoding?: boolean;
  viable?: boolean;
  smarty?: any;
  skip_reason?: string;
  geocoded_address?: string;
  geocoded_postal_code?: string;
  smarty_key?: string;
  url?: string;
  name?: string;
  conference?: string;
  district?: string;
  city?: string;
  state?: string;
  status?: string;
  address?: string;
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

// Main request handler
serve(async (req) => {
  console.log('Edge function triggered:', req.url);
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) {
    return corsResponse
  }

  try {
    // Check if we have the required credentials
    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      console.error('Missing Airtable credentials');
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
    console.log('Received webhook payload type:', payload.type, 'table:', payload.table);
    
    // Verify this is a table update event
    if (!payload.type || payload.type.toUpperCase() !== 'UPDATE' || !payload.table || payload.table.toLowerCase() !== 'umc_locations') {
      console.warn('Not a umc_locations update event:', payload.type, payload.table);
      return new Response(
        JSON.stringify({ message: 'Not a umc_locations update event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get the updated record
    const record = payload.record;
    
    // Verify record exists (it should for UPDATE operations)
    if (!record) {
      console.error('Record missing in webhook payload');
      return new Response(
        JSON.stringify({ message: 'Record is missing in the payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('Processing record with GCFA:', record.gcfa);
    
    // Verify GCFA exists as it's our primary key
    if (!record.gcfa) {
      console.error('GCFA field missing in record');
      return new Response(
        JSON.stringify({ message: 'GCFA field is missing in the updated record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Search if record already exists in Airtable using GCFA
    const findRecordUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula={gcfa}=${record.gcfa}`;
    console.log('Searching Airtable for record with GCFA:', record.gcfa);
    
    const findResponse = await fetch(findRecordUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Airtable search response status:', findResponse.status);
    
    const findResult = await findResponse.json();
    
    let airtableRecordId = null;
    if (findResult.records && findResult.records.length > 0) {
      airtableRecordId = findResult.records[0].id;
      console.log('Found existing Airtable record with ID:', airtableRecordId);
    } else {
      console.log('No existing record found, will create new one');
    }
    
    // Transform the record for Airtable
    const airtableData = transformRecord(record);
    
    let airtableResponse;
    
    if (airtableRecordId) {
      // Update existing record
      console.log(`Updating existing Airtable record with ID: ${airtableRecordId}`);
      const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${airtableRecordId}`;
      airtableResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...airtableData,
          typecast: true // Enable typecasting for single-select fields
        })
      });
    } else {
      // Create new record
      console.log('Creating new Airtable record');
      const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
      airtableResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [airtableData],
          typecast: true // Enable typecasting for single-select fields
        })
      });
    }
    
    console.log('Airtable operation response status:', airtableResponse.status);
    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('Airtable API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error from Airtable API', details: errorText }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: airtableResponse.status,
        }
      );
    }
    
    const airtableResult = await airtableResponse.json();
    console.log('Airtable operation successful');
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Record synced to Airtable successfully',
        operation: airtableRecordId ? 'update' : 'create',
        airtableResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    // Log the error for debugging
    console.error('Unhandled error in edge function:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Unhandled error in edge function', 
        error: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
