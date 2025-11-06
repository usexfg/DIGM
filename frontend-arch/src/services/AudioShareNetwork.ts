import { AlbumLicenseChecker } from '../utils/licenseCheck';
import { FuegoRPCClient } from '../utils/fuegoRPC';

export interface AudioSharePeer {
  peerId: string;
  address: string;
  port: number;
  sharedFiles: number;
  onlineStatus: boolean;
  lastSeen: number;
  bandwidth: number;
  xfgBalance?: number;
  paraBalance?: number;
  reputation?: number;
}

export interface AudioFileShare {
  filename: string;
  size: number;
  bitrate?: number;
  duration?: number;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  contentHash: string;
  magnetUri?: string;
  priceXFG?: number;
  isPaidContent: boolean;
  albumId?: string;  // Add albumId for license verification
  distributionAllowed: boolean;  // Explicit flag for distribution
}

export class AudioShareNetwork {
  private peers: Map<string, AudioSharePeer> = new Map();
  private sharedLibrary: AudioFileShare[] = [];
  private connection: WebSocket | null = null;
  private licenseChecker: AlbumLicenseChecker;

  private readonly MESSAGE_TYPES = {
    LOGIN: 1,
    GET_PEER_ADDRESS: 2,
    GET_SHARED_FILES: 3,
    SEARCH_REQUEST: 4,
    SEARCH_RESPONSE: 5,
    DOWNLOAD_REQUEST: 6,
    DOWNLOAD_RESPONSE: 7,
    CHAT_MESSAGE: 8,
    USER_INFO: 9,
    WALLET_VERIFY: 10,
    PARA_REWARD: 11,
    LICENSE_CHECK: 12,
    DISTRIBUTION_DENIED: 13,
    REDISTRIBUTION_ATTEMPT: 14  // New message type for redistribution attempts
  };

  constructor(
    private readonly trackerUrl: string = 'wss://tracker.audioshare.net/p2p',
    private readonly userId: string,
    fuegoRPC?: FuegoRPCClient
  ) {
    // Use provided RPC client or create a default mock one
    const rpcClient = fuegoRPC || new FuegoRPCClient();
    this.licenseChecker = new AlbumLicenseChecker(rpcClient);
  }

  // Enhanced content protection with blockchain license verification
  private async verifyContentDistributionRights(
    file: AudioFileShare
  ): Promise<boolean> {
    // Completely prevent distribution of paid content
    if (!file.isPaidContent) {
      // Only allow free/preview content to be shared
      return true;
    }

    // For paid content, check if user has a valid license or premium access
    if (!file.albumId) {
      console.warn(`No albumId for paid content: ${file.filename}`);
      return false;
    }

    try {
      // Use comprehensive access check from license system
      const accessInfo = await this.licenseChecker.getUserAccessInfo(
        this.userId, 
        file.albumId
      );

      if (!accessInfo.hasAccess) {
        console.warn(`No access rights for album: ${file.albumId}`);
        return false;
      }

      // Explicitly prevent redistribution of licensed content
      return false;
    } catch (error) {
      console.error('License verification failed:', error);
      return false;
    }
  }

  async connect(sharedFiles: AudioFileShare[]): Promise<void> {
    const shareableFiles: AudioFileShare[] = [];
    
    // Filter files based on distribution rights
    for (const file of sharedFiles) {
      const canShare = await this.verifyContentDistributionRights(file);
      if (canShare) {
        // Explicitly mark as distribution allowed
        file.distributionAllowed = true;
        shareableFiles.push(file);
      }
    }
    
    // Actual WebSocket connection logic
    this.connection = new WebSocket(this.trackerUrl);
    
    this.connection.onopen = () => {
      this.sendMessage({
        type: this.MESSAGE_TYPES.LOGIN,
        userId: this.userId,
        fileCount: shareableFiles.length,
        client: 'AudioShare/1.0'
      });
    };

    this.connection.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.connection.onclose = () => {
      console.log('AudioShare network connection closed');
    };

    // Store shareable content
    this.sharedLibrary = shareableFiles;
  }

  async requestDownload(
    peerId: string, 
    filename: string
  ): Promise<Blob | null> {
    // Find the file in shared library
    const file = this.sharedLibrary.find(f => f.filename === filename);
    
    if (!file) {
      console.warn('File not found in shared library');
      return null;
    }
    
    // Verify distribution rights before download
    const canDownload = await this.verifyContentDistributionRights(file);
    
    if (!canDownload) {
      // Send a distribution denial message
      this.sendMessage({
        type: this.MESSAGE_TYPES.DISTRIBUTION_DENIED,
        filename,
        reason: 'Purchased content cannot be distributed',
        albumId: file.albumId
      });

      // Log redistribution attempt
      this.sendMessage({
        type: this.MESSAGE_TYPES.REDISTRIBUTION_ATTEMPT,
        filename,
        albumId: file.albumId,
        userId: this.userId
      });

      console.warn('Download not authorized: Purchased content cannot be shared');
      return null;
    }
    
    // Proceed with download if authorized
    this.sendMessage({
      type: this.MESSAGE_TYPES.DOWNLOAD_REQUEST,
      peerId,
      filename
    });

    return new Promise((resolve, reject) => {
      // Implement WebRTC or secure download mechanism
      // Verify license at download time
      resolve(null);
    });
  }

