import CryptoJS from 'crypto-js';
import { gunStorage } from './gunStorage';
import { webTorrentClient } from './webtorrentClient';

/**
 * DIGM Audio Vault: GitHub + Elderfier Integration
 * 
 * Architecture:
 * 1. Audio files encrypted and stored on GitHub (public but useless)
 * 2. Elderfiers (staked validators) provide seeding and decryption services
 * 3. WebTorrent fallback for P2P distribution
 * 4. License-based access control via 0x0B transactions
 */

export interface ElderfierNode {
  elderfierID: string; // Custom 8-char ID (e.g., "FIRENODE")
  endpoint: string;
  feeAddress: string;
  stakeAmount: number; // 800 XFG deposit
  status: 'active' | 'inactive' | 'slashing';
  lastSeen: number;
  seedingCount: number;
  consensusRating: number; // 0-1 based on consensus participation
  services: {
    audioSeeding: boolean;
    decryption: boolean;
    torrentTracking: boolean;
  };
}

export interface EncryptedAudioRecord {
  trackId: string;
  albumId: string;
  githubUrl: string; // Public encrypted file
  encryptionKeyHash: string; // Hash of encryption key (for verification)
  contentHash: string; // SHA256 of original audio
  fileSize: number;
  uploadedAt: number;
  seedingElderfiers: string[]; // List of Elderfier IDs seeding this track
}

export interface AudioDecryptionRequest {
  trackId: string;
  userPublicKey: string;
  licenseProof: string; // 0x0B transaction hash proving license
  timestamp: number;
}

export interface AudioDecryptionResponse {
  success: boolean;
  decryptedUrl?: string; // Temporary URL for decrypted audio
  expiresAt?: number; // URL expiration timestamp
  elderfierID?: string; // Which Elderfier provided service
  error?: string;
}

export class ElderfierAudioVault {
  private elderfiers: Map<string, ElderfierNode> = new Map();
  private githubToken: string;
  private githubVaultUrl: string;

  constructor() {
    this.githubToken = import.meta.env.VITE_GITHUB_TOKEN || '';
    this.githubVaultUrl = import.meta.env.VITE_GITHUB_AUDIO_VAULT || 'https://github.com/digm/audio-vault/raw/main/';
  }

  async initialize(): Promise<void> {
    // Discover active Elderfiers from GUN
    await this.discoverElderfiers();
    
    // Subscribe to Elderfier status updates
    this.subscribeToElderfierUpdates();
    
    console.log(`Audio Vault initialized with ${this.elderfiers.size} Elderfiers`);
  }

  /**
   * Upload encrypted audio to GitHub + register with Elderfiers
   */
  async uploadEncryptedAudio(
    audioFile: File,
    albumId: string,
    trackId: string,
    artistPrivateKey: string
  ): Promise<EncryptedAudioRecord> {
    try {
      // 1. Generate track-specific encryption key
      const encryptionKey = this.generateTrackEncryptionKey(albumId, trackId, artistPrivateKey);
      
      // 2. Encrypt audio file
      const encryptedData = await this.encryptAudioFile(audioFile, encryptionKey);
      
      // 3. Upload to GitHub
      const fileName = `${albumId}_${trackId}.enc`;
      const githubUrl = await this.uploadToGitHub(encryptedData, fileName);
      
      // 4. Generate content hash
      const contentHash = await this.generateContentHash(audioFile);
      
      // 5. Create audio record
      const record: EncryptedAudioRecord = {
        trackId,
        albumId,
        githubUrl,
        encryptionKeyHash: CryptoJS.SHA256(encryptionKey).toString(),
        contentHash,
        fileSize: audioFile.size,
        uploadedAt: Date.now(),
        seedingElderfiers: []
      };

      // 6. Store record in GUN
      await gunStorage.gun.get('encrypted-audio').get(trackId).put(record);

      // 7. Request Elderfier seeding
      await this.requestElderfierSeeding(record);

      console.log(`Audio uploaded and encrypted: ${trackId}`);
      return record;

    } catch (error) {
      console.error('Failed to upload encrypted audio:', error);
      throw error;
    }
  }

