export interface FuegoPeer {
  id: string;
  address: string;
  port: number;
  publicKey: string;
  lastSeen: number;
  capabilities: string[];
  networkVersion: string;
  uptime: number;
  latency?: number;
}

export interface FuegoNetworkStats {
  totalPeers: number;
  activePeers: number;
  networkVersion: string;
  averageLatency: number;
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdate: number;
}

export class FuegoDiscovery {
  private fuegoNetwork: string;
  private discoveryNodes: string[];
  private knownPeers: Map<string, FuegoPeer>;
  private networkStats: FuegoNetworkStats;
  private isDiscovering: boolean;
  private discoveryInterval: NodeJS.Timeout | null;

  constructor() {
    this.fuegoNetwork = 'xfg-mainnet';
    this.discoveryNodes = [
      'https://fuego-xfg-bootstrap1.com',
      'https://fuego-xfg-bootstrap2.com',
      'https://fuego-xfg-bootstrap3.com',
      'https://fuego-xfg-bootstrap4.com'
    ];
    this.knownPeers = new Map();
    this.networkStats = {
      totalPeers: 0,
      activePeers: 0,
      networkVersion: '1.0.0',
      averageLatency: 0,
      networkHealth: 'good',
      lastUpdate: Date.now()
    };
    this.isDiscovering = false;
    this.discoveryInterval = null;
  }

  // Start continuous peer discovery
  async startDiscovery(intervalMs: number = 30000): Promise<void> {
    if (this.isDiscovering) {
      console.warn('Discovery already running');
      return;
    }

    this.isDiscovering = true;
    console.log('Starting Fuego XFG peer discovery...');

    // Initial discovery
    await this.performDiscovery();

    // Set up periodic discovery
    this.discoveryInterval = setInterval(async () => {
      await this.performDiscovery();
    }, intervalMs);
  }

