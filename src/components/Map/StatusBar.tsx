import React from 'react';
import { StatusBarProps } from './types';

const StatusBar: React.FC<StatusBarProps> = ({ statusMessages }) => {
  return (
    <div className="status-bar">
      {statusMessages.length > 0 && (
        <div className="status-ticker">
          {statusMessages.map((msg, index) => (
            <span key={index} className="status-message">{msg}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusBar;
