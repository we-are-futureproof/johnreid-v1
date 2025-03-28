// @ts-ignore: Deno import will be available in the Supabase Edge Function runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Define the Smarty API base URL
const SMARTY_API_URL = 'https://us-street.api.smarty.com/street-address'

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

  try {
    // Extract query parameters from the request
    const searchParams = url.searchParams
    
    // Check if the request has the required address parameters
    if (!searchParams.has('street') || !searchParams.has('city') || !searchParams.has('state')) {
      return new Response(
        JSON.stringify({ error: 'Missing required address parameters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

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

    // Create a new URL for the Smarty API request
    const smartyURL = new URL(SMARTY_API_URL)
    
    // Add all query parameters from the original request
    searchParams.forEach((value, key) => {
      smartyURL.searchParams.append(key, value)
    })
    
    // Ensure the match parameter is set to 'enhanced' to get the smarty_key
    if (!smartyURL.searchParams.has('match')) {
      smartyURL.searchParams.append('match', 'enhanced')
    }
    
    // Add the authentication parameters
    smartyURL.searchParams.append('auth-id', SMARTY_AUTH_ID)
    smartyURL.searchParams.append('auth-token', SMARTY_AUTH_TOKEN)
    
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