  sendMessage(message: any): void {
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify(message));
    }
  }

  async searchFiles(query: string, timeout: number = 10000): Promise<Map<string, AudioFileShare[]>> {
    const searchId = Math.random().toString(36).substr(2, 9);
    
    this.sendMessage({
      type: this.MESSAGE_TYPES.SEARCH_REQUEST,
      searchId,
      query,
      timeout
    });

    return new Promise((resolve) => {
      const results: Map<string, AudioFileShare[]> = new Map();
      
      setTimeout(() => resolve(results), timeout);
      
      // Results will be populated via search response messages
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case this.MESSAGE_TYPES.SEARCH_RESPONSE:
        this.handleSearchResponse(message);
        break;
      case this.MESSAGE_TYPES.DOWNLOAD_RESPONSE:
        this.handleDownloadResponse(message);
        break;
      case this.MESSAGE_TYPES.USER_INFO:
        this.handleUserInfo(message);
        break;
      case this.MESSAGE_TYPES.CHAT_MESSAGE:
        this.handleChatMessage(message);
        break;
      case this.MESSAGE_TYPES.PARA_REWARD:
        this.handleParaReward(message);
        break;
      case this.MESSAGE_TYPES.DISTRIBUTION_DENIED:
        this.handleDistributionDenied(message);
        break;
      case this.MESSAGE_TYPES.REDISTRIBUTION_ATTEMPT:
        this.handleRedistributionAttempt(message);
        break;
    }
  }

  private handleSearchResponse(message: any): void {
    // Process search results from peers
    const { searchId, results, peerId } = message;
    // Store results for the search promise
  }

  private handleDownloadResponse(message: any): void {
    // Handle download response from peers
  }

  private handleUserInfo(message: any): void {
    // Handle user info exchange
  }

  private handleChatMessage(message: any): void {
    // Handle chat messages
  }

  private handleParaReward(message: any): void {
    // Handle PARA token rewards for sharing files
    const { amount, reason, fromPeer } = message;
    console.log(`Received ${amount} PARA for ${reason} from ${fromPeer}`);
  }

  private handleDistributionDenied(message: any): void {
    // Handle distribution denial messages
    console.warn(`Distribution denied: ${message.filename} - ${message.reason}`);
  }

  private handleRedistributionAttempt(message: any): void {
    // Log and potentially penalize redistribution attempts
    console.warn(`Redistribution attempt detected: 
      Filename: ${message.filename}, 
      Album: ${message.albumId}, 
      User: ${message.userId}`);
    
    // Potential future actions:
    // - Report to platform
    // - Temporary network ban
    // - Reduce user reputation
  }

  // Placeholder methods for additional functionality
  private getShareRatio(): number {
    const uploaded = 0; // Track bytes uploaded
    const downloaded = 0; // Track bytes downloaded
    return uploaded / Math.max(downloaded, 1);
  }

  private getPeerStats(): AudioSharePeer[] {
    return Array.from(this.peers.values());
  }
}

export const createAudioShareIntegration = (userId: string) => {
  const network = new AudioShareNetwork(undefined, userId);
  
  const shareAudioLibrary = async () => {
    const albums: any[] = []; // Placeholder for actual album data
    const files: AudioFileShare[] = [];
    
    albums.forEach(album => {
      album.tracks.forEach((track: any) => {
        files.push({
          filename: `${album.artist} - ${track.title}.mp3`,
          size: track.fileSize || 0,
          bitrate: 320,
          duration: track.duration,
          artist: album.artist,
          album: album.title,
          genre: album.genre,
          year: album.year,
          contentHash: track.contentHash || '',
          magnetUri: track.magnetUri,
          priceXFG: track.priceXFG,
          isPaidContent: !!track.priceXFG,
          albumId: album.albumId,  // Add albumId for license verification
          distributionAllowed: !track.priceXFG  // Only allow free/preview content
        });
      });
    });
    
    await network.connect(files);
  };
  
  return {
    network,
    shareAudioLibrary,
    search: network.searchFiles.bind(network),
    download: network.requestDownload.bind(network)
  };
};
