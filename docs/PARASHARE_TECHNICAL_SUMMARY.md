# Parashare/DIGM P2P Network: Technical Summary

## Executive Summary

**Parashare** is a privacy-focused P2P audio sharing network that combines:
- **DarkMX-inspired Tor architecture** for anonymous file sharing
- **μTP protocol** for bandwidth-efficient transfers
- **Fuego blockchain integration** for monetization and licensing
- **CryptoNote encryption** for content protection

**Result:** A zero-cost, privacy-first music economy where artists monetize directly and users share freely—all through Tor hidden services with blockchain-verified licensing.

## Architecture Decision Tree

```
Question 1: How to ensure user privacy?
├─ Option A: Traditional P2P (IP exposed) ❌
├─ Option B: IPFS (IP leakage) ❌
└─ Option C: Tor Hidden Services (complete anonymity) ✅

Question 2: How to optimize bandwidth?
├─ Option A: TCP (can saturate connection) ❌
├─ Option B: Plain UDP (no congestion control) ❌
└─ Option C: μTP with LEDBAT (yields to interactive traffic) ✅

Question 3: How to monetize content?
├─ Option A: Central payment processor ❌
├─ Option B: Traditional cryptocurrency ⚠️
└─ Option C: Fuego blockchain (privacy + licensing) ✅

Question 4: How to discover peers?
├─ Option A: Central tracker server ❌
├─ Option B: DHT only ⚠️
└─ Option C: Bootstrap + Peer Exchange + DHT ✅
```

## Network Stack

### Layer 1: Tor Foundation
```
┌─────────────────────────────────────┐
│   DIGM Node (.onion address)        │
│                                     │
│   Capabilities:                     │
│   - Anonymous by default            │
│   - No port forwarding needed       │
│   - Censorship resistant            │
│   - Zero infrastructure cost        │
└─────────────────────────────────────┘
          ↓ (Tor circuits)
┌─────────────────────────────────────┐
│   Tor Network (3-hop routing)       │
│                                     │
│   - Entry node                      │
│   - Middle node                     │
│   - Exit/Rendezvous node            │
└─────────────────────────────────────┘
```

### Layer 2: Transport Optimization
```
┌─────────────────────────────────────┐
│   μTP (Micro Transport Protocol)    │
│                                     │
│   Features:                         │
│   - LEDBAT congestion control       │
│   - Yields to interactive traffic   │
│   - UDP-based for efficiency        │
│   - Chunked transfers               │
└─────────────────────────────────────┘
          ↓ (over Tor circuits)
┌─────────────────────────────────────┐
│   CryptoNote Encryption Layer       │
│                                     │
│   - End-to-end encryption           │
│   - Content verification (SHA-256)  │
│   - Anti-tampering                  │
└─────────────────────────────────────┘
```

### Layer 3: Application Layer
```
┌─────────────────────────────────────┐
│   Parashare P2P Protocol            │
│                                     │
│   Components:                       │
│   - File indexing                   │
│   - Search/discovery                │
│   - Chat/messaging                  │
│   - Reputation system               │
└─────────────────────────────────────┘
          ↓ (on-demand)
┌─────────────────────────────────────┐
│   Fuego Blockchain Interface        │
│                                     │
│   - Album registration (0x0A)       │
│   - License verification (0x0B)     │
│   - Payment processing (XFG/PARA)   │
│   - Reward distribution             │
└─────────────────────────────────────┘
```

## Technical Specifications

### Node Implementation
```typescript
interface ParashareNode {
  // Identity
  onionAddress: string;              // xxx.onion (56-char v3)
  nodeId: string;                    // SHA-256 of public key
  
  // Capabilities
  storage: {
    sharedLibraryPath: string;       // Local music folder
    indexedFiles: FileIndex[];       // Audio file metadata
    cacheSize: number;               // Popular content cache
  };
  
  // Network
  connections: {
    peers: Map<string, PeerConnection>;
    bootstrapNodes: string[];
    torCircuits: TorCircuit[];
  };
  
  // Blockchain (on-demand)
  fuego: {
    connected: boolean;              // false by default
    rpcEndpoint: string;             // Through Tor SOCKS5
    lastSync: number;
  };
  
  // Economic
  rewards: {
    paraBalance: number;
    xfgBalance: number;
    shareRatio: number;              // Upload/download ratio
    reputation: number;              // Community score
  };
}
```

