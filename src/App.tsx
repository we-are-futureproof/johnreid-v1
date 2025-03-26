import './index.css'
import { lazy, Suspense, useState } from 'react'
import SearchBox from './components/SearchBox'

// Dynamic import for Map component
const MapComponent = lazy(() => import('./components/Map'))

function App() {
  // We'll use loading state in the future when we implement data loading indicators
  // const [isLoading, setIsLoading] = useState(false)
  const isLoading = false
  
  // State for search location (will be passed to MapComponent)
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
  } | null>(null)

  return (
    <div className="app-container h-screen w-screen flex flex-col">
      <header className="bg-black text-white p-6 shadow-md relative">
        <div className="container px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold mr-6">UMC Property Analysis Map</h1>
          </div>
          <div className="flex-grow flex justify-center">
            <SearchBox 
              onLocationSelect={(lat, lng, zoom) => {
                setSearchLocation({
                  latitude: lat,
                  longitude: lng,
                  zoom: zoom
                });
              }} 
            />
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full bg-white p-6 flex items-center border border-gray-300">
          <a
            href="https://johnreid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-600 transition-colors"
          >
            <img
              src="/johnreid-logo.avif"
              alt="JohnReid"
              className="h-14"
            />
          </a>
        </div>
      </header>

      <main className="flex-grow relative">
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading map...</div>}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto mb-4"></div>
              <p className="text-indigo-700">Loading map data...</p>
            </div>
          </div>
        ) : null}

        <MapComponent searchLocation={searchLocation} />
        </Suspense>
      </main>

      <footer className="bg-gray-100 p-4 border-t border-gray-200">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} UMC Property Analysis Map. All rights reserved.</p>
          <p className="mt-1">Data sources: HUD, United Methodist Church</p>
        </div>
      </footer>
    </div>
  )
}

export default App
