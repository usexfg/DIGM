import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Wallet methods
  wallet: {
    getBalance: () => ipcRenderer.invoke('wallet:getBalance'),
    sendXFG: (to: string, amount: number) => ipcRenderer.invoke('wallet:sendXFG', to, amount),
  },

  // Miner methods
  miner: {
    start: (options: any) => ipcRenderer.invoke('miner:start', options),
    stop: () => ipcRenderer.invoke('miner:stop'),
  },

  // Storage methods
  storage: {
    fetchChunk: (cid: string) => ipcRenderer.invoke('storage:fetchChunk', cid),
  },

  // System methods
  system: {
    platform: process.platform,
    version: process.versions,
  }
});

// Define the type for the exposed API
export interface ElectronAPI {
  wallet: {
    getBalance: () => Promise<{ xfg: number; digm: number; para: number }>;
    sendXFG: (to: string, amount: number) => Promise<{ txid: string }>;
  };
  miner: {
    start: (options: any) => Promise<{ success: boolean }>;
    stop: () => Promise<{ success: boolean }>;
  };
  storage: {
    fetchChunk: (cid: string) => Promise<Buffer>;
  };
  system: {
    platform: string;
    version: NodeJS.ProcessVersions;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 