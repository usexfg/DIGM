/**
 * Checks if the application is running in development mode
 */
export function isDev(): boolean {
  // Check if we're in Electron main process
  try {
    const { app } = require('electron');
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
  } catch {
    // Fallback for renderer process or non-Electron environment
    return process.env.NODE_ENV === 'development';
  }
}

/**
 * Get the user data directory for storing application files
 */
export function getUserDataPath(): string {
  const { app } = require('electron');
  return app.getPath('userData');
}

/**
 * Common application constants
 */
export const APP_NAME = 'DIGM Platform';
export const APP_VERSION = '0.1.0-alpha'; 