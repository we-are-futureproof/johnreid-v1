/**
 * UI Configuration Settings
 * 
 * This file centralizes all configurable UI parameters for the application.
 * Any UI-related settings that may need adjustment should be defined here.
 */

// Ticker tape configuration
export const tickerTapeConfig = {
  // Animation speed in seconds (lower = faster)
  scrollDuration: 20,
  
  // Spacing between messages in pixels
  messageSpacing: 150,
  
  // How long messages remain in the ticker before being removed (ms)
  messageLifespan: 30000,
  
  // Font size for ticker messages
  fontSize: 10,
};

// Map animation configuration
export const mapAnimationConfig = {
  // Duration of fly-to animations (ms)
  flyToDuration: 100,
};

// Filter panel configuration
export const filterPanelConfig = {
  // Whether panel starts collapsed
  startCollapsed: false,
};
