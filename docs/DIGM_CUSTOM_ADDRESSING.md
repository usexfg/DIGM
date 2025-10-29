# DIGM Custom Addressing & Network Cataloging

## Overview
Exploring ways to create human-readable addresses for DIGM albums and how to catalog/discover content across the network without central directories.

## Custom .digm Addresses

### Concept
Instead of long .onion addresses like `abcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopqr.onion`, users could access albums via memorable addresses like:
```
artist-album.digm
radiohead-okcomputer.digm
kendrick-goodkid.digm
```

### Implementation Approaches

#### Option 1: DNS-Style Resolution via DHT
**Decentralized name → .onion mapping**

```typescript
interface DIGMAddress {
  name: string;                      // "radiohead-okcomputer.digm"
  onionAddress: string;              // Underlying .onion address
  albumId: string;                   // Fuego blockchain album ID
  contentHashes: string[];           // Track hashes
  registeredBy: string;              // Artist's public key
  timestamp: number;
  signature: string;                 // Proves ownership
}

class DIGMNameSystem {
  private dht: DHT;
  private cache: Map<string, DIGMAddress> = new Map();
  
  // Register a .digm address
  async register(
    name: string,
    albumMetadata: AlbumMetadata,
    artistKey: CryptoKey
  ): Promise<void> {
    // 1. Verify name is available
    const existing = await this.dht.get(name);
    if (existing) {
      throw new Error('Address already taken');
    }
    
    // 2. Create record
    const record: DIGMAddress = {
      name,
      onionAddress: await this.getNodeOnionAddress(),
      albumId: albumMetadata.albumId,
      contentHashes: albumMetadata.tracks.map(t => t.hash),
      registeredBy: await this.exportPublicKey(artistKey),
      timestamp: Date.now(),
      signature: ''
    };
    
    // 3. Sign with artist's key
    record.signature = await this.sign(record, artistKey);
    
    // 4. Store in DHT
    await this.dht.put(name, record);
    
    // 5. Also register on Fuego blockchain for permanence
    await this.registerOnFuego(record);
  }
  
  // Resolve .digm address to album location
  async resolve(digmAddress: string): Promise<DIGMAddress | null> {
    // Check cache first
    if (this.cache.has(digmAddress)) {
      return this.cache.get(digmAddress)!;
    }
    
    // Look up in DHT
    const record = await this.dht.get(digmAddress);
    if (!record) {
      // Try Fuego blockchain as fallback
      return await this.resolveFromFuego(digmAddress);
    }
    
    // Verify signature
    if (!await this.verifySignature(record)) {
      throw new Error('Invalid signature');
    }
    
    // Cache and return
    this.cache.set(digmAddress, record);
    return record;
  }
  
  // Access album via .digm address
  async accessAlbum(digmAddress: string): Promise<Album> {
    const record = await this.resolve(digmAddress);
    if (!record) {
      throw new Error(`Album not found: ${digmAddress}`);
    }
    
    // Connect to node hosting the album
    const connection = await this.connectToOnion(record.onionAddress);
    
    // Request album data
    const album = await connection.requestAlbum(record.albumId);
    
    return album;
  }
}
```

#### Option 2: Blockchain-Based Registry
**Store .digm → album mappings on Fuego blockchain**

```typescript
// New transaction type: 0x0D (DIGM Address Registration)
interface DIGMAddressTransaction {
  type: 0x0D;
  digmAddress: string;               // "radiohead-okcomputer.digm"
  albumId: string;                   // References 0x0A transaction
  onionAddress: string;              // Current hosting location
  contentHash: string;               // Hash of album metadata
  ttl: number;                       // Time-to-live (for updates)
  artistSignature: string;
}

class BlockchainNameRegistry {
  private fuegoRPC: FuegoRPCClient;
  private localCache: Map<string, DIGMAddressTransaction> = new Map();
  
  async registerDIGMAddress(
    digmAddress: string,
    albumId: string,
    onionAddress: string
  ): Promise<string> {
    // Connect to Fuego
    await this.fuegoRPC.connect();
    
    // Create 0x0D transaction
    const tx = await this.createTransaction({
      type: 0x0D,
      digmAddress: digmAddress.toLowerCase(),
      albumId,
      onionAddress,
      contentHash: await this.hashAlbumMetadata(albumId),
      ttl: 365 * 24 * 60 * 60,         // 1 year
      artistSignature: await this.signWithArtistKey(digmAddress, albumId)
    });
    
    const txHash = await this.fuegoRPC.broadcastTransaction(tx);
    
    await this.fuegoRPC.disconnect();
    return txHash;
  }
  
  async resolveDIGMAddress(digmAddress: string): Promise<DIGMAddressTransaction | null> {
    // Check cache
    if (this.localCache.has(digmAddress)) {
      const cached = this.localCache.get(digmAddress)!;
      if (Date.now() < cached.ttl) {
        return cached;
      }
    }
    
    // Scan blockchain for 0x1D transactions
    await this.fuegoRPC.connect();
    
    const transactions = await this.fuegoRPC.getTransactionsByExtraType(0x0D);
    const matching = transactions.find(tx => 
      tx.digmAddress === digmAddress.toLowerCase()
    );
    
    await this.fuegoRPC.disconnect();
    
    if (matching) {
      this.localCache.set(digmAddress, matching);
    }
    
    return matching || null;
  }
}
```

