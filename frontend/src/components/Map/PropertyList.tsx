import React from 'react';
import { PropertyListProps } from './types';

const PropertyList: React.FC<PropertyListProps> = ({ properties, flyToProperty }) => {
  return (
    <div
      className="overflow-y-auto flex-grow"
      style={{
        flex: 1, 
        height: '100%',
        maxHeight: 'calc(100vh - 350px)',
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e0 #f7fafc',
      }}
    >
      <style>
        {`
          /* Custom scrollbar styles to ensure it's always visible */
          .overflow-y-scroll::-webkit-scrollbar {
            width: 8px;
            display: block;
          }

          .overflow-y-scroll::-webkit-scrollbar-track {
            background: #f7fafc;
          }

          .overflow-y-scroll::-webkit-scrollbar-thumb {
            background-color: #cbd5e0;
            border-radius: 4px;
          }
        `}
      </style>
      {properties.length > 0 ? (
        <ul className="space-y-2 pr-2">
          {properties.map(property => (
            <li
              key={property.gcfa}
              className="p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => flyToProperty(property)}
            >
              <p className="font-medium">
                {property.name.length > 30
                  ? `${property.name.substring(0, 30)}...`
                  : property.name}
              </p>
              <p className="text-sm text-gray-600">{property.city}, {property.state}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No properties match the current filters</p>
      )}
    </div>
  );
};

export default PropertyList;
