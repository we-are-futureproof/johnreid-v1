import React from 'react';
import { FocusPanelProps } from './types';

const FocusPanel: React.FC<FocusPanelProps> = ({
  showFocusPanel,
  setShowFocusPanel,
  focusType,
  setFocusType,
  selectedProperty,
  selectedQCT,
  selectedDDA
}) => {
  return (
    <div className={`focus-panel p-4 rounded shadow-lg ${!showFocusPanel ? 'hidden' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Focus</h2>
        <button
          onClick={() => {
            setShowFocusPanel(false);
            setFocusType(null);
          }}
          className="text-gray-500 hover:text-gray-700"
          title="Close panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Property details */}
      {focusType === 'property' && selectedProperty && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2" style={{ wordBreak: 'break-word' }}>{selectedProperty.name}</h3>

            <p className="mb-3">
              {selectedProperty.address}<br />
              {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip || ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-semibold">Status:</span>{' '}
              <span className={`${selectedProperty.status?.toLowerCase() === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {selectedProperty.status}
              </span>
            </div>

            <div className="p-2 bg-gray-50 rounded">
              <span className="font-semibold">Conference:</span>{' '}
              <span>{selectedProperty.conference}</span>
            </div>

            <div className="p-2 bg-gray-50 rounded">
              <span className="font-semibold">District:</span>{' '}
              <span>{selectedProperty.district}</span>
            </div>

            <div className="p-2 bg-gray-50 rounded">
              <span className="font-semibold">GCFA:</span>{' '}
              <span>{selectedProperty.gcfa}</span>
            </div>
          </div>

          {/* Additional property details - show all available data */}
          <div className="mt-4 border-t pt-4">
            <h4 className="font-semibold mb-2">All Property Data</h4>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {Object.entries(selectedProperty).map(([key, value]) => (
                value !== null && value !== undefined && (
                  <div key={key} className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QCT Zone details */}
      {focusType === 'qct' && selectedQCT && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2">QCT Zone Details</h3>
            <p className="mb-3 text-blue-600 font-medium">Census Tract ID: {selectedQCT.geoid || 'N/A'}</p>
          </div>

          {/* QCT details - show all available data */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {Object.entries(selectedQCT).map(([key, value]) => (
              value !== null && value !== undefined && (
                <div key={key} className="grid grid-cols-2 gap-2 p-2 bg-blue-50 rounded">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-900">{String(value)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* DDA Zone details */}
      {focusType === 'dda' && selectedDDA && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2">DDA Zone Details</h3>
            <p className="mb-3 text-orange-600 font-medium">DDA ID: {selectedDDA.dda_code || 'N/A'}</p>
          </div>

          {/* DDA details - show all available data */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {Object.entries(selectedDDA).map(([key, value]) => (
              value !== null && value !== undefined && (
                <div key={key} className="grid grid-cols-2 gap-2 p-2 bg-orange-50 rounded">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-900">{String(value)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Show this if nothing is selected */}
      {!focusType && (
        <p className="text-gray-500 italic">Click on a property, QCT zone, or DDA zone to view details</p>
      )}
    </div>
  );
};

export default FocusPanel;