### File Sharing Protocol
```typescript
interface AudioFile {
  // Content identification
  contentHash: string;               // SHA-256
  magnetUri: string;                 // magnet:?xt=urn:sha256:...
  
  // Metadata
  metadata: {
    artist: string;
    album: string;
    title: string;
    duration: number;
    bitrate: number;
    format: 'mp3' | 'flac' | 'opus' | 'm4a';
  };
  
  // DIGM integration
  digm: {
    albumId?: string;                // If registered on Fuego
    isPaidContent: boolean;
    priceXFG?: number;
    licenseRequired: boolean;
  };
  
  // Network
  availability: {
    seeders: string[];               // .onion addresses
    lastSeen: number;
    popularity: number;
  };
}

// Transfer protocol
interface FileTransferSession {
  sessionId: string;
  fileHash: string;
  
  // Transport
  protocol: 'uTP-over-Tor';
  torCircuit: string;
  
  // Progress
  chunks: {
    total: number;
    downloaded: number;
    verified: number;
  };
  
  // Performance
  speed: number;                     // bytes/sec
  eta: number;                       // seconds
  
  // Security
  encryption: 'CryptoNote';
  verification: 'SHA-256';
}
```

### Fuego Integration (On-Demand)
```typescript
class FuegoInterface {
  private connection: FuegoRPCClient | null = null;
  
  // Connect only when needed
  async publishAlbum(album: AlbumMetadata): Promise<string> {
    await this.connect();
    
    // Create 0x0A transaction
    const tx = await this.createAlbumRegistration({
      artist: album.artist,
      title: album.title,
      contentHashes: album.tracks.map(t => t.hash),
      priceXFG: album.price,
      timestamp: Date.now()
    });
    
    const txHash = await this.broadcast(tx);
    
    await this.disconnect();
    return txHash;
  }
  
  // Verify license without staying connected
  async verifyLicense(
    userPublicKey: string,
    albumId: string
  ): Promise<boolean> {
    await this.connect();
    
    // Scan for 0x0B transactions
    const licenses = await this.scanLicenseTransactions({
      userKey: userPublicKey,
      albumId,
      fromBlock: this.getLastCachedBlock()
    });
    
    await this.disconnect();
    return licenses.length > 0;
  }
  
  private async connect() {
    // Connect through Tor SOCKS5 proxy
    this.connection = new FuegoRPCClient({
      endpoint: 'http://fuego-node.onion:8081',
      proxy: 'socks5://127.0.0.1:9050'
    });
    
    await this.connection.connect();
  }
  
  private async disconnect() {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }
}
```

## μTP Over Tor Implementation

### Why μTP?
μTP (Micro Transport Protocol) was developed by BitTorrent to solve a key problem:
**Background file transfers shouldn't interfere with interactive traffic.**

**Key Feature: LEDBAT (Low Extra Delay Background Transport)**
- Measures network delay continuously
- When delay increases → reduces send rate
- Yields bandwidth to TCP connections
- Result: File sharing doesn't slow down browsing/gaming

