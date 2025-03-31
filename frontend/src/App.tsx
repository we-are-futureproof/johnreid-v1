import './index.css'
import { lazy, Suspense, useState } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import SearchBox from './components/SearchBox'

// Dynamic import for Map component
const MapComponent = lazy(() => import('./components/Map'))

// About page component
function About() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Faded map background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 z-0" 
        style={{ 
          backgroundImage: 'url("/map-background.png")',
          backgroundColor: '#f0f9ff'
        }}
      ></div>
      
      {/* Main content with overlay */}
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {/* Back button */}
        <a href="/#/" className="text-blue-700 hover:text-blue-900 mb-8 inline-flex items-center font-medium transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Map
        </a>
        
        {/* Header with logo */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 pb-6 border-b border-gray-300">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 md:mb-0">About UMC Property Analysis Map</h1>
          <a href="https://johnreid.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <img src="/johnreid-logo.avif" alt="John Reid" className="h-20" />
          </a>
        </div>
        
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Left column: Map details */}
          <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">Map Overview</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              This application overlays Qualified Census Tracts (QCT) and Difficult Development Areas (DDA) 
              with United Methodist Church (UMC) locations, incorporating Area Median Income (AMI) data from 
              HUD for market targeting.
            </p>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Users can filter properties by their status (active or closed), toggle layer visibility, 
              and search for specific locations.
            </p>
            
            <h3 className="text-xl font-bold text-gray-800 mb-4">Data Sources</h3>
            <ul className="list-disc pl-5 mb-4 text-gray-700">
              <li className="mb-2">UMC Location Data: United Methodist Church</li>
              <li className="mb-2">Qualified Census Tracts (QCT): HUD</li>
              <li className="mb-2">Difficult Development Areas (DDA): HUD</li>
            </ul>
          </div>
          
          {/* Right column: John Reid info */}
          <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">About John Reid</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              John Reid Companies is a real estate development and construction management firm founded in Washington, DC circa 2009.
            </p>
            <p className="text-gray-700 mb-6 leading-relaxed">
              At our core, we are solution-driven experts with experiences ranging from General Contracting and Real Estate Development. 
              John Reid has a unique perspective having sat in and felt the pressures of every stakeholders position.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Therefore, we appreciate success factors from various perspectives, translating into a balanced and comprehensive team approach. 
              John Reid leads projects with the cornerstones of process, organization and transparency.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} John Reid Companies. All rights reserved.</p>
          <p className="mt-2 text-sm text-gray-500">Data sources: HUD, United Methodist Church</p>
        </div>
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
        <div className="flex items-center justify-between w-full pr-24">
          {/* Logo on left */}
          <div className="flex-shrink-0">
            <h1 className="text-4xl">UMC Property Analysis Map</h1>
          </div>
          
          {/* Search box in center (grows with screen width) */}
          <div className="flex-grow mx-6 flex justify-center">
            <div className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl transition-all duration-200">
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
          
          {/* Navigation links on right (before logo) */}
          <div className="flex-shrink-0 flex items-center space-x-10 mr-40">
            <a
              href="https://airtable.com/appKiAZGKLCMpCnZP/pagK7a8dqVWzI6023"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors text-lg font-medium whitespace-nowrap"
            >
              Dashboard
            </a>
            <a
              href="/#/about"
              className="text-gray-300 hover:text-white transition-colors text-lg font-medium whitespace-nowrap"
            >
              About
            </a>
          </div>
        </div>
        
        {/* John Reid logo positioned absolutely */}
        <div className="absolute top-0 right-0 h-full bg-white p-4 flex items-center border border-gray-300">
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