#### Option 3: Hybrid DHT + Blockchain
**Best of both worlds: Fast DHT lookups with blockchain backup**

```typescript
class HybridNameSystem {
  private dht: DHT;
  private blockchain: BlockchainNameRegistry;
  
  async register(digmAddress: string, albumData: AlbumMetadata): Promise<void> {
    // 1. Register in DHT for fast lookups
    await this.dht.put(digmAddress, {
      onionAddress: this.myOnionAddress,
      albumId: albumData.albumId,
      timestamp: Date.now()
    });
    
    // 2. Register on blockchain for permanence
    await this.blockchain.registerDIGMAddress(
      digmAddress,
      albumData.albumId,
      this.myOnionAddress
    );
  }
  
  async resolve(digmAddress: string): Promise<AlbumLocation> {
    // Try DHT first (fast)
    let location = await this.dht.get(digmAddress);
    
    if (!location) {
      // Fall back to blockchain (slower but permanent)
      const blockchainRecord = await this.blockchain.resolveDIGMAddress(digmAddress);
      if (blockchainRecord) {
        location = {
          onionAddress: blockchainRecord.onionAddress,
          albumId: blockchainRecord.albumId
        };
        
        // Update DHT cache
        await this.dht.put(digmAddress, location);
      }
    }
    
    return location;
  }
}
```

## Network Cataloging Approaches

### 1. Federated Discovery (DarkMX Style)
**Each node maintains its own catalog and links to others**

```typescript
interface NodeCatalog {
  nodeId: string;
  onionAddress: string;
  
  // This node's albums
  localAlbums: Array<{
    digmAddress: string;
    albumId: string;
    artist: string;
    title: string;
    genre: string[];
    year: number;
    priceXFG: number;
  }>;
  
  // Other nodes this node knows about
  linkedNodes: Array<{
    onionAddress: string;
    lastSeen: number;
    albumCount: number;
    reputation: number;
  }>;
}

class FederatedCatalog {
  private myCatalog: NodeCatalog;
  private knownCatalogs: Map<string, NodeCatalog> = new Map();
  
  // Announce your catalog to the network
  async announceCatalog(): Promise<void> {
    const peers = await this.getConnectedPeers();
    
    for (const peer of peers) {
      await this.sendMessage(peer.onionAddress, {
        type: 'CATALOG_ANNOUNCEMENT',
        catalog: this.myCatalog
      });
    }
  }
  
  // Search across federated catalogs
  async search(query: {
    artist?: string;
    album?: string;
    genre?: string;
  }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Search local catalog
    results.push(...this.searchLocal(query));
    
    // Search known catalogs
    for (const [nodeId, catalog] of this.knownCatalogs) {
      const matches = catalog.localAlbums.filter(album =>
        this.matchesQuery(album, query)
      );
      results.push(...matches);
    }
    
    // Request from linked nodes
    const linkedSearches = Array.from(this.knownCatalogs.values())
      .flatMap(catalog => catalog.linkedNodes)
      .map(async (node) => {
        const remoteResults = await this.requestSearch(node.onionAddress, query);
        return remoteResults;
      });
    
    const remoteResults = await Promise.all(linkedSearches);
    results.push(...remoteResults.flat());
    
    return this.deduplicateAndRank(results);
  }
}
```

### 2. Distributed Hash Table (DHT) Catalog
**Content-addressable catalog using Kademlia-style DHT**

