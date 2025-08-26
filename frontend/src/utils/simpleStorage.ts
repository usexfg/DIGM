// Simple Temporary Storage for DIGM Platform - Phase 1/2
// Basic storage solution until P2P nodes are ready

export interface SimpleFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string; // Blob URL
  uploadedAt: Date;
  metadata?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    artist?: string;
    title?: string;
    genre?: string;
    price?: number;
  };
}

class SimpleStorage {
  private files = new Map<string, SimpleFile>();
  private maxFiles = 50;
  private maxTotalSize = 100 * 1024 * 1024; // 100MB
  private currentSize = 0;

  // Store a file and return blob URL
  async storeFile(file: File, metadata?: SimpleFile['metadata']): Promise<string> {
    // Check limits
    if (this.files.size >= this.maxFiles) {
      this.removeOldestFile();
    }

    if (this.currentSize + file.size > this.maxTotalSize) {
      this.makeSpace(file.size);
    }

    // Create blob URL
    const url = URL.createObjectURL(file);
    const id = this.generateId();

    const simpleFile: SimpleFile = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      uploadedAt: new Date(),
      metadata
    };

    this.files.set(id, simpleFile);
    this.currentSize += file.size;

    console.log(`Stored file: ${file.name} (${this.formatSize(file.size)})`);
    return id;
  }

  // Get file by ID
  getFile(id: string): SimpleFile | null {
    return this.files.get(id) || null;
  }

  // Get file URL
  getFileURL(id: string): string | null {
    const file = this.files.get(id);
    return file ? file.url : null;
  }

  // List all files
  listFiles(): SimpleFile[] {
    return Array.from(this.files.values()).sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  // Delete file
  deleteFile(id: string): boolean {
    const file = this.files.get(id);
    if (!file) return false;

    // Clean up blob URL
    URL.revokeObjectURL(file.url);
    
    this.files.delete(id);
    this.currentSize -= file.size;
    
    console.log(`Deleted file: ${file.name}`);
    return true;
  }

  // Get storage stats
  getStats() {
    return {
      totalFiles: this.files.size,
      totalSize: this.currentSize,
      maxFiles: this.maxFiles,
      maxSize: this.maxTotalSize,
      availableSpace: this.maxTotalSize - this.currentSize
    };
  }

  // Clear all files
  clearAll(): void {
    // Clean up all blob URLs
    this.files.forEach(file => {
      URL.revokeObjectURL(file.url);
    });
    
    this.files.clear();
    this.currentSize = 0;
    console.log('Cleared all files');
  }

  // Private helper methods
  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private removeOldestFile(): void {
    const oldest = Array.from(this.files.values()).sort((a, b) => 
      a.uploadedAt.getTime() - b.uploadedAt.getTime()
    )[0];
    
    if (oldest) {
      this.deleteFile(oldest.id);
    }
  }

  private makeSpace(neededSize: number): void {
    const files = Array.from(this.files.values()).sort((a, b) => 
      a.uploadedAt.getTime() - b.uploadedAt.getTime()
    );

    for (const file of files) {
      if (this.currentSize + neededSize <= this.maxTotalSize) {
        break;
      }
      this.deleteFile(file.id);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
const simpleStorage = new SimpleStorage();

export default simpleStorage;
