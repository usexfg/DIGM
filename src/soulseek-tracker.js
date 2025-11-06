const WebSocket = require('ws');

class SoulSeekTracker {
  constructor(port = 8080) {
    this.port = port;
    this.wss = null;
    this.peers = new Map();
    this.sharedFiles = new Map(); // peerId -> FileShare[]
    this.searchRequests = new Map(); // searchId -> { query, timestamp }
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port });
    
    this.wss.on('connection', (ws) => {
      console.log('New SoulSeek peer connected');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });
    });

    console.log(`SoulSeek tracker running on port ${this.port}`);
  }

  handleMessage(ws, message) {
    switch (message.type) {
      case 1: // LOGIN
        this.handleLogin(ws, message);
        break;
      case 4: // SEARCH_REQUEST
        this.handleSearchRequest(ws, message);
        break;
      case 6: // DOWNLOAD_REQUEST
        this.handleDownloadRequest(ws, message);
        break;
      case 9: // USER_INFO
        this.handleUserInfo(ws, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  handleLogin(ws, message) {
    const { userId, fileCount } = message;
    const peerInfo = {
      ws,
      userId,
      fileCount,
      connectedAt: Date.now(),
      address: this.getPeerAddress(ws),
      sharedFiles: []
    };

    this.peers.set(userId, peerInfo);
    console.log(`Peer ${userId} logged in with ${fileCount} files`);

    // Send welcome message with peer list
    ws.send(JSON.stringify({
      type: 100, // WELCOME
      peers: Array.from(this.peers.keys()),
      totalPeers: this.peers.size
    }));
  }

  handleSearchRequest(ws, message) {
    const { searchId, query, timeout } = message;
    const peerId = this.getPeerIdByWs(ws);
    
    if (!peerId) return;

    this.searchRequests.set(searchId, {
      query,
      timestamp: Date.now(),
      requester: peerId
    });

    // Broadcast search to all peers
    this.broadcastToAll({
      type: 4, // SEARCH_REQUEST
      searchId,
      query,
      timeout,
      fromPeer: peerId
    }, peerId);

    console.log(`Search request ${searchId} for "${query}" from ${peerId}`);
  }

  handleDownloadRequest(ws, message) {
    const { peerId, filename } = message;
    const requesterId = this.getPeerIdByWs(ws);
    
    if (!requesterId) return;

    const targetPeer = this.peers.get(peerId);
    if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
      // Forward download request to target peer
      targetPeer.ws.send(JSON.stringify({
        type: 6, // DOWNLOAD_REQUEST
        filename,
        fromPeer: requesterId
      }));
    }
  }

  handleUserInfo(ws, message) {
    const { peerId } = message;
    const requesterId = this.getPeerIdByWs(ws);
    
    if (!requesterId) return;

    const targetPeer = this.peers.get(peerId);
    if (targetPeer) {
      // Send user info back to requester
      ws.send(JSON.stringify({
        type: 9, // USER_INFO_RESPONSE
        peerId,
        info: {
          sharedFiles: targetPeer.sharedFiles.length,
          online: true,
          lastSeen: Date.now()
        }
      }));
    }
  }

  handleDisconnection(ws) {
    const peerId = this.getPeerIdByWs(ws);
    if (peerId) {
      this.peers.delete(peerId);
      this.sharedFiles.delete(peerId);
      console.log(`Peer ${peerId} disconnected`);
    }
  }

  broadcastToAll(message, excludePeerId = null) {
    this.peers.forEach((peer, peerId) => {
      if (peerId !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify(message));
      }
    });
  }

  getPeerIdByWs(ws) {
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.ws === ws) return peerId;
    }
    return null;
  }

  getPeerAddress(ws) {
    // Simplified address extraction
    return ws._socket.remoteAddress + ':' + ws._socket.remotePort;
  }

  getStats() {
    return {
      totalPeers: this.peers.size,
      totalFiles: Array.from(this.sharedFiles.values()).reduce((sum, files) => sum + files.length, 0),
      activeSearches: this.searchRequests.size
    };
  }
}

// Start tracker if run directly
if (require.main === module) {
  const tracker = new SoulSeekTracker(8080);
  tracker.start();
}

module.exports = SoulSeekTracker;
