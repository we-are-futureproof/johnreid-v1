import React from 'react';
import TestControls from './TestControls';
import { UMCLocation } from '../../lib/supabase';

interface DebugToolsProps {
  selectedProperty: UMCLocation | null;
  setSelectedProperty: (property: UMCLocation | null) => void;
  addStatusMessage: (message: string) => void;
}

/**
 * Debug tools panel for development and testing
 * Will be removed in production
 */
const DebugTools: React.FC<DebugToolsProps> = ({
  selectedProperty,
  setSelectedProperty,
  addStatusMessage
}) => {
  return (
    <div className="absolute top-24 right-4 z-10 bg-white p-2 rounded shadow-md">
      <div className="flex flex-col space-y-2">
        {/* Test Controls Component - will be removed once Smarty API integration is complete */}
        <TestControls 
          selectedProperty={selectedProperty}
          setSelectedProperty={setSelectedProperty}
          addStatusMessage={addStatusMessage}
        />
      </div>
    </div>
  );
};

export default DebugTools;
