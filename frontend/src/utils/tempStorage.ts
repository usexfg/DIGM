// Temporary Storage System for DIGM Platform
// This provides storage solutions until P2P in-network nodes are ready

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer | string; // ArrayBuffer for files, string for metadata
  uploadedAt: Date;
  expiresAt?: Date;
  metadata?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    thumbnail?: string;
    artist?: string;
    title?: string;
    genre?: string;
    price?: number;
  };
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  availableSpace: number;
  storageType: 'indexeddb' | 'localstorage' | 'memory';
}

export interface StorageOptions {
  maxSize?: number; // in bytes
  maxFiles?: number;
  expirationDays?: number;
  storageType?: 'indexeddb' | 'localstorage' | 'memory' | 'auto';
  compression?: boolean;
}

class TempStorageManager {
  private db: IDBDatabase | null = null;
  private memoryStorage = new Map<string, StoredFile>();
  private options: StorageOptions;
  private readonly DB_NAME = 'DIGM_TempStorage';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'files';

  constructor(options: StorageOptions = {}) {
    this.options = {
      maxSize: 500 * 1024 * 1024, // 500MB default
      maxFiles: 1000,
      expirationDays: 30,
      storageType: 'auto',
      compression: true,
      ...options
    };
  }

  // Initialize storage system
  async initialize(): Promise<void> {
    try {
      if (this.options.storageType === 'auto') {
        // Auto-detect best available storage
        if (await this.isIndexedDBSupported()) {
          await this.initIndexedDB();
        } else if (this.isLocalStorageSupported()) {
          this.options.storageType = 'localstorage';
        } else {
          this.options.storageType = 'memory';
        }
      } else if (this.options.storageType === 'indexeddb') {
        await this.initIndexedDB();
      }
    } catch (error) {
      console.warn('Failed to initialize preferred storage, falling back to memory:', error);
      this.options.storageType = 'memory';
    }
  }

  // Check if IndexedDB is supported
  private async isIndexedDBSupported(): Promise<boolean> {
    return 'indexedDB' in window;
  }

  // Check if localStorage is supported
  private isLocalStorageSupported(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Initialize IndexedDB
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  // Store a file
  async storeFile(file: File, metadata?: StoredFile['metadata']): Promise<string> {
    const id = this.generateFileId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (this.options.expirationDays || 30));

    // Check storage limits
    await this.enforceStorageLimits(file.size);

    const storedFile: StoredFile = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      data: await this.fileToArrayBuffer(file),
      uploadedAt: new Date(),
      expiresAt,
      metadata
    };

    switch (this.options.storageType) {
      case 'indexeddb':
        await this.storeInIndexedDB(storedFile);
        break;
      case 'localstorage':
        await this.storeInLocalStorage(storedFile);
        break;
      case 'memory':
      default:
        this.storeInMemory(storedFile);
        break;
    }

