import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';

/**
 * GUN P2P Database for DIGM Platform
 * Handles: Album metadata, preview audio, user data, real-time sync
 */

export interface Album {
  albumId: string;
  title: string;
  artistName: string;
  artistId: string;
  description?: string;
  releaseDate: string;
  genre: string[];
  priceXFG: number;
  coverImage?: string; // Base64 small cover (<50KB)
  paradioPreviewTrackIds: string[];
  payment: {
    paymentCode: string; // BIP47-style
    artistKey: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Track {
  trackId: string;
  albumId: string;
  title: string;
  durationSec: number;
  isPreview: boolean;
  previewAudio?: string; // Base64 30-60s clip for previews only
  magnetURI?: string; // WebTorrent magnet link for full track
  contentHash: string; // SHA256 of full audio file
  fileSize: number; // bytes
  createdAt: number;
}

export interface UserPlaylist {
  playlistId: string;
  userId: string;
  title: string;
  description?: string;
  trackIds: string[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserInteraction {
  userId: string;
  albumId?: string;
  trackId?: string;
  action: 'like' | 'play' | 'purchase' | 'share';
  timestamp: number;
  metadata?: any;
}

export class GUNStorageManager {
  private gun: any;
  private user: any;
  private isInitialized = false;

  constructor(peers?: string[]) {
    const defaultPeers = [
      'wss://gun1.digm.io/gun',
      'wss://gun2.digm.io/gun',
      'wss://gun3.digm.io/gun'
    ];

    this.gun = Gun({
      peers: peers || defaultPeers,
      localStorage: true,
      radisk: true,
      // Storage optimizations
      chunk: 1000,
      until: 100
    });

    this.user = this.gun.user();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test connection to GUN network
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('GUN connection timeout')), 5000);
        
        this.gun.get('_test').once((data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
        
        // Trigger test
        this.gun.get('_test').put({ ping: Date.now() });
      });

      this.isInitialized = true;
      console.log('GUN storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GUN storage:', error);
      throw error;
    }
  }

  /**
   * Album Management
   */
  async storeAlbum(album: Album): Promise<void> {
    await this.initialize();

    const albumData = {
      ...album,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      this.gun.get('albums').get(album.albumId).put(albumData, (ack: any) => {
        if (ack.err) {
          reject(new Error(`Failed to store album: ${ack.err}`));
        } else {
          console.log(`Album stored: ${album.title}`);
          resolve();
        }
      });
    });
  }

  async getAlbum(albumId: string): Promise<Album | null> {
    await this.initialize();

    return new Promise((resolve) => {
      this.gun.get('albums').get(albumId).once((album: Album) => {
        resolve(album || null);
      });
    });
  }

  async getAllAlbums(): Promise<Album[]> {
    await this.initialize();

    return new Promise((resolve) => {
      const albums: Album[] = [];
      
      this.gun.get('albums').map().once((album: Album, albumId: string) => {
        if (album && albumId !== '_') {
          albums.push(album);
        }
      });

      // Give time for all albums to load
      setTimeout(() => resolve(albums), 1000);
    });
  }

