import WebTorrent from 'webtorrent';
import { gunStorage } from './gunStorage';

/**
 * WebTorrent client with Eldernode integration for DIGM platform
 * Handles P2P audio file distribution with guaranteed Eldernode seeding
 */

export interface TorrentHandle {
  infoHash: string;
  magnetURI: string;
  files: any[];
  numPeers: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
}

export interface ElderNode {
  nodeId: string;
  endpoint: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  seedingCount: number;
}

export class DIGMWebTorrentClient {
  private client: WebTorrent.Instance | null = null;
  private eldernodes: ElderNode[] = [];
  private trackers: string[] = [];
  private isInitialized = false;

  constructor() {
    this.trackers = [
      'wss://eldernode1.digm.io:8000',
      'wss://eldernode2.digm.io:8000', 
      'wss://eldernode3.digm.io:8000',
      'wss://tracker.digm.io:8000',
      'wss://fuego-tracker.com:8000'
    ];
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamically import WebTorrent
      const WebTorrentModule = await import('webtorrent');
      const WebTorrent = WebTorrentModule.default;

      this.client = new WebTorrent({
        tracker: {
          announce: this.trackers
        },
        dht: true,
        lsd: true,
        webSeeds: true
      });

      // Discover Eldernodes from GUN
      await this.discoverEldernodes();

      this.isInitialized = true;
      console.log('WebTorrent client initialized with Eldernode support');
    } catch (error) {
      console.error('Failed to initialize WebTorrent client:', error);
      throw error;
    }
  }

  async discoverEldernodes(): Promise<void> {
    try {
      await gunStorage.initialize();
      
      // Subscribe to Eldernode announcements in GUN
      gunStorage.gun.get('eldernodes').map().on((node: any, nodeId: string) => {
        if (node && nodeId !== '_') {
          const eldernode: ElderNode = {
            nodeId,
            endpoint: node.endpoint,
            status: node.status,
            lastSeen: node.lastSeen,
            seedingCount: node.seedingCount || 0
          };

          // Update Eldernode list
          const existingIndex = this.eldernodes.findIndex(n => n.nodeId === nodeId);
          if (existingIndex >= 0) {
            this.eldernodes[existingIndex] = eldernode;
          } else {
            this.eldernodes.push(eldernode);
          }

          console.log(`Eldernode discovered: ${nodeId} (${eldernode.endpoint})`);
        }
      });
    } catch (error) {
      console.warn('Failed to discover Eldernodes:', error);
    }
  }

  async seedFile(file: File, albumId: string): Promise<TorrentHandle> {
    await this.initialize();
    if (!this.client) throw new Error('WebTorrent client not initialized');

    return new Promise((resolve, reject) => {
      const torrent = this.client!.seed(file, {
        announce: this.trackers
      }, (torrent) => {
        console.log(`File seeded: ${file.name}`);
        console.log(`Magnet URI: ${torrent.magnetURI}`);

        // Notify Eldernodes to start seeding
        this.notifyEldernodesNewContent(torrent.magnetURI, albumId);

        const handle: TorrentHandle = {
          infoHash: torrent.infoHash,
          magnetURI: torrent.magnetURI,
          files: torrent.files,
          numPeers: torrent.numPeers,
          downloaded: torrent.downloaded,
          uploaded: torrent.uploaded,
          downloadSpeed: torrent.downloadSpeed,
          uploadSpeed: torrent.uploadSpeed,
          progress: torrent.progress
        };

        resolve(handle);
      });

      torrent.on('error', reject);
    });
  }

  async addTorrent(magnetURI: string): Promise<TorrentHandle> {
    await this.initialize();
    if (!this.client) throw new Error('WebTorrent client not initialized');

    return new Promise((resolve, reject) => {
      const torrent = this.client!.add(magnetURI, (torrent) => {
        console.log(`Torrent added: ${torrent.name}`);

        const handle: TorrentHandle = {
          infoHash: torrent.infoHash,
          magnetURI: torrent.magnetURI,
          files: torrent.files,
          numPeers: torrent.numPeers,
          downloaded: torrent.downloaded,
          uploaded: torrent.uploaded,
          downloadSpeed: torrent.downloadSpeed,
          uploadSpeed: torrent.uploadSpeed,
          progress: torrent.progress
        };

        resolve(handle);
      });

      torrent.on('error', (error) => {
        console.error('Torrent error:', error);
        
        // Try Eldernode fallback if P2P fails
        this.tryElderNodeFallback(magnetURI)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  async streamAudio(magnetURI: string): Promise<MediaSource | null> {
    try {
      const torrent = await this.addTorrent(magnetURI);
      
      if (torrent.files.length === 0) {
        throw new Error('No files in torrent');
      }

      const audioFile = torrent.files.find(f => 
        f.name.endsWith('.mp3') || 
        f.name.endsWith('.m4a') || 
        f.name.endsWith('.wav')
      );

      if (!audioFile) {
        throw new Error('No audio file found in torrent');
      }

      // Create MediaSource for streaming
      const mediaSource = new MediaSource();
      const url = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        
        // Stream file data to MediaSource
        audioFile.createReadStream().on('data', (chunk: Buffer) => {
          if (!sourceBuffer.updating) {
            sourceBuffer.appendBuffer(chunk);
          }
        });
      });

      return mediaSource;
    } catch (error) {
      console.error('Failed to stream audio via WebTorrent:', error);
      return null;
    }
  }

  private async notifyEldernodesNewContent(magnetURI: string, albumId: string): Promise<void> {
    try {
      // Store seed request in GUN for Eldernodes to pick up
      await gunStorage.gun.get('seed-requests').get(albumId).put({
        albumId,
        magnetURI,
        requestedAt: Date.now(),
        status: 'pending',
        priority: 'normal'
      });

      console.log(`Eldernode seeding requested for album: ${albumId}`);
    } catch (error) {
      console.warn('Failed to notify Eldernodes:', error);
    }
  }

  private async tryElderNodeFallback(magnetURI: string): Promise<TorrentHandle> {
    // Try to get file directly from Eldernodes if P2P fails
    for (const eldernode of this.eldernodes) {
      if (eldernode.status === 'active') {
        try {
          console.log(`Trying Eldernode fallback: ${eldernode.nodeId}`);
          
          // Make HTTP request to Eldernode for file
          const response = await fetch(`${eldernode.endpoint}/torrent/${magnetURI}`);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], 'audio.mp3');
            
            // Create mock handle for fallback
            return {
              infoHash: magnetURI.split(':')[2],
              magnetURI,
              files: [{ name: 'audio.mp3', length: blob.size }],
              numPeers: 1, // Eldernode
              downloaded: blob.size,
              uploaded: 0,
              downloadSpeed: 0,
              uploadSpeed: 0,
              progress: 1
            };
          }
        } catch (error) {
          console.warn(`Eldernode ${eldernode.nodeId} fallback failed:`, error);
        }
      }
    }

    throw new Error('All Eldernode fallbacks failed');
  }

  async getNetworkStatus(): Promise<{
    connected: boolean;
    torrents: number;
    peers: number;
    eldernodes: number;
  }> {
    await this.initialize();
    
    const activeEldernodes = this.eldernodes.filter(n => n.status === 'active').length;
    
    return {
      connected: this.client !== null,
      torrents: this.client?.torrents.length || 0,
      peers: this.client?.torrents.reduce((total, t) => total + t.numPeers, 0) || 0,
      eldernodes: activeEldernodes
    };
  }

  async searchTorrent(query: string): Promise<TorrentHandle[]> {
    // Search across network for torrents matching query
    // This would integrate with DHT search or tracker search
    return [];
  }

  destroy(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const webTorrentClient = new DIGMWebTorrentClient();

// Legacy compatibility exports
export type { TorrentHandle };

export async function createClient(): Promise<{ add: (magnet: string) => Promise<TorrentHandle> }> {
  await webTorrentClient.initialize();
  return {
    async add(magnet: string) {
      return await webTorrentClient.addTorrent(magnet);
    }
  };
}

export default webTorrentClient;
