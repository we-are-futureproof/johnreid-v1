import React from 'react';
import { Source, Layer } from 'react-map-gl';
import { qctLayerStyle, ddaLayerStyle } from './constants';

interface MapLayersProps {
  qctData: any;
  ddaData: any;
  showQCT: boolean;
  showDDA: boolean;
}

/**
 * Renders QCT and DDA map layers when data is available and layers are enabled
 */
const MapLayers: React.FC<MapLayersProps> = ({
  qctData,
  ddaData,
  showQCT,
  showDDA
}) => {
  return (
    <>
      {/* QCT Layer */}
      {qctData && showQCT && (
        <Source
          id="qct-source"
          type="geojson"
          data={qctData}
        >
          <Layer {...qctLayerStyle} id="qct-layer" />
        </Source>
      )}

      {/* DDA Layer */}
      {ddaData && showDDA && (
        <Source
          id="dda-source"
          type="geojson"
          data={ddaData}
        >
          <Layer {...ddaLayerStyle} id="dda-layer" />
        </Source>
      )}
    </>
  );
};

export default MapLayers;
