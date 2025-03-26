import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
