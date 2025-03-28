import './index.css'
import { lazy, Suspense, useState } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import SearchBox from './components/SearchBox'

// Dynamic import for Map component
const MapComponent = lazy(() => import('./components/Map'))

// About page component
function About() {
  return (
    <div className="min-h-screen bg-white p-8">
      <a href="/" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
        &larr; Back to Map
      </a>
      <h1 className="text-3xl font-bold mb-6">About UMC Property Analysis Map</h1>
      
      <div className="max-w-3xl mb-8">
        <p className="mb-4">
          This application overlays Qualified Census Tracts (QCT) and Difficult Development Areas (DDA) 
          with United Methodist Church (UMC) locations, incorporating Area Median Income (AMI) data from 
          HUD for market targeting.
        </p>
        <p className="mb-4">
          Users can filter properties by their status (active or closed), toggle layer visibility, 
          and search for specific locations.
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Data Sources</h2>
      <ul className="list-disc pl-5 mb-8">
        <li>UMC Location Data: United Methodist Church</li>
        <li>Qualified Census Tracts (QCT): HUD</li>
        <li>Difficult Development Areas (DDA): HUD</li>
      </ul>

      <div className="border-t border-gray-200 pt-6 text-sm text-gray-600">
        <p>© {new Date().getFullYear()} UMC Property Analysis Map. All rights reserved.</p>
        <p className="mt-1">Data sources: HUD, United Methodist Church</p>
      </div>
    </div>
  );
}

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
    <Router>
      <Routes>
        <Route path="/about" element={<About />} />
        <Route path="/" element={
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
          <div className="flex items-center ml-4">
            <a
              href="/about"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              About
            </a>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full bg-white p-4 flex items-center gap-4 border border-gray-300">
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

      {/* Footer removed and moved to About page */}
    </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