```typescript
interface DHTCatalogEntry {
  key: string;                       // SHA-256(artist + album)
  value: {
    digmAddress: string;
    albumId: string;
    metadata: AlbumMetadata;
    seeders: string[];               // .onion addresses hosting this
    popularity: number;
    lastUpdated: number;
  };
}

class DHTCatalog {
  private dht: KademliaDHT;
  
  async addAlbum(album: AlbumMetadata, digmAddress: string): Promise<void> {
    // Generate key from content
    const key = await this.generateKey(album.artist, album.title);
    
    // Create entry
    const entry: DHTCatalogEntry = {
      key,
      value: {
        digmAddress,
        albumId: album.albumId,
        metadata: album,
        seeders: [this.myOnionAddress],
        popularity: 0,
        lastUpdated: Date.now()
      }
    };
    
    // Store in DHT
    await this.dht.put(key, entry.value);
    
    // Also index by artist
    await this.addToArtistIndex(album.artist, key);
    
    // Index by genre
    for (const genre of album.genres) {
      await this.addToGenreIndex(genre, key);
    }
  }
  
  async searchByArtist(artist: string): Promise<AlbumMetadata[]> {
    const artistKey = `artist:${artist.toLowerCase()}`;
    const albumKeys = await this.dht.get(artistKey) || [];
    
    const albums = await Promise.all(
      albumKeys.map(key => this.dht.get(key))
    );
    
    return albums.filter(a => a !== null);
  }
  
  async searchByGenre(genre: string): Promise<AlbumMetadata[]> {
    const genreKey = `genre:${genre.toLowerCase()}`;
    const albumKeys = await this.dht.get(genreKey) || [];
    
    const albums = await Promise.all(
      albumKeys.map(key => this.dht.get(key))
    );
    
    return albums.filter(a => a !== null);
  }
  
  // Fuzzy search across DHT
  async search(query: string): Promise<SearchResult[]> {
    const normalizedQuery = query.toLowerCase();
    
    // Try multiple search strategies
    const [artistResults, albumResults, genreResults] = await Promise.all([
      this.searchByArtist(normalizedQuery),
      this.searchByAlbumTitle(normalizedQuery),
      this.searchByGenre(normalizedQuery)
    ]);
    
    return this.combineAndRank([
      ...artistResults,
      ...albumResults,
      ...genreResults
    ]);
  }
}
```

### 3. Blockchain-Based Catalog
**Immutable album registry on Fuego blockchain**

```typescript
class BlockchainCatalog {
  private fuegoRPC: FuegoRPCClient;
  private localIndex: Map<string, AlbumRecord> = new Map();
  private lastSyncBlock: number = 0;
  
  async syncCatalog(): Promise<void> {
    await this.fuegoRPC.connect();
    
    // Get all 0x0A (album registration) transactions
    const albumTxs = await this.fuegoRPC.getTransactionsByExtraType(
      0x0A,
      this.lastSyncBlock
    );
    
    // Get all 0x0D (DIGM address) transactions
    const addressTxs = await this.fuegoRPC.getTransactionsByExtraType(
      0x0D,
      this.lastSyncBlock
    );
    
    // Build index
    for (const tx of albumTxs) {
      const album = await this.parseAlbumTransaction(tx);
      this.localIndex.set(album.albumId, album);
    }
    
    // Link DIGM addresses
    for (const tx of addressTxs) {
      const address = await this.parseAddressTransaction(tx);
      const album = this.localIndex.get(address.albumId);
      if (album) {
        album.digmAddress = address.digmAddress;
      }
    }
    
    this.lastSyncBlock = await this.fuegoRPC.getCurrentBlockHeight();
    
    await this.fuegoRPC.disconnect();
  }
  
  async getAllAlbums(): Promise<AlbumRecord[]> {
    return Array.from(this.localIndex.values());
  }
  
  async searchCatalog(query: string): Promise<AlbumRecord[]> {
    const results = Array.from(this.localIndex.values()).filter(album =>
      album.artist.toLowerCase().includes(query.toLowerCase()) ||
      album.title.toLowerCase().includes(query.toLowerCase()) ||
      album.digmAddress?.includes(query.toLowerCase())
    );
    
    return results;
  }
}
```

### 4. GossipSub Catalog Broadcasting
**Real-time catalog updates via gossip protocol**

