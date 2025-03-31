import { useState, useRef, KeyboardEvent } from 'react';
import { FaSearch } from 'react-icons/fa';

// Mapbox access token from environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface SearchBoxProps {
  onLocationSelect: (lat: number, lng: number, zoom: number) => void;
}

export default function SearchBox({ onLocationSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use Mapbox Geocoding API to convert address to coordinates
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const location = data.features[0];
        const [lng, lat] = location.center;
        
        // Call the parent component's handler with coordinates
        onLocationSelect(lat, lng, 11); // Zoom level 11 for better city-level detail
      } else {
        setError('Location not found');
      }
    } catch (err) {
      setError('Search failed');
      console.error('Geocoding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative w-full text-gray-900">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a location..."
          className="px-10 py-2 md:py-2.5 lg:py-3 xl:py-3.5 w-full rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm md:text-base lg:text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400 text-sm md:text-base lg:text-lg" />
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 border-2 border-gray-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {error && (
        <div className="absolute mt-1 text-sm md:text-base text-red-600">{error}</div>
      )}
    </div>
  );
}
