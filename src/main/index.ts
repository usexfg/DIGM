import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { isDev } from '../shared/utils';
import fuegoBridge from './fuego-bridge';

class DIGMApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private init() {
    app.whenReady().then(() => this.createWindow());
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
    });

    this.setupIPC();
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    const startUrl = isDev() 
      ? 'http://localhost:5173'  // Vite dev server
      : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

    this.mainWindow.loadURL(startUrl);

    if (isDev()) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupIPC() {
    // Wallet IPC handlers
    ipcMain.handle('wallet:getBalance', async () => {
      // Ensure Fuego node is running
      fuegoBridge.start();
      const xfg = await fuegoBridge.getBalance();
      // DIGM and PARA balances will be added later
      return { xfg, digm: 0, para: 0 };
    });

    ipcMain.handle('wallet:sendXFG', async (_, to: string, amount: number) => {
      // TODO: integrate with fuego-node
      return { txid: 'mock-tx-id' };
    });

    // Miner IPC handlers
    ipcMain.handle('miner:start', async (_, options) => {
      // TODO: start proxy miner
      return { success: true };
    });

    ipcMain.handle('miner:stop', async () => {
      // TODO: stop proxy miner
      return { success: true };
    });

    // Storage IPC handlers
    ipcMain.handle('storage:fetchChunk', async (_, cid: string) => {
      // TODO: integrate with IPFS
      return Buffer.from('mock-chunk-data');
    });
  }
}

new DIGMApp(); 