```typescript
class GossipCatalog {
  private pubsub: GossipSub;
  private topics = {
    newAlbums: 'digm.albums.new',
    updates: 'digm.albums.update',
    discovery: 'digm.discovery'
  };
  
  async initialize(): Promise<void> {
    // Subscribe to catalog topics
    await this.pubsub.subscribe(this.topics.newAlbums, (msg) => {
      this.handleNewAlbum(msg.data);
    });
    
    await this.pubsub.subscribe(this.topics.updates, (msg) => {
      this.handleAlbumUpdate(msg.data);
    });
    
    await this.pubsub.subscribe(this.topics.discovery, (msg) => {
      this.handleDiscoveryRequest(msg.data);
    });
  }
  
  // Announce new album to network
  async announceAlbum(album: AlbumMetadata, digmAddress: string): Promise<void> {
    await this.pubsub.publish(this.topics.newAlbums, {
      digmAddress,
      albumId: album.albumId,
      artist: album.artist,
      title: album.title,
      contentHashes: album.tracks.map(t => t.hash),
      onionAddress: this.myOnionAddress,
      timestamp: Date.now()
    });
  }
  
  // Request catalog from peers
  async discoverAlbums(): Promise<void> {
    await this.pubsub.publish(this.topics.discovery, {
      requesterId: this.nodeId,
      requestType: 'catalog',
      timestamp: Date.now()
    });
  }
}
```

## Recommended Hybrid Approach

### Architecture
```typescript
const recommendedApproach = {
  primary: "Hybrid DHT + Blockchain",
  
  layers: {
    // Layer 1: Fast lookups
    dht: {
      purpose: "Real-time name resolution",
      technology: "Kademlia DHT over Tor",
      ttl: "1 hour",
      benefit: "Fast, no blockchain queries"
    },
    
    // Layer 2: Permanent registry
    blockchain: {
      purpose: "Immutable ownership records",
      technology: "Fuego 0x0D transactions",
      cost: "Small XFG fee",
      benefit: "Permanent, verifiable, censorship-resistant"
    },
    
    // Layer 3: Discovery
    gossip: {
      purpose: "Real-time updates",
      technology: "GossipSub over Tor",
      benefit: "Instant catalog propagation"
    },
    
    // Layer 4: Federation
    nodeLinking: {
      purpose: "Network growth",
      technology: "DarkMX-style node linking",
      benefit: "Decentralized discovery"
    }
  }
};

class UnifiedDIGMCatalog {
  private dht: DHTCatalog;
  private blockchain: BlockchainCatalog;
  private gossip: GossipCatalog;
  private federation: FederatedCatalog;
  
  // Register a new album with .digm address
  async registerAlbum(
    album: AlbumMetadata,
    desiredAddress: string  // e.g., "radiohead-okcomputer.digm"
  ): Promise<string> {
    const digmAddress = this.normalizeAddress(desiredAddress);
    
    // 1. Register on blockchain (permanent)
    const txHash = await this.blockchain.registerDIGMAddress(
      digmAddress,
      album.albumId,
      this.myOnionAddress
    );
    
    // 2. Add to DHT (fast lookups)
    await this.dht.addAlbum(album, digmAddress);
    
    // 3. Announce via gossip (real-time discovery)
    await this.gossip.announceAlbum(album, digmAddress);
    
    // 4. Update federated catalog
    await this.federation.addToLocalCatalog(album, digmAddress);
    
    return digmAddress;
  }
  
  // Resolve .digm address to album location
  async resolve(digmAddress: string): Promise<AlbumLocation> {
    // Try DHT first (fastest)
    let location = await this.dht.resolve(digmAddress);
    
    if (location) return location;
    
    // Fall back to blockchain (permanent)
    location = await this.blockchain.resolve(digmAddress);
    
    if (location) {
      // Update DHT cache
      await this.dht.put(digmAddress, location);
      return location;
    }
    
    throw new Error(`Album not found: ${digmAddress}`);
  }
  
  // Search across all layers
  async search(query: string): Promise<SearchResult[]> {
    // Parallel search across all layers
    const [dhtResults, blockchainResults, federatedResults] = await Promise.all([
      this.dht.search(query),
      this.blockchain.searchCatalog(query),
      this.federation.search({ artist: query, album: query })
    ]);
    
    // Combine, deduplicate, and rank
    return this.combineResults([
      ...dhtResults,
      ...blockchainResults,
      ...federatedResults
    ]);
  }
}
```

## .digm Address Formats

### Standard Format
```
<artist>-<album>.digm

Examples:
- radiohead-okcomputer.digm
- kendrick-goodkid.digm
- pink-floyd-darkside.digm
- aphex-twin-selectedambient.digm
```

### Extended Format (with namespace)
```
<namespace>/<artist>-<album>.digm

Examples:
- albums/radiohead-okcomputer.digm
- ep/burial-street.digm
- single/kanye-stronger.digm
- live/nirvana-unplugged.digm
```