### Implementation
```typescript
import utp from 'utp-native';
import { SocksClient } from 'socks';

class DIGMTransport {
  private torProxy = 'socks5://127.0.0.1:9050';
  
  async connectToPeer(onionAddress: string, port: number) {
    // 1. Establish Tor connection
    const torConnection = await SocksClient.createConnection({
      proxy: {
        host: '127.0.0.1',
        port: 9050,
        type: 5
      },
      command: 'connect',
      destination: {
        host: onionAddress,
        port
      }
    });
    
    // 2. Layer μTP over Tor connection
    const utpSocket = utp.connect(port, {
      socket: torConnection.socket,
      
      // LEDBAT congestion control
      congestionControl: {
        algorithm: 'LEDBAT',
        target: 100,              // Target 100ms extra delay
        gainFactor: 1.0,          // How aggressively to back off
        baseDelay: 10             // Minimum delay (ms)
      },
      
      // Chunking
      mtu: 1400,                  // Maximum transmission unit
      windowSize: 32,             // Chunks in flight
      
      // Reliability
      retransmitTimeout: 1000,    // 1 second
      maxRetries: 5
    });
    
    return utpSocket;
  }
  
  async transferFile(
    fileHash: string,
    targetPeer: string,
    onProgress: (bytes: number) => void
  ) {
    const socket = await this.connectToPeer(targetPeer, 8333);
    const fileStream = await this.getFileStream(fileHash);
    
    // Stream file through μTP
    let totalBytes = 0;
    fileStream.on('data', (chunk) => {
      socket.write(chunk);
      totalBytes += chunk.length;
      onProgress(totalBytes);
    });
    
    await new Promise((resolve) => {
      socket.on('finish', resolve);
    });
    
    socket.destroy();
  }
}
```

### Performance Characteristics

**μTP vs TCP:**
```
Scenario: Downloading 100MB album while browsing

TCP-based P2P:
├─ File download: 10 MB/s
├─ Web page load: 200ms → 3000ms
└─ Result: Browsing becomes unusable ❌

μTP-based P2P (with LEDBAT):
├─ File download: 8 MB/s (slightly slower)
├─ Web page load: 200ms → 300ms (minimal increase)
└─ Result: Browsing remains smooth ✅
```

**Why This Matters for DIGM:**
- Users can share files 24/7 without noticing
- No complaints about "slow internet"
- Encourages long-term seeding
- Better for PARA reward system

## Tor Hidden Services: Deep Dive

### .onion Address Generation
```typescript
// Simplified v3 .onion address generation
async function generateOnionAddress() {
  // 1. Generate Ed25519 keypair
  const keypair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );
  
  // 2. Derive .onion address from public key
  const publicKey = await crypto.subtle.exportKey('raw', keypair.publicKey);
  
  // Format: base32(publicKey || checksum || version) + ".onion"
  const checksum = await crypto.subtle.digest('SHA-256', publicKey);
  const version = new Uint8Array([3]); // v3
  
  const combined = concat(publicKey, checksum.slice(0, 2), version);
  const address = base32Encode(combined).toLowerCase();
  
  return `${address}.onion`; // 56 characters + ".onion"
}
```

### Hidden Service Architecture
```
User's DIGM Node                    Tor Network                    Other DIGM Node
┌──────────────┐                                                   ┌──────────────┐
│   127.0.0.1  │                                                   │   127.0.0.1  │
│   Port 8333  │                                                   │   Port 8333  │
└──────┬───────┘                                                   └───────┬──────┘
       │                                                                   │
       │ Forwards to                                                       │
       ▼                                                                   ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Entry Node   │─────▶│ Middle Node  │─────▶│ Rendezvous   │◀─────│ Entry Node   │
│              │      │              │      │    Node      │      │              │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
      │                     │                       │                     │
      └─────────────────────┴───────────────────────┴─────────────────────┘
                    3-hop circuit (encrypted at each hop)

Result:
- Your IP: Hidden from other node
- Other node's IP: Hidden from you
- Rendezvous point: Doesn't know content
- ISP: Only sees encrypted Tor traffic
```

## Economic Model