    return id;
  }

  // Retrieve a file
  async getFile(id: string): Promise<StoredFile | null> {
    try {
      switch (this.options.storageType) {
        case 'indexeddb':
          return await this.getFromIndexedDB(id);
        case 'localstorage':
          return await this.getFromLocalStorage(id);
        case 'memory':
        default:
          return this.getFromMemory(id);
      }
    } catch (error) {
      console.error('Error retrieving file:', error);
      return null;
    }
  }

  // Get file as blob (for download/playback)
  async getFileAsBlob(id: string): Promise<Blob | null> {
    const storedFile = await this.getFile(id);
    if (!storedFile) return null;

    if (storedFile.data instanceof ArrayBuffer) {
      return new Blob([storedFile.data], { type: storedFile.type });
    } else {
      // Handle string data (metadata)
      return new Blob([storedFile.data], { type: 'application/json' });
    }
  }

  // Get file URL (for audio/video elements)
  async getFileURL(id: string): Promise<string | null> {
    const blob = await this.getFileAsBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  // List all files
  async listFiles(): Promise<StoredFile[]> {
    try {
      switch (this.options.storageType) {
        case 'indexeddb':
          return await this.listFromIndexedDB();
        case 'localstorage':
          return await this.listFromLocalStorage();
        case 'memory':
        default:
          return this.listFromMemory();
      }
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Delete a file
  async deleteFile(id: string): Promise<boolean> {
    try {
      switch (this.options.storageType) {
        case 'indexeddb':
          return await this.deleteFromIndexedDB(id);
        case 'localstorage':
          return await this.deleteFromLocalStorage(id);
        case 'memory':
        default:
          return this.deleteFromMemory(id);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<StorageStats> {
    const files = await this.listFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxSize = this.options.maxSize || 500 * 1024 * 1024;

    return {
      totalFiles: files.length,
      totalSize,
      availableSpace: Math.max(0, maxSize - totalSize),
      storageType: this.options.storageType as 'indexeddb' | 'localstorage' | 'memory'
    };
  }

  // Clean up expired files
  async cleanupExpired(): Promise<number> {
    const files = await this.listFiles();
    const now = new Date();
    const expiredFiles = files.filter(file => file.expiresAt && file.expiresAt < now);
    
    let deletedCount = 0;
    for (const file of expiredFiles) {
      if (await this.deleteFile(file.id)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Clear all files
  async clearAll(): Promise<void> {
    switch (this.options.storageType) {
      case 'indexeddb':
        await this.clearIndexedDB();
        break;
      case 'localstorage':
        await this.clearLocalStorage();
        break;
      case 'memory':
      default:
        this.clearMemory();
        break;
    }
  }

  // Private helper methods

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private async enforceStorageLimits(newFileSize: number): Promise<void> {
    const stats = await this.getStorageStats();
    
    if (stats.totalSize + newFileSize > (this.options.maxSize || 500 * 1024 * 1024)) {
      // Remove oldest files until we have space
      const files = await this.listFiles();
      const sortedFiles = files.sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
      
      let currentSize = stats.totalSize;
      for (const file of sortedFiles) {
        if (currentSize + newFileSize <= (this.options.maxSize || 500 * 1024 * 1024)) {
          break;
        }
        await this.deleteFile(file.id);
        currentSize -= file.size;
      }
    }
  }

  // IndexedDB methods
  private async storeInIndexedDB(file: StoredFile): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(file);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(id: string): Promise<StoredFile | null> {
    if (!this.db) throw new Error('IndexedDB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async listFromIndexedDB(): Promise<StoredFile[]> {
    if (!this.db) throw new Error('IndexedDB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(id: string): Promise<boolean> {
    if (!this.db) throw new Error('IndexedDB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // LocalStorage methods
  private async storeInLocalStorage(file: StoredFile): Promise<void> {
    const key = `DIGM_FILE_${file.id}`;
    const serialized = JSON.stringify({
      ...file,
      data: Array.from(new Uint8Array(file.data as ArrayBuffer)),
      uploadedAt: file.uploadedAt.toISOString(),
      expiresAt: file.expiresAt?.toISOString()
    });
    
    try {
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new Error('LocalStorage quota exceeded');
    }
  }

  private async getFromLocalStorage(id: string): Promise<StoredFile | null> {
    const key = `DIGM_FILE_${id}`;
    const serialized = localStorage.getItem(key);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized);
    return {
      ...parsed,
      data: new Uint8Array(parsed.data).buffer,
      uploadedAt: new Date(parsed.uploadedAt),
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
    };
  }

  private async listFromLocalStorage(): Promise<StoredFile[]> {
    const files: StoredFile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('DIGM_FILE_')) {
        const file = await this.getFromLocalStorage(key.replace('DIGM_FILE_', ''));
        if (file) files.push(file);
      }
    }
    return files;
  }

  private async deleteFromLocalStorage(id: string): Promise<boolean> {
    const key = `DIGM_FILE_${id}`;
    localStorage.removeItem(key);
    return true;
  }

  private async clearLocalStorage(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('DIGM_FILE_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // Memory storage methods
  private storeInMemory(file: StoredFile): void {
    this.memoryStorage.set(file.id, file);
  }

  private getFromMemory(id: string): StoredFile | null {
    return this.memoryStorage.get(id) || null;
  }

  private listFromMemory(): StoredFile[] {
    return Array.from(this.memoryStorage.values());
  }

  private deleteFromMemory(id: string): boolean {
    return this.memoryStorage.delete(id);
  }

  private clearMemory(): void {
    this.memoryStorage.clear();
  }
}

// Create singleton instance
const tempStorage = new TempStorageManager();

// Export the singleton and class for testing
export { TempStorageManager };
export default tempStorage;