### Short Format (vanity addresses)
```
<custom-name>.digm

Examples:
- okcomputer.digm
- illmatic.digm
- dark side.digm

Note: Requires higher registration fee or stake
```

### Address Validation
```typescript
class DIGMAddressValidator {
  private readonly MIN_LENGTH = 3;
  private readonly MAX_LENGTH = 64;
  private readonly VALID_CHARS = /^[a-z0-9\-]+$/;
  
  validate(address: string): boolean {
    // Remove .digm extension
    const name = address.replace(/\.digm$/, '');
    
    // Check length
    if (name.length < this.MIN_LENGTH || name.length > this.MAX_LENGTH) {
      return false;
    }
    
    // Check characters (lowercase, numbers, hyphens only)
    if (!this.VALID_CHARS.test(name)) {
      return false;
    }
    
    // Check for profanity/reserved words
    if (this.isReserved(name)) {
      return false;
    }
    
    return true;
  }
  
  private isReserved(name: string): boolean {
    const reserved = [
      'admin', 'api', 'www', 'app', 'test',
      'localhost', 'null', 'undefined'
    ];
    return reserved.includes(name);
  }
}
```

## User Experience

### Accessing Albums
```typescript
// Option 1: Direct .digm address
await digm.play('radiohead-okcomputer.digm');

// Option 2: Search and play
const results = await digm.search('radiohead ok computer');
await digm.play(results[0].digmAddress);

// Option 3: Browse catalog
const catalog = await digm.browse({ genre: 'electronic' });
await digm.play(catalog[0].digmAddress);

// Option 4: Traditional .onion (fallback)
await digm.play('abcdef...xyz.onion/album/12345');
```

### Web Interface
```html
<!-- Access via Tor Browser -->
http://digm-gateway.onion/radiohead-okcomputer.digm

<!-- Or custom gateway -->
http://my-node.onion/resolve/kendrick-goodkid.digm
```

## Security Considerations

### Squatting Prevention
```typescript
const antiSquatting = {
  // Require proof of ownership
  registration: {
    cost: "100 XFG stake (refundable)",
    proof: "Artist must sign with private key",
    verification: "Match against 0x0A transaction"
  },
  
  // Time-based expiry
  renewal: {
    period: "1 year",
    grace: "30 days",
    cost: "10 XFG per year"
  },
  
  // Dispute resolution
  claims: {
    process: "Community voting (PARA holders)",
    evidence: "Blockchain transaction history",
    resolution: "Transfer to rightful owner"
  }
};
```

### Collision Prevention
```typescript
class CollisionPrevention {
  async checkAvailability(digmAddress: string): Promise<boolean> {
    // Check all layers
    const [dhtExists, blockchainExists] = await Promise.all([
      this.dht.exists(digmAddress),
      this.blockchain.exists(digmAddress)
    ]);
    
    return !dhtExists && !blockchainExists;
  }
  
  // Suggest alternatives if taken
  async suggestAlternatives(digmAddress: string): Promise<string[]> {
    const base = digmAddress.replace(/\.digm$/, '');
    
    const suggestions = [
      `${base}-official.digm`,
      `${base}-2024.digm`,
      `${base}-remaster.digm`,
      `the-${base}.digm`
    ];
    
    // Filter to available only
    const available = await Promise.all(
      suggestions.map(async (addr) => {
        const isAvailable = await this.checkAvailability(addr);
        return isAvailable ? addr : null;
      })
    );
    
    return available.filter(a => a !== null) as string[];
  }
}
```

## Conclusion

**Recommended Implementation:**

1. ✅ **Use .digm custom addresses** for user-friendly album access
2. ✅ **Hybrid DHT + Blockchain** for fast + permanent resolution
3. ✅ **Federated catalog** (DarkMX style) for discovery
4. ✅ **GossipSub** for real-time updates
5. ✅ **Blockchain registry** for ownership verification

**Benefits:**
- Human-readable addresses (radiohead-okcomputer.digm)
- Decentralized resolution (no central DNS)
- Permanent ownership (blockchain records)
- Fast lookups (DHT caching)
- Real-time updates (gossip protocol)
- Artist verification (signature required)

**Example User Flow:**
```
1. Artist uploads album → Gets radiohead-okcomputer.digm
2. Listener searches "radiohead" → Finds album
3. Clicks play → DHT resolves to .onion address
4. Node verifies license → Streams audio
5. Artist gets paid → XFG/PARA to stealth address
```

This gives DIGM the best of all worlds: privacy, usability, and decentralization.