### PARA Rewards for Sharing
```typescript
const paraRewards = {
  // Seeding rewards (for sharing files)
  seeding: {
    baseRate: 10,                    // PARA per GB shared
    multipliers: {
      xfgStake: (stake) => {
        if (stake >= 10000) return 5.0;  // Elderfier
        if (stake >= 1000) return 2.0;
        return 1.0;
      },
      popularity: (downloads) => {
        // More popular content = more rewards
        return 1 + Math.log10(downloads);
      },
      uptime: (hours) => {
        // Consistent availability bonus
        if (hours >= 720) return 2.0;    // 30 days
        if (hours >= 168) return 1.5;    // 7 days
        return 1.0;
      }
    }
  },
  
  // Bandwidth rewards
  bandwidth: {
    upload: 5,                       // PARA per GB uploaded
    download: -2,                    // Cost per GB downloaded (premium)
    ratio: (upload, download) => {
      // Bonus for good share ratio
      const ratio = upload / Math.max(download, 1);
      if (ratio >= 2.0) return 100;  // Bonus PARA
      return 0;
    }
  },
  
  // Discovery rewards
  discovery: {
    newContent: 50,                  // PARA for sharing new content
    curation: 10,                    // PARA for playlist/collection creation
    referral: 25                     // PARA for bringing new users
  }
};

// Example calculation
function calculateReward(
  bytesShared: number,
  xfgStake: number,
  downloads: number,
  uptimeHours: number
): number {
  const gb = bytesShared / 1e9;
  const base = gb * paraRewards.seeding.baseRate;
  
  const stakeMultiplier = paraRewards.seeding.multipliers.xfgStake(xfgStake);
  const popularityMultiplier = paraRewards.seeding.multipliers.popularity(downloads);
  const uptimeMultiplier = paraRewards.seeding.multipliers.uptime(uptimeHours);
  
  return base * stakeMultiplier * popularityMultiplier * uptimeMultiplier;
}

// Example: Elderfier sharing 100GB for 30 days with 1000 downloads
const reward = calculateReward(100e9, 10000, 1000, 720);
// = 100 GB * 10 PARA/GB * 5.0 (Elderfier) * 4.0 (popularity) * 2.0 (uptime)
// = 40,000 PARA
```

## Implementation Roadmap

### Phase 1: Tor Foundation (Weeks 1-2)
**Goal:** Get DIGM nodes running on Tor

```typescript
// Week 1: Basic Tor integration
const week1Tasks = [
  'Install and configure Tor daemon',
  'Create hidden service for DIGM node',
  'Generate persistent .onion address',
  'Test connectivity between nodes',
  'Document setup process'
];

// Week 2: Peer discovery
const week2Tasks = [
  'Implement bootstrap node list',
  'Add peer exchange protocol',
  'Create DHT for node discovery',
  'Add connection management',
  'Build simple UI for node status'
];
```

### Phase 2: File Sharing (Weeks 3-4)
**Goal:** μTP file transfers through Tor

```typescript
// Week 3: μTP integration
const week3Tasks = [
  'Integrate utp-native library',
  'Layer μTP over Tor connections',
  'Implement LEDBAT congestion control',
  'Add chunked file transfers',
  'Test transfer speeds'
];

// Week 4: Indexing and search
const week4Tasks = [
  'Local library scanner (audio files)',
  'Extract metadata (artist, album, etc)',
  'Create file index data structure',
  'Implement search protocol',
  'Add content verification'
];
```

### Phase 3: Fuego Integration (Weeks 5-6)
**Goal:** Blockchain features for monetization

```typescript
// Week 5: Album publishing
const week5Tasks = [
  'Fuego RPC client through Tor',
  'Create 0x0A transaction builder',
  'Implement album registration flow',
  'Add content hash verification',
  'Test on Fuego testnet'
];

// Week 6: License system
const week6Tasks = [
  'Scan 0x0B transactions for licenses',
  'Build license verification cache',
  'Implement access control',
  'Add license purchase flow',
  'Test full artist → listener workflow'
];
```

### Phase 4: Polish & Launch (Weeks 7-8)
**Goal:** Production-ready release

```typescript
// Week 7: UI/UX
const week7Tasks = [
  'Desktop app (Electron)',
  'Web interface (.onion site)',
  'Artist dashboard',
  'Listener library view',
  'Chat/messaging UI'
];

// Week 8: Launch preparation
const week8Tasks = [
  'Security audit',
  'Performance optimization',
  'Documentation',
  'Marketing materials',
  'Beta user onboarding'
];
```

