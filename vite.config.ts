import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Server configuration for both dev and preview modes
  server: {
    host: true, // Listen on all addresses
    port: Number(process.env.PORT) || 5173,
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
})
