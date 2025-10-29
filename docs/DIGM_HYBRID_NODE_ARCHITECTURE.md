# DIGM Hybrid Node Architecture: General P2P + On-Chain Publishing

## Overview
This architecture creates a hybrid DIGM node that operates primarily as a general P2P file sharing network (DarkMX/SoulSeek-style) but connects to the Fuego blockchain specifically for DIGM album publishing, verification, and economic activities.

**New Direction:** Integrate Tor hidden services (DarkMX-inspired) for maximum privacy and zero infrastructure costs.

## Node Operating Modes

### 1. General P2P File Sharing Mode (Default)
- **Network**: Operates on general P2P protocols (SoulSeek-inspired)
- **Content**: Users share their entire music libraries from local machines
- **Availability**: Real-time based on user online status
- **Incentives**: PARA rewards for sharing and bandwidth contribution
- **Privacy**: CryptoNote encryption for all file transfers

### 2. Fuego Network Mode (On-Demand)
- **Activation**: Only when artists want to publish DIGM albums
- **Connection**: Establishes connection to Fuego blockchain
- **Functions**: Album registration, license verification, PARA distribution
- **Duration**: Temporary connection, disconnects after transaction completion

## Transport Protocol: μTP vs Tor

### μTP (Micro Transport Protocol)
**Originally developed by BitTorrent for efficient P2P transfers:**

```typescript
const uTPAdvantages = {
  bandwidth: {
    efficiency: "Yields to TCP traffic (LEDBAT congestion control)",
    benefit: "Doesn't saturate user's connection",
    useCase: "Background file transfers"
  },
  
  performance: {
    latency: "Lower overhead than TCP",
    throughput: "Better for P2P compared to TCP",
    firewall: "Can traverse NAT more effectively"
  },
  
  implementation: {
    libraries: ["libutp (C++)", "utp-native (Node.js)", "libtorrent"],
    complexity: "Moderate - UDP-based protocol",
    adoption: "Used by BitTorrent, Resilio Sync"
  }
};

// μTP implementation for DIGM file transfers
class DIGMuTPTransport {
  private utpSocket: utp.Socket;
  
  async connectToPeer(address: string, port: number) {
    // μTP connection with automatic congestion control
    this.utpSocket = await utp.connect(address, port, {
      congestionControl: 'LEDBAT', // Low Extra Delay Background Transport
      maxBandwidth: 'auto',         // Don't saturate connection
      encryption: 'cryptonote'      // CryptoNote encryption layer
    });
  }
  
  async transferFile(fileHash: string, targetPeer: string) {
    const stream = await this.getFileStream(fileHash);
    
    // μTP automatically yields to interactive traffic
    await this.utpSocket.pipe(stream, {
      priority: 'background',
      checksum: 'sha256'
    });
  }
}
```

### Tor Hidden Services (DarkMX Approach)
**Better fit for DIGM's privacy-first philosophy:**

```typescript
const torAdvantages = {
  privacy: {
    anonymity: "3-hop onion routing hides IP addresses",
    encryption: "End-to-end encrypted by default",
    metadata: "No server logs, no tracking"
  },
  
  infrastructure: {
    setup: "No port forwarding required",
    firewall: "Bypasses NAT/firewall automatically",
    cost: "Zero - no servers needed"
  },
  
  censorship: {
    resistance: "Difficult to block .onion addresses",
    availability: "Works in restricted networks",
    resilience: "No central points of failure"
  }
};

// Tor-based DIGM node (DarkMX-inspired)
class DIGMTorNode {
  private hiddenService: TorHiddenService;
  private onionAddress: string;
  
  async initialize() {
    // Start Tor hidden service
    this.hiddenService = await tor.createHiddenService({
      version: 3,  // v3 onion (56-character address)
      ports: {
        p2p: 8333,      // P2P file sharing
        rpc: 8334,      // Fuego RPC (on-demand)
        web: 8335,      // Web interface
        chat: 8336      // Messaging
      }
    });
    
    this.onionAddress = this.hiddenService.getAddress();
    console.log(`DIGM node: ${this.onionAddress}.onion`);
  }
  
  async shareFile(fileHash: string) {
    // All transfers through Tor automatically
    // No IP exposure, no port forwarding
    return this.hiddenService.serve(fileHash);
  }
}
```

### Hybrid Approach: μTP over Tor
**Best of both worlds:**

