import React from 'react';
import { NavigationControl } from 'react-map-gl';

interface MapHeaderProps {
  isLoadingUMC: boolean;
}

/**
 * Renders the map header components, including navigation controls and loading indicators
 */
const MapHeader: React.FC<MapHeaderProps> = ({ isLoadingUMC }) => {
  return (
    <>
      {/* Navigation controls */}
      <NavigationControl position="top-left" />
      
      {/* UMC Loading Indicator */}
      {isLoadingUMC && (
        <div className="absolute top-16 left-4 z-40 bg-white px-3 py-2 rounded-md shadow-md border border-blue-300 flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-blue-700">Loading UMC data...</span>
        </div>
      )}
    </>
  );
};

export default MapHeader;
