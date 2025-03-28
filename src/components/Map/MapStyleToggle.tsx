import React from 'react';
import { mapStyles } from './config/mapConfig';

interface MapStyleToggleProps {
  mapStyle: string;
  setMapStyle: (style: string) => void;
}

/**
 * Toggle button component for switching between street and satellite map views
 */
const MapStyleToggle: React.FC<MapStyleToggleProps> = ({ mapStyle, setMapStyle }) => {
  const isSatellite = mapStyle.includes('satellite');
  
  const handleStyleToggle = () => {
    const newStyle = isSatellite ? mapStyles.streets : mapStyles.satellite;
    setMapStyle(newStyle);
    localStorage.setItem('umc-map-style', newStyle);
  };

  return (
    <div className="absolute left-4 bottom-24 z-50">
      <button 
        onClick={handleStyleToggle}
        className="bg-white py-3 px-4 rounded-lg shadow-xl border-2 border-blue-500 flex items-center space-x-3 hover:bg-blue-50 transition-colors"
        title={isSatellite ? 'Switch to street view' : 'Switch to satellite view'}
      >
        {isSatellite ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-sm font-semibold text-blue-600">
          {isSatellite ? 'Street View' : 'Satellite View'}
        </span>
      </button>
    </div>
  );
};

export default MapStyleToggle;