```typescript
class DIGMHybridTransport {
  private torService: TorHiddenService;
  private utpSocket: utp.Socket;
  
  async connectToPeer(onionAddress: string) {
    // 1. Connect to peer's .onion address via Tor
    const torConnection = await this.torService.connect(onionAddress);
    
    // 2. Use μTP over Tor connection for efficient transfers
    this.utpSocket = await utp.connect(torConnection, {
      congestionControl: 'LEDBAT',
      transport: 'tor-circuit'  // Use Tor circuit as transport
    });
  }
  
  advantages: [
    "Privacy: Tor's anonymity",
    "Efficiency: μTP's congestion control",
    "NAT traversal: Tor's automatic bypass",
    "Bandwidth friendly: μTP's yielding behavior"
  ]
}
```

## Architecture Components

### P2P File Sharing Layer
```typescript
const p2pLayer = {
  protocol: "SoulSeek-inspired P2P",
  features: [
    "User library sharing from local machines",
    "Real-time availability based on online status", 
    "Built-in chat and community features",
    "Content discovery through user interactions",
    "CryptoNote encryption for privacy"
  ],
  incentives: {
    paraRewards: "10 PARA/GB shared",
    bandwidthRewards: "5 PARA/GB uploaded",
    availabilityBonus: "2x PARA for consistent seeding"
  }
};
```

### Fuego Blockchain Interface
```typescript
const fuegoInterface = {
  activation: "On-demand for DIGM activities",
  functions: [
    "Album registration via 0x0A transactions",
    "License verification via 0x0B transactions", 
    "PARA reward distribution",
    "Content hash verification",
    "Payment processing"
  ],
  connection: {
    mode: "Temporary connection",
    duration: "Transaction-based sessions",
    security: "CryptoNote encrypted RPC"
  }
};
```

### Economic Model
```typescript
const economicModel = {
  // General P2P rewards
  generalSharing: {
    paraPerGB: 10, // PARA per GB shared
    minStake: 1000, // Minimum XFG stake for rewards
    maxDaily: 1000 // Max daily PARA from general sharing
  },
  
  // DIGM-specific rewards  
  digmPublishing: {
    albumRegistration: 500, // PARA for publishing DIGM album
    licenseSales: 20, // PARA per license sale
    artistRewards: 30 // PARA per album stream
  },
  
  // Bandwidth incentives
  bandwidth: {
    uploadReward: 5, // PARA per GB uploaded
    downloadCost: 2, // PARA per GB downloaded (for premium)
    elderfierBonus: 5x // Multiplier for staked nodes
  }
};
```

## Recommended Architecture: Tor-First with μTP Optimization

### Layer 1: Tor Hidden Services (DarkMX Model)
```typescript
const layer1_Tor = {
  foundation: "Tor hidden services for all nodes",
  
  nodeIdentity: {
    address: "random56char.onion",
    privacy: "IP address never exposed",
    persistence: "Same .onion address across sessions"
  },
  
  connectivity: {
    discovery: "Bootstrap .onion addresses + peer exchange",
    noSetup: "No port forwarding or firewall config",
    global: "Works from any network"
  }
};
```

### Layer 2: File Sharing with μTP Optimization
```typescript
const layer2_FileSharing = {
  protocol: "μTP over Tor circuits",
  
  features: {
    efficiency: "LEDBAT congestion control",
    privacy: "CryptoNote encryption layer",
    integrity: "SHA-256 content verification"
  },
  
  indexing: {
    local: "Scan user's music folders",
    sharing: "Announce to connected peers",
    search: "Distributed query across network"
  }
};
```

### Layer 3: Fuego Blockchain Interface (On-Demand)
```typescript
const layer3_Fuego = {
  connection: "Fuego RPC through Tor SOCKS5 proxy",
  activation: "Only when publishing/verifying DIGM albums",
  
  operations: {
    publish: "0x0A album registration transaction",
    verify: "0x0B license verification",
    payment: "XFG/PARA transactions",
    rewards: "PARA distribution for sharing"
  },
  
  privacy: {
    stealth: "Use Fuego stealth addresses",
    tor: "All RPC calls through Tor",
    temporary: "Disconnect after transaction"
  }
};
```

## Implementation Strategy

### Phase 1: Tor Integration (Week 1-2)
1. **Tor Hidden Service Setup**
   ```bash
   # Use existing Tor library
   npm install tor-control-client
   # or native: tor-daemon, or Rust: arti
   ```

2. **Basic Node Operations**
   - Create .onion address for each DIGM node
   - Implement peer discovery (bootstrap + PEX)
   - Add web interface accessible via Tor Browser

3. **DarkMX-Style Features**
   - File indexing and sharing
   - Network linking (federated discovery)
   - Chat/messaging layer

### Phase 2: μTP Optimization (Week 2-3)
1. **Integrate μTP over Tor**
   ```typescript
   import utp from 'utp-native';
   
   // μTP transfers through Tor circuits
   const utpOverTor = new UTPTransport({
     proxy: 'socks5://127.0.0.1:9050', // Tor SOCKS proxy
     congestionControl: 'LEDBAT'
   });
   ```

