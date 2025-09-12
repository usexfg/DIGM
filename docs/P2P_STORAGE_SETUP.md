# DIGM P2P Storage Setup Guide

## 🏗️ **Architecture Overview**

DIGM uses a hybrid P2P storage system combining:
- **GUN Database**: Real-time metadata and preview audio
- **WebTorrent**: Full audio file distribution  
- **Eldernodes**: Guaranteed content seeding infrastructure

## 📦 **Dependencies**

Add to `frontend-arch/package.json`:
```json
{
  "dependencies": {
    "gun": "^0.2020.1240",
    "webtorrent": "^2.4.0"
  },
  "devDependencies": {
    "@types/webtorrent": "^0.109.0"
  }
}
```

Install:
```bash
cd frontend-arch
npm install gun webtorrent @types/webtorrent
```

## ⚙️ **Environment Configuration**

Create/update `frontend-arch/.env`:
```env
# P2P Network Configuration
VITE_GUN_PEERS=wss://gun1.digm.io/gun,wss://gun2.digm.io/gun,wss://gun3.digm.io/gun
VITE_ELDERNODE_TRACKERS=wss://eldernode1.digm.io:8000,wss://eldernode2.digm.io:8000,wss://eldernode3.digm.io:8000

# Feature Flags
VITE_FEATURE_WEBTORRENT=true
VITE_FEATURE_GUN_STORAGE=true
VITE_FEATURE_ELDERNODE_FALLBACK=true

# Storage Limits
VITE_PREVIEW_AUDIO_MAX_SIZE=1048576  # 1MB max for preview clips
VITE_COVER_IMAGE_MAX_SIZE=51200      # 50KB max for cover images
```

## 🚀 **Basic Usage**

### **1. Initialize Storage**
```typescript
import { gunStorage } from './utils/gunStorage';
import { webTorrentClient } from './utils/webtorrentClient';

// Initialize P2P storage
await gunStorage.initialize();
await webTorrentClient.initialize();

console.log('P2P storage ready!');
```

### **2. Store Album Metadata**
```typescript
const album = {
  albumId: 'album_001',
  title: 'My First Album',
  artistName: 'Artist Name',
  artistId: 'artist_001',
  releaseDate: '2025-01-01',
  genre: ['electronic'],
  priceXFG: 1.5,
  paradioPreviewTrackIds: ['track_001'],
  payment: {
    paymentCode: 'PC01000102a1b2c3...',
    artistKey: '02a1b2c3...'
  },
  createdAt: Date.now(),
  updatedAt: Date.now()
};

await gunStorage.storeAlbum(album);
```

### **3. Store Preview Audio**
```typescript
// Create 30-second preview clip
const previewBase64 = await GUNStorageManager.createPreviewClip(
  audioFile, 
  30, // start at 30 seconds
  30  // 30 second duration
);

await gunStorage.storePreviewAudio('track_001', previewBase64);
```

### **4. Seed Full Audio Files**
```typescript
// Seed full track via WebTorrent
const torrent = await webTorrentClient.seedFile(audioFile, 'album_001');

// Store torrent reference in track metadata
const track = {
  trackId: 'track_001',
  albumId: 'album_001',
  title: 'Track Title',
  durationSec: 180,
  isPreview: true,
  magnetURI: torrent.magnetURI,
  contentHash: 'sha256:abc123...',
  fileSize: audioFile.size,
  createdAt: Date.now()
};

await gunStorage.storeTrack(track);
```

### **5. Play Audio**
```typescript
// Play preview (from GUN)
const previewAudio = await gunStorage.getPreviewAudio('track_001');
if (previewAudio) {
  const audio = new Audio(`data:audio/mp3;base64,${previewAudio}`);
  audio.play();
}

// Play full track (from WebTorrent)
const track = await gunStorage.getTrack('track_001');
if (track?.magnetURI) {
  const mediaSource = await webTorrentClient.streamAudio(track.magnetURI);
  if (mediaSource) {
    const audio = new Audio(URL.createObjectURL(mediaSource));
    audio.play();
  }
}
```

## 🏰 **Eldernode Setup**

### **Eldernode Server** (Node.js)
```typescript
// eldernode-server.ts
import Gun from 'gun';
import WebTorrent from 'webtorrent';
import express from 'express';

const app = express();
const gun = Gun({ port: 8765 });
const client = new WebTorrent();

// Listen for new content to seed
gun.get('seed-requests').map().on((request, albumId) => {
  if (request && request.status === 'pending') {
    console.log(`Eldernode seeding album: ${albumId}`);
    
    // Add torrent and start seeding
    client.add(request.magnetURI, (torrent) => {
      console.log(`Eldernode now seeding: ${torrent.name}`);
      
      // Update status
      gun.get('eldernodes').get('eldernode-1').put({
        nodeId: 'eldernode-1',
        endpoint: 'https://eldernode1.digm.io',
        status: 'active',
        lastSeen: Date.now(),
        seedingCount: client.torrents.length
      });
    });
  }
});

app.listen(8000, () => {
  console.log('Eldernode ready on port 8000');
});
```