  // Stop peer discovery
  stopDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    this.isDiscovering = false;
    console.log('Stopped Fuego XFG peer discovery');
  }

  // Perform a single discovery round
  private async performDiscovery(): Promise<void> {
    try {
      const newPeers = await this.discoverPeers();
      const activePeers = await this.checkPeerHealth(newPeers);
      
      // Update known peers
      activePeers.forEach(peer => {
        this.knownPeers.set(peer.id, peer);
      });

      // Update network stats
      this.updateNetworkStats();

      console.log(`Discovery complete: ${activePeers.length} active peers found`);
    } catch (error) {
      console.error('Discovery failed:', error);
    }
  }

  // Discover peers from all discovery nodes
  async discoverPeers(): Promise<FuegoPeer[]> {
    const allPeers: FuegoPeer[] = [];
    const discoveryPromises = this.discoveryNodes.map(node => 
      this.discoverFromNode(node)
    );

    try {
      const results = await Promise.allSettled(discoveryPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allPeers.push(...result.value);
        }
      });

      // Remove duplicates based on peer ID
      const uniquePeers = this.removeDuplicatePeers(allPeers);
      return uniquePeers;
    } catch (error) {
      console.error('Failed to discover peers:', error);
      return [];
    }
  }

  // Discover peers from a specific node
  private async discoverFromNode(nodeUrl: string): Promise<FuegoPeer[]> {
    try {
      const response = await fetch(`${nodeUrl}/api/peers?network=${this.fuegoNetwork}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DIGM-Fuego-Discovery/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.peers || !Array.isArray(data.peers)) {
        throw new Error('Invalid peer data received');
      }

      return data.peers.map((peer: any) => ({
        id: peer.id,
        address: peer.address,
        port: peer.port || 8080,
        publicKey: peer.publicKey,
        lastSeen: peer.lastSeen || Date.now(),
        capabilities: peer.capabilities || [],
        networkVersion: peer.networkVersion || '1.0.0',
        uptime: peer.uptime || 0
      }));
    } catch (error) {
      console.warn(`Failed to discover peers from ${nodeUrl}:`, error);
      return [];
    }
  }

  // Check health of discovered peers
  private async checkPeerHealth(peers: FuegoPeer[]): Promise<FuegoPeer[]> {
    const healthChecks = peers.map(async peer => {
      try {
        const startTime = Date.now();
        const response = await fetch(`http://${peer.address}:${peer.port}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (response.ok) {
          const latency = Date.now() - startTime;
          return {
            ...peer,
            latency,
            lastSeen: Date.now()
          };
        }
      } catch (error) {
        // Peer is not responding, exclude from active peers
      }
      return null;
    });

    const results = await Promise.allSettled(healthChecks);
    const activePeers = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<FuegoPeer>).value);

    return activePeers;
  }

  // Register this peer with discovery nodes
  async registerPeer(peerUrl: string, capabilities: string[] = []): Promise<void> {
    const registrationData = {
      peer: {
        url: peerUrl,
        network: this.fuegoNetwork,
        capabilities,
        version: '1.0.0',
        timestamp: Date.now()
      }
    };

    const registrationPromises = this.discoveryNodes.map(async node => {
      try {
        const response = await fetch(`${node}/api/peers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DIGM-Fuego-Registration/1.0'
          },
          body: JSON.stringify(registrationData),
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          console.log(`Successfully registered with ${node}`);
        } else {
          console.warn(`Failed to register with ${node}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to register with ${node}:`, error);
      }
    });

    await Promise.allSettled(registrationPromises);
  }

  // Get all known peers
  getKnownPeers(): FuegoPeer[] {
    return Array.from(this.knownPeers.values());
  }

  // Get active peers (recently seen)
  getActivePeers(): FuegoPeer[] {
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    
    return Array.from(this.knownPeers.values()).filter(peer => 
      now - peer.lastSeen < activeThreshold
    );
  }

  // Get peers with specific capabilities
  getPeersWithCapability(capability: string): FuegoPeer[] {
    return Array.from(this.knownPeers.values()).filter(peer =>
      peer.capabilities.includes(capability)
    );
  }

  // Get network statistics
  getNetworkStats(): FuegoNetworkStats {
    return { ...this.networkStats };
  }

  // Update network statistics
  private updateNetworkStats(): void {
    const activePeers = this.getActivePeers();
    const latencies = activePeers
      .map(peer => peer.latency)
      .filter(latency => latency !== undefined) as number[];

    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length 
      : 0;

    // Determine network health based on peer count and latency
    let networkHealth: FuegoNetworkStats['networkHealth'] = 'good';
    if (activePeers.length >= 20 && averageLatency < 100) {
      networkHealth = 'excellent';
    } else if (activePeers.length >= 10 && averageLatency < 200) {
      networkHealth = 'good';
    } else if (activePeers.length >= 5 && averageLatency < 500) {
      networkHealth = 'fair';
    } else {
      networkHealth = 'poor';
    }

    this.networkStats = {
      totalPeers: this.knownPeers.size,
      activePeers: activePeers.length,
      networkVersion: '1.0.0',
      averageLatency: Math.round(averageLatency),
      networkHealth,
      lastUpdate: Date.now()
    };
  }

  // Remove duplicate peers based on ID
  private removeDuplicatePeers(peers: FuegoPeer[]): FuegoPeer[] {
    const seen = new Set<string>();
    return peers.filter(peer => {
      if (seen.has(peer.id)) {
        return false;
      }
      seen.add(peer.id);
      return true;
    });
  }

  // Get peer URLs for GUN configuration
  getPeerUrls(): string[] {
    const activePeers = this.getActivePeers();
    return activePeers.map(peer => `http://${peer.address}:${peer.port}/gun`);
  }

  // Get fallback peer URLs
  getFallbackPeerUrls(): string[] {
    return [
      'https://gun-manhattan.herokuapp.com/gun',
      'https://gun-us.herokuapp.com/gun',
      'https://gun-eu.herokuapp.com/gun'
    ];
  }

  // Clean up old peers
  cleanupOldPeers(maxAgeMs: number = 30 * 60 * 1000): void { // 30 minutes
    const now = Date.now();
    const oldPeerIds: string[] = [];

    this.knownPeers.forEach((peer, id) => {
      if (now - peer.lastSeen > maxAgeMs) {
        oldPeerIds.push(id);
      }
    });

    oldPeerIds.forEach(id => {
      this.knownPeers.delete(id);
    });

    if (oldPeerIds.length > 0) {
      console.log(`Cleaned up ${oldPeerIds.length} old peers`);
    }
  }
}

// Export singleton instance
export const fuegoDiscovery = new FuegoDiscovery();
export default fuegoDiscovery;