2. **Efficient File Transfers**
   - Implement chunked transfers
   - Add resumability
   - Content verification (SHA-256)

### Phase 3: Fuego Integration (Week 3-4)
1. **On-Demand Blockchain Connection**
   - Fuego RPC through Tor
   - 0x0A/0x0B transaction support
   - PARA reward distribution

2. **License Verification System**
   - Check 0x0B transactions for licenses
   - Prevent redistribution of paid content
   - Track user access rights

### Phase 4: Polish & Launch (Week 4-6)
1. **User Interface**
   - Desktop app (Electron)
   - Web interface (.onion site)
   - Mobile apps (Android/iOS)

2. **Community Features**
   - DarkMX-style chat rooms
   - Artist profiles
   - Discovery and recommendations

## Advantages Over Pure Storage Approach

### Cost Savings
- **Storage**: $0 (user-provided vs $4.24/month IPFS + $1,600 Arweave)
- **Bandwidth**: $0 (P2P vs CDN costs)
- **Infrastructure**: $0 (Tor hidden services vs VPS hosting)
- **Maintenance**: Minimal (single protocol vs multiple systems)

### Privacy Advantages (Tor-based)
- **IP Protection**: Never exposed (vs IPFS/Arweave which leak IPs)
- **Metadata Protection**: No tracking (vs centralized services)
- **Censorship Resistance**: .onion addresses can't be easily blocked
- **User Control**: Complete ownership of data

### Technical Advantages (μTP optimization)
- **Bandwidth Friendly**: LEDBAT yields to interactive traffic
- **NAT Traversal**: Works through Tor (no port forwarding)
- **Efficient Transfers**: Lower overhead than TCP
- **Resumability**: Built-in chunked transfer support

## Security & Privacy

### Tor Layer Security
- **Onion Routing**: 3-hop encryption prevents traffic analysis
- **Hidden Services**: Server IP addresses never exposed
- **Circuit Isolation**: Each connection uses separate circuit
- **No Logs**: No central servers to log activity

### μTP Transport Security
- **CryptoNote Encryption**: All file transfers encrypted
- **Content Verification**: SHA-256 hash checking
- **Peer Authentication**: Verify peer identity before transfer
- **Bandwidth Protection**: LEDBAT prevents abuse

### Fuego Blockchain Privacy
- **Stealth Addresses**: Payment privacy for artists
- **0x0B Encryption**: License data encrypted
- **Temporary Connections**: Only connect when needed
- **Local Caching**: Minimize blockchain queries

## Technical Comparison

| Feature | Traditional P2P | μTP-based | Tor-based | DIGM Hybrid |
|---------|----------------|-----------|-----------|-------------|
| **Privacy** | ❌ IP exposed | ❌ IP exposed | ✅ Anonymous | ✅ Anonymous |
| **NAT Traversal** | ⚠️ Complex | ⚠️ Better | ✅ Automatic | ✅ Automatic |
| **Bandwidth** | ❌ Can saturate | ✅ LEDBAT | ⚠️ Slower | ✅ Optimized |
| **Setup** | ❌ Port forward | ⚠️ Some config | ✅ Zero config | ✅ Zero config |
| **Censorship Resistance** | ❌ Easy to block | ❌ Easy to block | ✅ Difficult | ✅ Difficult |
| **Infrastructure Cost** | ⚠️ Some | ⚠️ Some | ✅ Zero | ✅ Zero |
| **File Transfer Speed** | ⚠️ Variable | ✅ Good | ⚠️ Slower | ✅ Optimized |

## Conclusion

**Recommended Architecture: Tor + μTP Hybrid**

This combines:
1. ✅ **DarkMX's proven Tor architecture** for privacy and zero setup
2. ✅ **μTP's efficient transfers** for bandwidth optimization
3. ✅ **Fuego blockchain integration** for monetization
4. ✅ **CryptoNote encryption** for content protection

**Result:** A privacy-focused music economy that's:
- **Anonymous** (Tor hidden services)
- **Efficient** (μTP congestion control)
- **Free** (zero infrastructure costs)
- **Monetizable** (Fuego/XFG/PARA)
- **Easy** (no setup required)

This hybrid architecture transforms DIGM from a complex storage-based platform into a **true P2P music community** with seamless on-chain integration for monetization and verification.

## Next Steps

1. **Prototype** Tor hidden service integration
2. **Implement** μTP file transfers over Tor
3. **Add** Fuego blockchain interface
4. **Test** with small group of artists/listeners
5. **Launch** public beta on Tor network
