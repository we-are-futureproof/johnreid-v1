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
    chunkSizeWarningLimit: 1000, // 1000 kB
    
    rollupOptions: {
      output: {
        // Manual code splitting for better performance
        manualChunks: {
          vendor: ['react', 'react-dom', 'mapbox-gl', 'react-map-gl'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@headlessui/react', '@heroicons/react', 'tailwindcss']  
        }
      }
    }
  }
})