  /**
   * Track Management
   */
  async storeTrack(track: Track): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.gun.get('tracks').get(track.trackId).put(track, (ack: any) => {
        if (ack.err) {
          reject(new Error(`Failed to store track: ${ack.err}`));
        } else {
          console.log(`Track stored: ${track.title}`);
          resolve();
        }
      });
    });
  }

  async getTrack(trackId: string): Promise<Track | null> {
    await this.initialize();

    return new Promise((resolve) => {
      this.gun.get('tracks').get(trackId).once((track: Track) => {
        resolve(track || null);
      });
    });
  }

  async getAlbumTracks(albumId: string): Promise<Track[]> {
    await this.initialize();

    return new Promise((resolve) => {
      const tracks: Track[] = [];
      
      this.gun.get('tracks').map().once((track: Track, trackId: string) => {
        if (track && track.albumId === albumId && trackId !== '_') {
          tracks.push(track);
        }
      });

      setTimeout(() => {
        // Sort by track order or creation time
        tracks.sort((a, b) => a.createdAt - b.createdAt);
        resolve(tracks);
      }, 500);
    });
  }

  /**
   * Preview Audio Management (stored directly in GUN)
   */
  async storePreviewAudio(trackId: string, audioBase64: string): Promise<void> {
    await this.initialize();

    // Validate size (should be <1MB for 30-60s clip)
    const sizeBytes = (audioBase64.length * 3) / 4; // Rough base64 to bytes
    if (sizeBytes > 1024 * 1024) {
      throw new Error('Preview audio too large (>1MB). Use shorter clip.');
    }

    return new Promise((resolve, reject) => {
      this.gun.get('previews').get(trackId).put({
        trackId,
        audioData: audioBase64,
        size: sizeBytes,
        storedAt: Date.now()
      }, (ack: any) => {
        if (ack.err) {
          reject(new Error(`Failed to store preview: ${ack.err}`));
        } else {
          console.log(`Preview audio stored for track: ${trackId}`);
          resolve();
        }
      });
    });
  }

  async getPreviewAudio(trackId: string): Promise<string | null> {
    await this.initialize();

    return new Promise((resolve) => {
      this.gun.get('previews').get(trackId).once((preview: any) => {
        resolve(preview?.audioData || null);
      });
    });
  }

  /**
   * User Management
   */
  async authenticateUser(username: string, password: string): Promise<boolean> {
    await this.initialize();

    return new Promise((resolve) => {
      this.user.auth(username, password, (ack: any) => {
        if (ack.err) {
          console.error('Authentication failed:', ack.err);
          resolve(false);
        } else {
          console.log('User authenticated successfully');
          resolve(true);
        }
      });
    });
  }

  async createUser(username: string, password: string): Promise<boolean> {
    await this.initialize();

    return new Promise((resolve) => {
      this.user.create(username, password, (ack: any) => {
        if (ack.err) {
          console.error('User creation failed:', ack.err);
          resolve(false);
        } else {
          console.log('User created successfully');
          resolve(true);
        }
      });
    });
  }

  /**
   * Playlist Management
   */
  async storePlaylist(playlist: UserPlaylist): Promise<void> {
    await this.initialize();

    if (!this.user.is) {
      throw new Error('User must be authenticated to store playlists');
    }

    return new Promise((resolve, reject) => {
      this.user.get('playlists').get(playlist.playlistId).put(playlist, (ack: any) => {
        if (ack.err) {
          reject(new Error(`Failed to store playlist: ${ack.err}`));
        } else {
          console.log(`Playlist stored: ${playlist.title}`);
          resolve();
        }
      });
    });
  }

  async getUserPlaylists(userId: string): Promise<UserPlaylist[]> {
    await this.initialize();

    return new Promise((resolve) => {
      const playlists: UserPlaylist[] = [];
      
      this.gun.get('users').get(userId).get('playlists').map().once((playlist: UserPlaylist) => {
        if (playlist) {
          playlists.push(playlist);
        }
      });

      setTimeout(() => resolve(playlists), 500);
    });
  }

  /**
   * Real-time Subscriptions
   */
  subscribeToAlbums(callback: (album: Album, albumId: string) => void): () => void {
    const unsubscribe = this.gun.get('albums').map().on((album: Album, albumId: string) => {
      if (album && albumId !== '_') {
        callback(album, albumId);
      }
    });

    return () => unsubscribe.off();
  }

  subscribeToTrack(trackId: string, callback: (track: Track) => void): () => void {
    const unsubscribe = this.gun.get('tracks').get(trackId).on((track: Track) => {
      if (track) {
        callback(track);
      }
    });

    return () => unsubscribe.off();
  }

  /**
   * User Interactions (likes, plays, etc.)
   */
  async recordInteraction(interaction: UserInteraction): Promise<void> {
    await this.initialize();

    const interactionId = `${interaction.userId}_${interaction.action}_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      this.gun.get('interactions').get(interactionId).put(interaction, (ack: any) => {
        if (ack.err) {
          reject(new Error(`Failed to record interaction: ${ack.err}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Search and Discovery
   */
  async searchAlbums(query: string): Promise<Album[]> {
    const allAlbums = await this.getAllAlbums();
    const queryLower = query.toLowerCase();

    return allAlbums.filter(album => 
      album.title.toLowerCase().includes(queryLower) ||
      album.artistName.toLowerCase().includes(queryLower) ||
      album.genre.some(g => g.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Cache Management
   */
  clearLocalCache(): void {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('gun/')) {
          localStorage.removeItem(key);
        }
      });
    }
    console.log('GUN local cache cleared');
  }

  /**
   * Network Status
   */
  getNetworkStatus(): Promise<{ connected: boolean; peers: number }> {
    return new Promise((resolve) => {
      const peers = this.gun.back('opt.peers') || {};
      const peerCount = Object.keys(peers).length;
      
      resolve({
        connected: peerCount > 0,
        peers: peerCount
      });
    });
  }

  /**
   * Content Validation
   */
  async validateContentHash(trackId: string, expectedHash: string): Promise<boolean> {
    const track = await this.getTrack(trackId);
    return track?.contentHash === expectedHash;
  }

  /**
   * Utility Functions
   */
  static compressImage(imageFile: File, maxSizeKB: number = 50): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions to stay under size limit
        const ratio = Math.min(200 / img.width, 200 / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Try different quality levels to meet size requirement
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        while (dataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  }

  static createPreviewClip(audioFile: File, startSec: number = 30, durationSec: number = 30): Promise<string> {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const sampleRate = audioBuffer.sampleRate;
          const startSample = startSec * sampleRate;
          const endSample = (startSec + durationSec) * sampleRate;
          
          const previewBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            endSample - startSample,
            sampleRate
          );

          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            const previewData = previewBuffer.getChannelData(channel);
            
            for (let i = 0; i < previewBuffer.length; i++) {
              previewData[i] = channelData[startSample + i] || 0;
            }
          }

          // Convert to base64 (simplified - would need proper encoding)
          const base64Preview = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 100000))));
          resolve(base64Preview);
          
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(audioFile);
    });
  }
}

// Export singleton instance
export const gunStorage = new GUNStorageManager();

export default gunStorage;