  /**
   * Request decrypted audio playback (requires license)
   */
  async requestDecryptedAudio(
    trackId: string,
    userPublicKey: string,
    licenseTransactionHash: string
  ): Promise<AudioDecryptionResponse> {
    try {
      // 1. Validate license
      const isLicensed = await this.validateAlbumLicense(trackId, userPublicKey, licenseTransactionHash);
      if (!isLicensed) {
        return {
          success: false,
          error: 'No valid license found for this track'
        };
      }

      // 2. Get audio record
      const record = await this.getEncryptedAudioRecord(trackId);
      if (!record) {
        return {
          success: false,
          error: 'Audio record not found'
        };
      }

      // 3. Find available Elderfier for decryption
      const elderfier = await this.selectOptimalElderfier(record);
      if (!elderfier) {
        // Fallback to P2P if no Elderfiers available
        return await this.tryP2PFallback(record);
      }

      // 4. Request decryption from Elderfier
      const decryptionRequest: AudioDecryptionRequest = {
        trackId,
        userPublicKey,
        licenseProof: licenseTransactionHash,
        timestamp: Date.now()
      };

      const response = await this.requestElderfierDecryption(elderfier, decryptionRequest);
      return response;

    } catch (error) {
      console.error('Failed to request decrypted audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Discover and monitor Elderfiers
   */
  private async discoverElderfiers(): Promise<void> {
    try {
      await gunStorage.initialize();

      // Listen for Elderfier registrations
      gunStorage.gun.get('elderfiers').map().on((elderfier: any, elderfierID: string) => {
        if (elderfier && elderfierID !== '_') {
          const node: ElderfierNode = {
            elderfierID,
            endpoint: elderfier.endpoint,
            feeAddress: elderfier.feeAddress,
            stakeAmount: elderfier.stakeAmount || 800,
            status: elderfier.status,
            lastSeen: elderfier.lastSeen,
            seedingCount: elderfier.seedingCount || 0,
            consensusRating: elderfier.consensusRating || 0.5,
            services: elderfier.services || {
              audioSeeding: true,
              decryption: true,
              torrentTracking: true
            }
          };

          this.elderfiers.set(elderfierID, node);
          console.log(`Elderfier discovered: ${elderfierID} (${node.endpoint})`);
        }
      });

    } catch (error) {
      console.error('Failed to discover Elderfiers:', error);
    }
  }

  private subscribeToElderfierUpdates(): void {
    // Monitor Elderfier status changes
    setInterval(async () => {
      for (const [elderfierID, node] of this.elderfiers.entries()) {
        try {
          // Ping Elderfier to check status
          const response = await fetch(`${node.endpoint}/status`, { 
            timeout: 5000 
          });
          
          if (response.ok) {
            const status = await response.json();
            node.lastSeen = Date.now();
            node.status = 'active';
            node.seedingCount = status.seedingCount || 0;
          } else {
            node.status = 'inactive';
          }
        } catch (error) {
          node.status = 'inactive';
          console.warn(`Elderfier ${elderfierID} appears offline`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private generateTrackEncryptionKey(
    albumId: string, 
    trackId: string, 
    artistPrivateKey: string
  ): string {
    // Generate deterministic key from album + track + artist
    const keyMaterial = `${albumId}:${trackId}:${artistPrivateKey}:DIGM_AUDIO_VAULT`;
    return CryptoJS.SHA256(keyMaterial).toString();
  }

  private async encryptAudioFile(audioFile: File, encryptionKey: string): Promise<ArrayBuffer> {
    const arrayBuffer = await audioFile.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
    return new TextEncoder().encode(encrypted);
  }

  private async uploadToGitHub(encryptedData: ArrayBuffer, fileName: string): Promise<string> {
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
    
    const response = await fetch(`https://api.github.com/repos/digm/audio-vault/contents/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add encrypted audio: ${fileName}`,
        content: base64Data,
        branch: 'main'
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.content.download_url;
  }

  private async generateContentHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    return CryptoJS.SHA256(wordArray).toString();
  }

  private async requestElderfierSeeding(record: EncryptedAudioRecord): Promise<void> {
    // Notify Elderfiers about new content
    await gunStorage.gun.get('seeding-requests').get(record.trackId).put({
      trackId: record.trackId,
      albumId: record.albumId,
      githubUrl: record.githubUrl,
      requestedAt: Date.now(),
      status: 'pending',
      priority: 'normal'
    });

    console.log(`Seeding requested for track: ${record.trackId}`);
  }

  private async validateAlbumLicense(
    trackId: string,
    userPublicKey: string,
    licenseTransactionHash: string
  ): Promise<boolean> {
    try {
      // Get track info to find album
      const track = await gunStorage.getTrack(trackId);
      if (!track) return false;

      // Use existing license checker
      const { AlbumLicenseChecker } = await import('./licenseCheck');
      const licenseChecker = new AlbumLicenseChecker(gunStorage.gun);
      
      return await licenseChecker.hasLicense(userPublicKey, track.albumId);
    } catch (error) {
      console.error('License validation failed:', error);
      return false;
    }
  }

  private async getEncryptedAudioRecord(trackId: string): Promise<EncryptedAudioRecord | null> {
    return new Promise((resolve) => {
      gunStorage.gun.get('encrypted-audio').get(trackId).once((record: EncryptedAudioRecord) => {
        resolve(record || null);
      });
    });
  }

  private async selectOptimalElderfier(record: EncryptedAudioRecord): Promise<ElderfierNode | null> {
    const activeElderfiers = Array.from(this.elderfiers.values()).filter(e => 
      e.status === 'active' && 
      e.services.audioSeeding && 
      e.services.decryption
    );

    if (activeElderfiers.length === 0) return null;

    // Select based on consensus rating and availability
    activeElderfiers.sort((a, b) => {
      const scoreA = a.consensusRating * (1 - a.seedingCount / 1000); // Prefer less busy
      const scoreB = b.consensusRating * (1 - b.seedingCount / 1000);
      return scoreB - scoreA;
    });

    return activeElderfiers[0];
  }

  private async requestElderfierDecryption(
    elderfier: ElderfierNode,
    request: AudioDecryptionRequest
  ): Promise<AudioDecryptionResponse> {
    try {
      const response = await fetch(`${elderfier.endpoint}/decrypt-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.licenseProof}`
        },
        body: JSON.stringify(request),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Elderfier request failed: ${response.statusText}`);
      }

      const result: AudioDecryptionResponse = await response.json();
      result.elderfierID = elderfier.elderfierID;
      
      return result;

    } catch (error) {
      console.error(`Elderfier ${elderfier.elderfierID} request failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Elderfier request failed'
      };
    }
  }

  private async tryP2PFallback(record: EncryptedAudioRecord): Promise<AudioDecryptionResponse> {
    try {
      // Try WebTorrent fallback if available
      const track = await gunStorage.getTrack(record.trackId);
      if (track?.magnetURI) {
        const torrent = await webTorrentClient.addTorrent(track.magnetURI);
        
        if (torrent.files.length > 0) {
          // Create temporary blob URL
          const audioFile = torrent.files[0];
          const chunks: Uint8Array[] = [];
          
          return new Promise((resolve) => {
            audioFile.createReadStream().on('data', (chunk: Uint8Array) => {
              chunks.push(chunk);
            }).on('end', () => {
              const blob = new Blob(chunks, { type: 'audio/mpeg' });
              const url = URL.createObjectURL(blob);
              
              resolve({
                success: true,
                decryptedUrl: url,
                expiresAt: Date.now() + 3600000, // 1 hour
                elderfierID: 'P2P_FALLBACK'
              });
            });
          });
        }
      }

      return {
        success: false,
        error: 'No P2P fallback available'
      };

    } catch (error) {
      return {
        success: false,
        error: `P2P fallback failed: ${error}`
      };
    }
  }

  /**
   * Get network status and statistics
   */
  async getNetworkStatus(): Promise<{
    elderfiers: {
      total: number;
      active: number;
      inactive: number;
    };
    storage: {
      githubVault: boolean;
      encryptedTracks: number;
    };
    services: {
      seeding: boolean;
      decryption: boolean;
    };
  }> {
    const elderfierList = Array.from(this.elderfiers.values());
    const encryptedTracks = await this.getEncryptedTrackCount();

    return {
      elderfiers: {
        total: elderfierList.length,
        active: elderfierList.filter(e => e.status === 'active').length,
        inactive: elderfierList.filter(e => e.status === 'inactive').length
      },
      storage: {
        githubVault: !!this.githubToken,
        encryptedTracks
      },
      services: {
        seeding: elderfierList.some(e => e.services.audioSeeding),
        decryption: elderfierList.some(e => e.services.decryption)
      }
    };
  }

  private async getEncryptedTrackCount(): Promise<number> {
    return new Promise((resolve) => {
      let count = 0;
      gunStorage.gun.get('encrypted-audio').map().once((record: any) => {
        if (record) count++;
      });
      setTimeout(() => resolve(count), 1000);
    });
  }

  /**
   * Cleanup expired decryption URLs
   */
  cleanup(): void {
    // This would be called periodically to revoke expired URLs
    // Implementation depends on how temporary URLs are managed
  }
}

// Export singleton instance
export const elderfierAudioVault = new ElderfierAudioVault();

export default elderfierAudioVault;
