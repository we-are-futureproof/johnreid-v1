import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get Smarty credentials from env variables
  const SMARTY_AUTH_ID = env.VITE_SMARTY_AUTH_ID;
  const SMARTY_AUTH_TOKEN = env.VITE_SMARTY_AUTH_TOKEN;
  
  return {
  plugins: [react()],
  // Server configuration for both dev and preview modes
  server: {
    host: true, // Listen on all addresses
    port: Number(process.env.PORT) || 5173,
    proxy: {
      // Proxy for Smarty street address validation API
      '/api/smarty/street-address': {
        target: 'https://us-street.api.smarty.com',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove the prefix from the path
          return path.replace(/^\/api\/smarty\/street-address/, '/street-address');
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error (street address):', err);
          });
          // Use proxyReq event to modify the outgoing request before it's sent
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying street address request:', req.method, req.url);
            
            // Log the original URL being proxied
            console.log('Original URL:', req.url);
          
            // Add authentication query parameters and ensure match=enhanced is included in the outgoing request
            const currentUrl = new URL(`http://example.com${proxyReq.path}`);
            
            // Check if match parameter is already in the URL, if not add it
            if (!currentUrl.searchParams.has('match')) {
              currentUrl.searchParams.append('match', 'enhanced');
            }
            
            // Add authentication credentials
            currentUrl.searchParams.append('auth-id', SMARTY_AUTH_ID);
            currentUrl.searchParams.append('auth-token', SMARTY_AUTH_TOKEN);
            
            // Update the proxy request path with all parameters
            proxyReq.path = currentUrl.pathname + currentUrl.search;
            
            // Remove browser-identifying headers to prevent "Secret key in browser request" errors
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            
            // Set headers to look like a server request instead of a browser
            proxyReq.setHeader('User-Agent', 'Node.js Proxy Server');
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
            proxyReq.setHeader('Accept', 'application/json');
            
            console.log('Modified proxy request path (masked):', 
                        proxyReq.path.replace(/auth-token=[^&]+/, 'auth-token=REDACTED'));
            });
        },
      },
      // Proxy for Smarty property enrichment API
      '/api/smarty/lookup': {
        target: 'https://us-enrichment.api.smarty.com',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove the prefix from the path
          return path.replace(/^\/api\/smarty\/lookup/, '/lookup');
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error (property enrichment):', err);
          });
          // Use proxyReq event to modify the outgoing request before it's sent
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying property enrichment request:', req.method, req.url);
            
            // Log the original URL being proxied
            console.log('Original URL:', req.url);
            
            // Add authentication query parameters and ensure match=enhanced is included in the outgoing request
            const currentUrl = new URL(`http://example.com${proxyReq.path}`);
            
            // Check if match parameter is already in the URL, if not add it
            if (!currentUrl.searchParams.has('match')) {
              currentUrl.searchParams.append('match', 'enhanced');
            }
            
            // Add authentication credentials
            currentUrl.searchParams.append('auth-id', SMARTY_AUTH_ID);
            currentUrl.searchParams.append('auth-token', SMARTY_AUTH_TOKEN);
            
            // Update the proxy request path with all parameters
            proxyReq.path = currentUrl.pathname + currentUrl.search;
          
            // Remove browser-identifying headers to prevent "Secret key in browser request" errors
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            
            // Set headers to look like a server request instead of a browser
            proxyReq.setHeader('User-Agent', 'Node.js Proxy Server');
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
            proxyReq.setHeader('Accept', 'application/json');
            
            console.log('Modified proxy request path (masked):', 
                        proxyReq.path.replace(/auth-token=[^&]+/, 'auth-token=REDACTED'));
            });
        },
      },
      // Generic endpoint for testing purposes
      '/api/smarty': {
        target: 'https://us-street.api.smarty.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smarty$/, '/'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error (base):', err);
          });
        },
      },
    },
  },
  // Preview is used in production to serve built files
  preview: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    // Allow Render.com hostname
    allowedHosts: ['johnreid-umc-v1.onrender.com', '.onrender.com']
  },
  build: {
    // Increase the warning limit to avoid unnecessary warnings
    chunkSizeWarningLimit: 1200, // 1200 kB
    
    rollupOptions: {
      output: {
        // Improved code splitting for better performance and smaller chunks
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-core';
          }
          
          // Map libraries (these are large and should be separate)
          if (id.includes('node_modules/mapbox-gl/') ||
              id.includes('node_modules/@mapbox/')) {
            return 'mapbox';
          }
          
          if (id.includes('node_modules/react-map-gl/')) {
            return 'react-map-gl';
          }
          
          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          // UI components and styling
          if (id.includes('node_modules/@headlessui/') ||
              id.includes('node_modules/@heroicons/')) {
            return 'ui-components';
          }
          
          if (id.includes('node_modules/tailwindcss/')) {
            return 'tailwind';
          }
          
          // Other common dependencies
          if (id.includes('node_modules/')) {
            // Group remaining smaller dependencies
            return 'vendor';
          }
        }
      }
    }
  }
  };
})
