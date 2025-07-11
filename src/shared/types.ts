// Wallet & Token Types
export interface WalletBalance {
  xfg: number;
  digm: number;
  para: number;
}

export interface XFGTransaction {
  txid: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  confirmed: boolean;
}

// Music & Content Types
export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  chunkCIDs: string[]; // ordered list of IPFS content IDs
  encryptionKey?: string; // AES key for encrypted chunks
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverArtCID: string;
  price: number; // in XFG
  tracks: Track[];
  artistAddress: string; // XFG address for payments
  manifest: AlbumManifest;
}

export interface AlbumManifest {
  version: string;
  albumId: string;
  signature: string; // Artist's signature
  createdAt: number;
  elderNodes: string[]; // List of hosting node addresses
}

// Mining & Rewards Types
export interface MinerStats {
  accepted: number;
  rejected: number;
  hashrate: number; // hashes per second
  threads: number;
  lastAcceptedAt?: number;
}

export interface MinerOptions {
  wallet: string;
  threads: number;
  poolUrl?: string;
}

export interface ParaRewards {
  listening: number; // para earned from listening time
  mining: number; // para earned from mining shares
  total: number;
  lastUpdated: number;
}

// Elder Node & Network Types
export interface ElderNode {
  id: string;
  address: string; // XFG address
  multiaddr: string; // libp2p multiaddress
  reputation: number;
  hostedAlbums: string[]; // Album IDs
  lastSeen: number;
}

export interface ChunkRequest {
  cid: string;
  albumId: string;
  trackIndex: number;
  chunkIndex: number;
}

// Platform State Types
export interface AppState {
  wallet: WalletBalance;
  currentTrack?: Track;
  currentAlbum?: Album;
  isPlaying: boolean;
  miner: MinerStats;
  rewards: ParaRewards;
  elderNodes: ElderNode[];
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Radio (Paradio) Types
export interface RadioTrack {
  trackId: string;
  albumId: string;
  artist: string;
  title: string;
  duration: number;
  rewardRate: number; // para per second
}

export interface RadioSession {
  sessionId: string;
  startTime: number;
  tracksPlayed: string[];
  paraEarned: number;
  minerShares: number;
} 