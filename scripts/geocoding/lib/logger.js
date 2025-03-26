// Logging functionality for geocoding process
import fs from 'fs';
import path from 'path';

/**
 * Logger class for managing log output and files
 */
export class Logger {
  /**
   * Initialize the logger
   * @param {string} logDir - Directory to store log files
   */
  constructor(logDir = './scripts/logs') {
    this.logDir = logDir;
    this.logStream = null;
    this.logFile = null;
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
  }

  /**
   * Setup logging and redirect console output
   * @returns {string} - Path to the log file
   */
  setup() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Generate timestamped log file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = `${this.logDir}/geocoding-${timestamp}.log`;
    
    // Create a write stream for the log file
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    
    // Override console methods to also write to log file
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ).join(' ');
      
      this.logStream.write(message + '\n');
      this.originalConsoleLog.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ).join(' ');
      
      this.logStream.write('[ERROR] ' + message + '\n');
      this.originalConsoleError.apply(console, args);
    };
    
    return this.logFile;
  }

  /**
   * Clean up and restore original console functions
   */
  cleanup() {
    // Restore original console methods
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    
    // Close the log stream if it exists
    if (this.logStream) {
      this.logStream.end();
    }
  }
}
