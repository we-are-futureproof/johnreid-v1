// @ts-ignore: Deno import will be available in the Supabase Edge Function runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Define the Smarty API base URL for property enrichment
const SMARTY_API_BASE_URL = 'https://us-enrichment.api.smarty.com'

// Get the Smarty API credentials from environment variables
// @ts-ignore: Deno namespace will be available in the Supabase Edge Function runtime
const SMARTY_AUTH_ID = Deno.env.get('SMARTY_AUTH_ID')
// @ts-ignore: Deno namespace will be available in the Supabase Edge Function runtime
const SMARTY_AUTH_TOKEN = Deno.env.get('SMARTY_AUTH_TOKEN')

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

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) {
    return corsResponse
  }

  // Get the request URL 
  const url = new URL(req.url)
  console.log('Original request URL:', url.toString())
  
  // Extract smarty_key from path
  // URL could be in various formats:
  // - /smarty-property-enrichment/lookup/{smarty_key}/property/principal
  // - /functions/v1/smarty-property-enrichment/lookup/{smarty_key}/property/principal
  const pathParts = url.pathname.split('/')
  
  // Find the index of 'lookup' in the path
  const lookupIndex = pathParts.findIndex(part => part === 'lookup')
  
  if (lookupIndex === -1 || lookupIndex + 1 >= pathParts.length) {
    return new Response(
      JSON.stringify({ error: 'Invalid URL format. Expected path to contain /lookup/{smarty_key}/property/principal' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
  
  const smartyKey = pathParts[lookupIndex + 1] // The part after 'lookup' is the smarty_key
  console.log('Extracted smarty_key:', smartyKey)

  try {
    // Check if we have the required credentials
    if (!SMARTY_AUTH_ID || !SMARTY_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Smarty API credentials not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Construct the correct Smarty API URL for property enrichment
    // Format: https://us-enrichment.api.smarty.com/lookup/{smarty_key}/property/principal
    const smartyURL = new URL(`${SMARTY_API_BASE_URL}/lookup/${smartyKey}/property/principal`)
    console.log('Constructed Smarty API URL:', smartyURL.toString())
    
    // Add authentication parameters
    smartyURL.searchParams.append('auth-id', SMARTY_AUTH_ID)
    smartyURL.searchParams.append('auth-token', SMARTY_AUTH_TOKEN)
    
    // Copy any additional query parameters
    url.searchParams.forEach((value, key) => {
      smartyURL.searchParams.append(key, value)
    })
    
    // Set up request headers to look like a server-side request
    const headers = new Headers()
    headers.set('User-Agent', 'Supabase Edge Function')
    headers.set('X-Requested-With', 'XMLHttpRequest')
    headers.set('Accept', 'application/json')

    // Make the request to the Smarty API
    const response = await fetch(smartyURL.toString(), {
      method: 'GET',
      headers,
    })

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Smarty API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Error from Smarty API', details: errorText }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      )
    }

    // Get the response data
    const data = await response.json()

    // Return the response
    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    // Log and return any errors
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
