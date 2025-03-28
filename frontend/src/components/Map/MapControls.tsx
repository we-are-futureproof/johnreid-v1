import React from 'react';
import { MapControlsProps } from './types';
import PropertyList from './PropertyList';
import { UMCLocation } from './types';

interface ExtendedMapControlsProps extends MapControlsProps {
  validProperties: UMCLocation[];
  flyToProperty: (property: UMCLocation) => void;
}

const MapControls: React.FC<ExtendedMapControlsProps> = ({
  showQCT,
  showDDA,
  showActiveProperties,
  showClosedProperties,
  toggleQCTLayer,
  toggleDDALayer,
  setShowActiveProperties,
  setShowClosedProperties,
  isPanelCollapsed,
  setIsPanelCollapsed,
  isBlinking,
  validProperties,
  flyToProperty
}) => {
  return (
    <>
      {/* CSS for blinking animation */}
      <style>
        {`
          @keyframes blink-red {
            0%, 100% { background-color: transparent; }
            25%, 75% { background-color: #ff0000; }
          }
          .blink-animation {
            animation: blink-red 0.6s ease-in-out 2;
            transition: background-color 0.3s;
          }
        `}
      </style>

      {/* Left side drawer toggle button/tab */}
      <div
        className={`drawer-toggle-tab ${!isPanelCollapsed ? 'active' : ''} ${isBlinking ? 'blink-animation' : ''}`}
        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        title={isPanelCollapsed ? "Open controls" : "Close controls"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isBlinking ? 'text-white' : 'text-gray-700'}`} viewBox="0 0 20 20" fill="currentColor">
          {isPanelCollapsed ? (
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          )}
        </svg>
      </div>

      {/* Left side drawer panel */}
      <div className={`drawer-side-left ${isPanelCollapsed ? 'collapsed' : ''}`}>
        <div className="p-4 h-full flex flex-col" style={{ overflow: 'hidden' }}>
          <h2 className="text-xl font-bold mb-4">Map Controls</h2>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showQCT}
                  onChange={toggleQCTLayer}
                  className="mr-2"
                />
                QCT Zones
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDDA}
                  onChange={toggleDDALayer}
                  className="mr-2"
                />
                DDA Zones
              </label>
            </div>
          </div>
          
          {/* Property Filters Section */}
          <div className="mb-4 mt-6">
            <h3 className="font-semibold mb-2">Property Filters</h3>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showActiveProperties}
                  onChange={(e) => {
                    setShowActiveProperties(e.target.checked);
                    localStorage.setItem('umc-show-active', String(e.target.checked));
                  }}
                  className="mr-2"
                />
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2" title="Active & Viable"></span>
                  <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-2" title="Active & Non-viable"></span>
                  <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2" title="Active (click for viability check)"></span>
                  Active Properties
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showClosedProperties}
                  onChange={(e) => {
                    setShowClosedProperties(e.target.checked);
                    localStorage.setItem('umc-show-closed', String(e.target.checked));
                  }}
                  className="mr-2"
                />
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                  Closed Properties
                </span>
              </label>
            </div>
          </div>

          {/* Properties List Section */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex-grow flex flex-col">
            <h3 className="font-semibold mb-2">Properties ({validProperties.length})</h3>
            <PropertyList properties={validProperties} flyToProperty={flyToProperty} />
          </div>
        </div>
      </div>
    </>
  );
};

export default MapControls;