## Comparison with Alternatives

| Feature | IPFS | BitTorrent | SoulSeek | DarkMX | **Parashare** |
|---------|------|------------|----------|---------|---------------|
| **Anonymity** | ❌ IP leaked | ❌ IP leaked | ❌ IP leaked | ✅ Tor | ✅ Tor |
| **Monetization** | ⚠️ Complex | ❌ None | ❌ None | ❌ None | ✅ Built-in |
| **License System** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Blockchain |
| **Artist Payments** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Direct |
| **Bandwidth Control** | ❌ No | ⚠️ Some | ❌ No | ⚠️ Manual | ✅ LEDBAT |
| **Zero Setup** | ❌ Complex | ❌ Port forward | ❌ Port forward | ✅ Yes | ✅ Yes |
| **Infrastructure Cost** | ⚠️ Gateways | ⚠️ Trackers | ❌ Servers | ✅ $0 | ✅ $0 |
| **Censorship Resistance** | ⚠️ Moderate | ❌ Weak | ❌ Weak | ✅ Strong | ✅ Strong |
| **Audio Focus** | ❌ General | ❌ General | ✅ Yes | ❌ General | ✅ Yes |

## Security Considerations

### Threat Model
```typescript
const threats = {
  networkLevel: {
    trafficAnalysis: {
      mitigation: "Tor's 3-hop routing",
      effectiveness: "High"
    },
    nodeIdentification: {
      mitigation: "Hidden services",
      effectiveness: "High"
    },
    contentCensorship: {
      mitigation: ".onion addresses can't be easily blocked",
      effectiveness: "High"
    }
  },
  
  applicationLevel: {
    contentTampering: {
      mitigation: "SHA-256 verification",
      effectiveness: "High"
    },
    licenseBypass: {
      mitigation: "Blockchain verification + redistribution prevention",
      effectiveness: "High"
    },
    sybilAttack: {
      mitigation: "XFG stake requirement for rewards",
      effectiveness: "Moderate"
    }
  },
  
  economicLevel: {
    rewardGaming: {
      mitigation: "Share ratio tracking + reputation system",
      effectiveness: "Moderate"
    },
    freeRiding: {
      mitigation: "Download costs for non-sharers",
      effectiveness: "Moderate"
    }
  }
};
```

### Privacy Guarantees
```
DIGM User Privacy:
├─ IP Address: Hidden (Tor)
├─ Location: Hidden (Tor)
├─ Listening History: Local only
├─ Payment History: Stealth addresses (Fuego)
├─ Share Activity: Anonymous (no central logs)
└─ Node Operator: Can't see user data

Artist Privacy:
├─ Payment Address: Stealth addresses
├─ Sales Data: Encrypted on blockchain
├─ Personal Info: Never required
└─ Fan Interaction: Pseudonymous

Network Observer (ISP):
├─ Can See: Encrypted Tor traffic
├─ Can't See: Destination, content, metadata
└─ Indistinguishable: From other Tor traffic
```

## Conclusion

**Parashare/DIGM represents a new paradigm in music distribution:**

1. ✅ **Privacy-First**: Tor ensures complete anonymity
2. ✅ **Artist-Friendly**: Direct monetization without intermediaries
3. ✅ **Zero-Cost**: No infrastructure or storage fees
4. ✅ **Efficient**: μTP ensures smooth performance
5. ✅ **Secure**: Blockchain-verified licensing
6. ✅ **Decentralized**: No single point of failure
7. ✅ **Community-Driven**: Rewards for participation

**By combining:**
- DarkMX's proven Tor architecture
- BitTorrent's μTP efficiency
- Fuego's privacy blockchain
- DIGM's artist-centric design

**We create a music economy that's:**
- More private than Spotify
- More fair than record labels
- More efficient than IPFS
- More sustainable than free platforms

**Next Step:** Begin Phase 1 implementation (Tor integration) and prototype the core DIGM node.