### **Deploy Eldernodes**
```bash
# Deploy to VPS/cloud server
git clone https://github.com/digm/eldernode
cd eldernode
npm install
npm run build

# Configure as system service
sudo systemctl enable eldernode
sudo systemctl start eldernode
```

## 📊 **Monitoring**

### **Network Status**
```typescript
// Check P2P network health
const gunStatus = await gunStorage.getNetworkStatus();
const torrentStatus = await webTorrentClient.getNetworkStatus();

console.log('GUN Network:', gunStatus);
console.log('WebTorrent Network:', torrentStatus);
```

### **Storage Usage**
```typescript
// Monitor storage usage
const albums = await gunStorage.getAllAlbums();
console.log(`Albums in network: ${albums.length}`);

// Check specific content availability
const available = await gunStorage.validateContentHash(
  'track_001', 
  'sha256:expected-hash'
);
console.log(`Content integrity: ${available ? 'OK' : 'FAILED'}`);
```

## 🛠️ **Development Mode**

For local development without full Eldernode setup:

```typescript
// Use mock Eldernodes
const mockEldernodes = [
  'ws://localhost:8001',
  'ws://localhost:8002'
];

// Initialize with local peers
const gunStorage = new GUNStorageManager([
  'http://localhost:8765/gun'
]);

const webTorrentClient = new DIGMWebTorrentClient();
webTorrentClient.trackers = mockEldernodes;
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **GUN Connection Failed**
```typescript
// Check peer connectivity
const status = await gunStorage.getNetworkStatus();
if (!status.connected) {
  console.log('Retrying GUN connection...');
  gunStorage.clearLocalCache();
  await gunStorage.initialize();
}
```

#### **WebTorrent Timeout**
```typescript
// Force Eldernode fallback
try {
  const torrent = await webTorrentClient.addTorrent(magnetURI);
} catch (error) {
  console.log('Using Eldernode fallback...');
  const fallback = await webTorrentClient.tryElderNodeFallback(magnetURI);
}
```

#### **Preview Audio Too Large**
```typescript
// Compress preview audio
try {
  await gunStorage.storePreviewAudio(trackId, previewBase64);
} catch (error) {
  if (error.message.includes('too large')) {
    // Create shorter preview
    const shorterPreview = await GUNStorageManager.createPreviewClip(
      audioFile, 30, 15 // 15 seconds instead of 30
    );
    await gunStorage.storePreviewAudio(trackId, shorterPreview);
  }
}
```

## 📈 **Performance Tips**

### **Optimize Preview Storage**
```typescript
// Compress images before storing
const compressedCover = await GUNStorageManager.compressImage(
  coverImageFile, 
  30 // 30KB max
);

// Create efficient preview clips
const preview = await GUNStorageManager.createPreviewClip(
  audioFile,
  Math.floor(audioFile.duration * 0.3), // Start at 30% of track
  30 // 30 second preview
);
```

### **Batch Operations**
```typescript
// Store multiple tracks in parallel
const tracks = await Promise.all(
  trackFiles.map(async (file, index) => {
    const torrent = await webTorrentClient.seedFile(file, albumId);
    return {
      trackId: `track_${index + 1}`,
      albumId,
      magnetURI: torrent.magnetURI,
      // ... other metadata
    };
  })
);

// Store all tracks
await Promise.all(tracks.map(track => gunStorage.storeTrack(track)));
```

## 🎯 **Production Deployment**

### **1. Deploy GUN Peers**
```bash
# Setup GUN relay servers
npm install -g gun
gun --port 8765 --relay
```

### **2. Deploy Eldernodes**
```bash
# Setup dedicated seeding servers
# Minimum 3 Eldernodes for redundancy
# 10TB+ storage per Eldernode recommended
```

### **3. Configure DNS**
```
gun1.digm.io    → GUN relay server 1
gun2.digm.io    → GUN relay server 2
eldernode1.digm.io → Eldernode server 1
eldernode2.digm.io → Eldernode server 2
```

### **4. Monitoring Setup**
```bash
# Setup monitoring for P2P health
# Monitor: peer count, storage usage, seeders per torrent
# Alerts: Eldernode failures, network partitions
```

## ✅ **Ready for Production**

With this setup, DIGM has:
- ✅ **Fully P2P storage** - no CDN dependency
- ✅ **Real-time sync** - metadata propagates instantly
- ✅ **Guaranteed availability** - Eldernodes ensure content access
- ✅ **Infinite scalability** - network grows with users
- ✅ **Cost efficiency** - users provide bandwidth

The platform can handle unlimited albums with guaranteed content availability! 🎵
