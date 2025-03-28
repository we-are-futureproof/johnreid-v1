import React, { useState } from 'react';
import { UMCLocation } from './types';

interface TestControlsProps {
  selectedProperty: UMCLocation | null;
  setSelectedProperty: (property: UMCLocation) => void;
  addStatusMessage: (message: string) => void;
}

/**
 * TestControls component with test buttons for Smarty API integration.
 * This component is temporary and will be removed once the API integration is complete.
 */
const TestControls: React.FC<TestControlsProps> = ({
  selectedProperty,
  setSelectedProperty,
  addStatusMessage
}) => {
  // State for tracking enrichment processing
  const [isProcessingEnrichment, setIsProcessingEnrichment] = useState<boolean>(false);

  // Handler for testing Bethel UMC property
  const handleTestBethelUMC = async () => {
    try {
      addStatusMessage('Testing specific Bethel UMC property...');
      
      // Import the smartyService directly to ensure we have latest methods
      const { validateAddress, enrichProperty } = await import('../../lib/smartyService');
      
      setIsProcessingEnrichment(true);
      
      // Create a complete test property for Bethel UMC
      const bethelUmc = {
        id: 0,
        gcfa: 193650, // Using number to match UMCLocation type
        url: '',
        name: 'Bethel UMC',
        conference: 'Peninsula-Delaware',
        district: 'Salisbury',
        address: '31810 Old Ocean City Rd',
        city: 'Salisbury',
        state: 'MD',
        lat: 38.3699,
        lng: -75.5578,
        status: 'Active',
        closed_date: null,
        details: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        geocoded_address: null,
        smarty: null,
        viable: undefined
      };
      
      // Step 1: Validate address to get smarty_key
      addStatusMessage('Step 1: Validating address to get smarty_key...');
      console.log('Validating address for Bethel UMC:', bethelUmc);
      
      const validationResult = await validateAddress(bethelUmc);
      
      if (!validationResult || !validationResult.metadata?.smarty_key) {
        console.error('Address validation failed:', validationResult);
        addStatusMessage('❌ Address validation failed - no smarty_key');
        setIsProcessingEnrichment(false);
        return;
      }
      
      const smartyKey = validationResult.metadata.smarty_key;
      console.log('Successfully obtained smarty_key:', smartyKey);
      addStatusMessage(`✅ Successfully obtained smarty_key: ${smartyKey.substring(0, 8)}...`);
      
      // Step 2: Use smarty_key to get property enrichment data
      addStatusMessage('Step 2: Getting property enrichment data...');
      const propertyData = await enrichProperty(smartyKey);
      
      if (!propertyData) {
        console.error('Property enrichment failed - no data returned');
        addStatusMessage('❌ Property enrichment failed - no data returned');
        setIsProcessingEnrichment(false);
        return;
      }
      
      // Log the complete property enrichment data
      console.log('Property enrichment data:', propertyData);
      
      // Extract and display important property information
      const lotSizeAcres = propertyData.lot_size_acres;
      const lotSizeSqft = propertyData.lot_size_sqft;
      const isViable = (lotSizeAcres && lotSizeAcres >= 4.5) || 
                        (lotSizeSqft && lotSizeSqft >= 200000);
      
      // Display the results
      addStatusMessage(`✅ Successfully retrieved property data:`);
      addStatusMessage(`   Lot size: ${lotSizeAcres?.toFixed(2) || 'unknown'} acres (${lotSizeSqft?.toLocaleString() || 'unknown'} sq ft)`);
      addStatusMessage(`   Viability: ${isViable ? '✅ VIABLE' : '❌ NOT VIABLE'}`);
      
      setIsProcessingEnrichment(false);
    } catch (error) {
      console.error('Error in Bethel UMC test:', error);
      addStatusMessage(`❌ Error in Bethel UMC test: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessingEnrichment(false);
    }
  };

  // Handler for testing the currently selected property
  const handleTestSelectedProperty = async () => {
    try {
      if (!selectedProperty) {
        addStatusMessage('Please select a property first');
        return;
      }
      
      addStatusMessage(`Processing selected property: ${selectedProperty.name}`);
      
      // Force property.viable to undefined to allow reprocessing
      const propertyToTest = {
        ...selectedProperty,
        viable: undefined,
        smarty: undefined
      };
      
      setIsProcessingEnrichment(true);
      
      // Dynamically import the Smarty service for the two-step process
      const { validateAddress, enrichProperty } = await import('../../lib/smartyService');
      
      // Step 1: Validate address to get smarty_key
      addStatusMessage('Step 1: Validating address to get smarty_key...');
      console.log('Validating address for property:', propertyToTest);
      
      const validationResult = await validateAddress(propertyToTest);
      
      if (!validationResult || !validationResult.metadata?.smarty_key) {
        console.error('Address validation failed:', validationResult);
        addStatusMessage('❌ Address validation failed - no smarty_key');
        setIsProcessingEnrichment(false);
        return;
      }
      
      const smartyKey = validationResult.metadata.smarty_key;
      console.log('Successfully obtained smarty_key:', smartyKey);
      addStatusMessage(`✅ Successfully obtained smarty_key: ${smartyKey.substring(0, 8)}...`);
      
      // Step 2: Use smarty_key to get property enrichment data
      addStatusMessage('Step 2: Getting property enrichment data...');
      const propertyData = await enrichProperty(smartyKey);
      
      if (!propertyData) {
        console.error('Property enrichment failed - no data returned');
        addStatusMessage('❌ Property enrichment failed - no data returned');
        setIsProcessingEnrichment(false);
        return;
      }
      
      // Log the complete property enrichment data
      console.log('Property enrichment data:', propertyData);
      
      // Extract and display important property information
      const lotSizeAcres = propertyData.lot_size_acres;
      const lotSizeSqft = propertyData.lot_size_sqft;
      const isViable = (lotSizeAcres && lotSizeAcres >= 4.5) || 
                        (lotSizeSqft && lotSizeSqft >= 200000);
      
      // Create the enriched property with the smarty data
      const enrichedProperty = {
        ...propertyToTest,
        smarty: propertyData,
        viable: isViable
      };
      
      // Update the selected property in the UI
      setSelectedProperty(enrichedProperty as UMCLocation);
      
      // Display the results
      addStatusMessage(`✅ Successfully retrieved property data:`);
      addStatusMessage(`   Lot size: ${lotSizeAcres?.toFixed(2) || 'unknown'} acres (${lotSizeSqft?.toLocaleString() || 'unknown'} sq ft)`);
      addStatusMessage(`   Viability: ${isViable ? '✅ VIABLE' : '❌ NOT VIABLE'}`);
    } catch (error) {
      console.error('Error processing property:', error);
      addStatusMessage(`Error processing property: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessingEnrichment(false);
    }
  };

  // Handler for testing the raw Smarty API
  const handleTestRawSmartyAPI = async () => {
    try {
      addStatusMessage('Testing Smarty API connectivity...');
      
      const { testSmartyApiConnectivity } = await import('../../lib/smartyService');
      const result = await testSmartyApiConnectivity();
      
      if (result.success) {
        addStatusMessage(`✅ Smarty API connectivity test successful: ${result.message}`);
      } else {
        addStatusMessage(`❌ Smarty API connectivity test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error testing API:', error);
      addStatusMessage(`Error testing Smarty API: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="flex flex-col space-y-1 p-2 bg-gray-100 rounded">
      <div className="text-sm font-bold text-gray-700 mb-1">Test Controls (temporary)</div>
      
      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
        onClick={handleTestRawSmartyAPI}
        disabled={isProcessingEnrichment}
      >
        Test Smarty API (Raw)
      </button>

      <button 
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-sm"
        onClick={handleTestBethelUMC}
        disabled={isProcessingEnrichment}
      >
        Test Bethel UMC Property
      </button>
      
      {selectedProperty && (
        <button 
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm"
          onClick={handleTestSelectedProperty}
          disabled={isProcessingEnrichment}
        >
          Test Selected Property
        </button>
      )}
      
      {isProcessingEnrichment && (
        <div className="text-sm text-orange-500 mt-1">Processing... please wait</div>
      )}
    </div>
  );
};

export default TestControls;
