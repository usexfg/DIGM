# GUN Implementation Plan for DIGM Platform

## Overview
This document outlines the implementation plan for integrating GUN (Graph Database) into the DIGM platform's Fuego XFG P2P network for decentralized audio file storage and real-time synchronization.

## How GUN Storage Works

**GUN is a decentralized database that requires network connectivity from day one:**

1. **Local Storage**: Data is stored locally on each peer's device (browser/Node.js)
2. **Peer-to-Peer Sync**: Data automatically syncs between connected peers in real-time
3. **Relay Servers**: Uses public/private relay servers to bridge peers that can't connect directly
4. **No Central Server**: Data exists on multiple peers simultaneously for redundancy
5. **Network Dependency**: GUN needs active peer connections to function as intended

**Why Fuego XFG Integration Must Start in Phase 1:**
- Without peer connections, GUN would only provide local storage
- Real-time synchronization requires active network participation
- Data replication and redundancy depend on network connectivity
- The decentralized nature of GUN is only realized through peer-to-peer connections

## Goals
- Replace simple storage with GUN-based P2P storage
- Integrate with Fuego XFG network from the beginning
- Provide real-time audio file synchronization across the network
- Enable decentralized metadata management
- Support artist collaboration features
- Ensure network reliability and fallback mechanisms

---

## Phase 1: Foundation with Fuego XFG Integration

### 1.1 Install Dependencies
```bash
# Install GUN and related packages
npm install gun
npm install @gun-js/sea  # Security, encryption, authorization
npm install @gun-js/axe  # Advanced routing
npm install @gun-js/radisk  # Persistent storage
```

### 1.2 Create Fuego XFG Network Discovery
```typescript
// frontend/src/utils/fuegoDiscovery.ts
export interface FuegoPeer {
  id: string
  address: string
  port: number
  publicKey: string
  lastSeen: number
}

export class FuegoDiscovery {
  private fuegoNetwork: string
  private discoveryNodes: string[]
  private knownPeers: Map<string, FuegoPeer>
  
  constructor() {
    this.fuegoNetwork = 'xfg-mainnet'
    this.discoveryNodes = [
      'https://fuego-xfg-bootstrap1.com',
      'https://fuego-xfg-bootstrap2.com',
      'https://fuego-xfg-bootstrap3.com'
    ]
    this.knownPeers = new Map()
  }

  async discoverPeers(): Promise<string[]> {
    const peers: string[] = []

    // Discover peers from Fuego XFG network
    for (const node of this.discoveryNodes) {
      try {
        const response = await fetch(`${node}/api/peers?network=${this.fuegoNetwork}`)
        const data = await response.json()
        
        data.peers.forEach((peer: FuegoPeer) => {
          const peerUrl = `http://${peer.address}:${peer.port}/gun`
          peers.push(peerUrl)
          this.knownPeers.set(peer.id, peer)
        })
      } catch (error) {
        console.warn(`Failed to discover peers from ${node}:`, error)
      }
    }

    // Add fallback peers for reliability
    peers.push(
      'https://gun-manhattan.herokuapp.com/gun',
      'https://gun-us.herokuapp.com/gun'
    )

    return peers
  }

  async registerPeer(peerUrl: string): Promise<void> {
    for (const node of this.discoveryNodes) {
      try {
        await fetch(`${node}/api/peers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            peer: peerUrl,
            network: this.fuegoNetwork,
            timestamp: Date.now()
          })
        })
      } catch (error) {
        console.warn(`Failed to register peer with ${node}:`, error)
      }
    }
  }

  getNetworkStatus(): { connected: boolean; peerCount: number; network: string } {
    return {
      connected: this.knownPeers.size > 0,
      peerCount: this.knownPeers.size,
      network: this.fuegoNetwork
    }
  }
}
```

### 1.3 Create GUN Configuration with Fuego Integration
```typescript
// frontend/src/utils/gunConfig.ts
import Gun from 'gun/gun'
import 'gun/sea'
import 'gun/axe'
import 'gun/radisk'
import { FuegoDiscovery } from './fuegoDiscovery'

export interface GunConfig {
  peers: string[]
  localStorage: boolean
  radisk: boolean
  axe: boolean
  encryption: boolean
  fuego: {
    network: string
    discovery: boolean
    bootstrap: boolean
  }
}

export const createGunInstance = async (config: GunConfig) => {
  // Initialize Fuego discovery
  const fuegoDiscovery = new FuegoDiscovery()
  
  // Discover Fuego XFG peers
  const fuegoPeers = await fuegoDiscovery.discoverPeers()
  
  // Combine Fuego peers with fallback peers
  const allPeers = [...fuegoPeers, ...config.peers]

  const gun = Gun({
    peers: allPeers,
    localStorage: config.localStorage,
    radisk: config.radisk,
    axe: config.axe,
    // Fuego XFG specific configuration
    fuego: {
      network: config.fuego.network,
      discovery: config.fuego.discovery,
      bootstrap: config.fuego.bootstrap
    }
  })

  // Register this peer with Fuego network
  if (config.fuego.discovery) {
    await fuegoDiscovery.registerPeer(window.location.origin + '/gun')
  }

  return gun
}

// Default configuration for DIGM with Fuego XFG
export const digmGunConfig: GunConfig = {
  peers: [
    // Fallback peers (used if Fuego discovery fails)
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun'
  ],
  localStorage: true,
  radisk: true,
  axe: true,
  encryption: true,
  fuego: {
    network: 'xfg-mainnet',
    discovery: true,
    bootstrap: true
  }
}
```

### 1.3 Create GUN Storage Service
```typescript
// frontend/src/utils/gunStorage.ts
import Gun from 'gun/gun'
import SEA from 'gun/sea'
import { createGunInstance, digmGunConfig } from './gunConfig'

export interface GunFile {
  id: string
  name: string
  type: string
  size: number
  data: any
  metadata: AudioMetadata
  uploadedAt: number
  uploadedBy: string
  hash: string
}

export interface AudioMetadata {
  title: string
  artist: string
  genre: string
  duration: number
  bpm?: number
  key?: string
  tags: string[]
  price: number
  isPremium: boolean
  coverArt?: string
}

export class GunStorageService {
  private gun: any
  private user: any
  private audioFiles: any
  private metadata: any
  private playlists: any
  private artists: any
  private fuegoDiscovery: FuegoDiscovery

  constructor() {
    this.fuegoDiscovery = new FuegoDiscovery()
    this.initializeGun()
  }

  private async initializeGun() {
    this.gun = await createGunInstance(digmGunConfig)
    this.initializeCollections()
  }

  private async ensureGunReady() {
    if (!this.gun) {
      await this.initializeGun()
    }
  }

  private initializeCollections() {
    // Initialize GUN collections
    this.audioFiles = this.gun.get('digm-audio-files')
    this.metadata = this.gun.get('digm-metadata')
    this.playlists = this.gun.get('digm-playlists')
    this.artists = this.gun.get('digm-artists')
  }

  // User authentication
  async authenticateUser(evmAddress: string, signature: string) {
    this.user = this.gun.user()
    
    return new Promise((resolve, reject) => {
      this.user.auth(evmAddress, signature, (ack: any) => {
        if (ack.err) {
          reject(ack.err)
        } else {
          resolve(ack)
        }
      })
    })
  }

  // Store audio file
  async storeAudioFile(file: File, metadata: AudioMetadata): Promise<string> {
    await this.ensureGunReady()
    
    const fileId = this.generateFileId()
    const fileData = await this.fileToArrayBuffer(file)
    const fileHash = await this.calculateHash(fileData)

    const gunFile: GunFile = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      data: fileData,
      metadata,
      uploadedAt: Date.now(),
      uploadedBy: this.user.is.pub,
      hash: fileHash
    }

    // Store file data
    this.audioFiles.get(fileId).put(gunFile)
    
    // Store metadata separately for faster queries
    this.metadata.get(fileId).put(metadata)

    // Update artist's file list
    this.artists.get(metadata.artist).get('files').set(fileId)

    return fileId
  }

  // Get audio file
  async getAudioFile(fileId: string): Promise<GunFile | null> {
    await this.ensureGunReady()
    
    return new Promise((resolve) => {
      this.audioFiles.get(fileId).once((file: GunFile) => {
        if (file && file.id) {
          resolve(file)
        } else {
          resolve(null)
        }
      })
    })
  }

  // Get network status
  getNetworkStatus(): { connected: boolean; peerCount: number; network: string } {
    return this.fuegoDiscovery.getNetworkStatus()
  }

  // Get file metadata
  async getMetadata(fileId: string): Promise<AudioMetadata | null> {
    return new Promise((resolve) => {
      this.metadata.get(fileId).once((meta: AudioMetadata) => {
        if (meta && meta.title) {
          resolve(meta)
        } else {
          resolve(null)
        }
      })
    })
  }

  // List files by artist
  async getArtistFiles(artistName: string): Promise<GunFile[]> {
    return new Promise((resolve) => {
      this.artists.get(artistName).get('files').once((fileIds: any) => {
        const files: GunFile[] = []
        let count = 0
        const total = Object.keys(fileIds).length

        if (total === 0) {
          resolve(files)
          return
        }

        Object.keys(fileIds).forEach((fileId) => {
          this.getAudioFile(fileId).then((file) => {
            if (file) files.push(file)
            count++
            if (count === total) {
              resolve(files)
            }
          })
        })
      })
    })
  }

  // Search files
  async searchFiles(query: string): Promise<GunFile[]> {
    return new Promise((resolve) => {
      const results: GunFile[] = []
      
      this.metadata.map().once((metadata: AudioMetadata, key: string) => {
        if (metadata && this.matchesSearch(metadata, query)) {
          this.getAudioFile(key).then((file) => {
            if (file) results.push(file)
          })
        }
      })

      // Wait a bit for results to come in
      setTimeout(() => resolve(results), 1000)
    })
  }

  // Create playlist
  async createPlaylist(name: string, description: string, fileIds: string[]): Promise<string> {
    const playlistId = this.generatePlaylistId()
    
    const playlist = {
      id: playlistId,
      name,
      description,
      fileIds,
      createdBy: this.user.is.pub,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    this.playlists.get(playlistId).put(playlist)
    return playlistId
  }

  // Helper methods
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generatePlaylistId(): string {
    return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  private async calculateHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private matchesSearch(metadata: AudioMetadata, query: string): boolean {
    const searchTerm = query.toLowerCase()
    return (
      metadata.title.toLowerCase().includes(searchTerm) ||
      metadata.artist.toLowerCase().includes(searchTerm) ||
      metadata.genre.toLowerCase().includes(searchTerm) ||
      metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }
}

// Singleton instance
export const gunStorage = new GunStorageService()
```

---

## Phase 2: Integration with Upload System

### 2.1 Update File Upload Utilities
```typescript
// frontend/src/utils/fileUpload.ts
// Add GUN upload function
export const gunStorageUpload = async (
  file: File,
  type: 'audio' | 'image',
  metadata: any,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> => {
  // Import GUN storage
  const { gunStorage } = await import('./gunStorage')
  
  // Validate file
  const validation = validateFile(file, type)
  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
  }

  // Simulate progress
  const total = file.size
  let loaded = 0
  
  const progressInterval = setInterval(() => {
    loaded += Math.random() * (total / 10)
    if (loaded >= total) {
      loaded = total
      clearInterval(progressInterval)
    }
    
    onProgress?.({
      loaded: Math.floor(loaded),
      total,
      percentage: Math.floor((loaded / total) * 100)
    })
  }, 100)

  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  clearInterval(progressInterval)

  // Process file metadata
  let duration: number | undefined
  let dimensions: { width: number; height: number } | undefined
  let thumbnail: string | undefined

  if (type === 'audio') {
    try {
      duration = await getAudioDuration(file)
    } catch (error) {
      console.warn('Failed to get audio duration:', error)
    }
  }

  if (type === 'image') {
    try {
      dimensions = await getImageDimensions(file)
      thumbnail = await createThumbnail(file)
    } catch (error) {
      console.warn('Failed to process image:', error)
    }
  }

  // Prepare metadata for GUN
  const gunMetadata = {
    title: metadata.title || file.name,
    artist: metadata.artist || 'Unknown Artist',
    genre: metadata.genre || 'Unknown',
    duration,
    tags: metadata.tags || [],
    price: metadata.price || 0,
    isPremium: metadata.isPremium || false,
    coverArt: thumbnail,
    uploadedAt: new Date().toISOString()
  }

  // Store in GUN
  const fileId = await gunStorage.storeAudioFile(file, gunMetadata)

  const uploadedFile: UploadedFile = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type,
    url: `gun://${fileId}`, // GUN protocol URL
    thumbnail,
    duration,
    dimensions,
    uploadedAt: new Date()
  }

  return uploadedFile
}
```

### 2.2 Update Upload Components
```typescript
// frontend/src/components/FileUpload.tsx
// Update to use GUN storage
const handleFileSelect = useCallback(async (file: File) => {
  // ... validation code ...

  try {
    // Use GUN storage upload
    const { gunStorageUpload } = await import('../utils/fileUpload')
    const uploadedFile = await gunStorageUpload(file, type, {
      title: file.name,
      artist: 'Current Artist', // Get from user context
      genre: 'Unknown',
      price: 0,
      isPremium: false
    }, (progress) => {
      setUploadProgress(progress)
    })

    onFileUploaded(uploadedFile)
    setValidation(null)
    setUploadProgress(null)
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Upload failed')
  } finally {
    setIsUploading(false)
  }
}, [type, onFileUploaded, onError])
```

---

## Phase 3: Real-time Features

### 3.1 Create Real-time Audio Player
```typescript
// frontend/src/components/GunAudioPlayer.tsx
import React, { useState, useEffect, useRef } from 'react'
import { gunStorage } from '../utils/gunStorage'

interface GunAudioPlayerProps {
  fileId: string
  autoPlay?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

const GunAudioPlayer: React.FC<GunAudioPlayerProps> = ({
  fileId,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded
}) => {
  const [audioFile, setAudioFile] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    loadAudioFile()
  }, [fileId])

  const loadAudioFile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load file and metadata in parallel
      const [file, meta] = await Promise.all([
        gunStorage.getAudioFile(fileId),
        gunStorage.getMetadata(fileId)
      ])

      if (!file) {
        setError('Audio file not found')
        return
      }

      setAudioFile(file)
      setMetadata(meta)

      // Create blob URL for audio element
      if (file.data) {
        const blob = new Blob([file.data], { type: file.type })
        const url = URL.createObjectURL(blob)
        
        if (audioRef.current) {
          audioRef.current.src = url
        }
      }
    } catch (err) {
      setError('Failed to load audio file')
      console.error('Error loading audio file:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlay = () => {
    onPlay?.()
  }

  const handlePause = () => {
    onPause?.()
  }

  const handleEnded = () => {
    onEnded?.()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-slate-400">Loading audio...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Audio Info */}
      {metadata && (
        <div className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-200">{metadata.title}</h3>
          <p className="text-slate-400">{metadata.artist}</p>
          <p className="text-slate-500 text-sm">{metadata.genre}</p>
          {metadata.duration && (
            <p className="text-slate-500 text-sm">
              Duration: {Math.round(metadata.duration)}s
            </p>
          )}
        </div>
      )}

      {/* Audio Player */}
      <audio
        ref={audioRef}
        controls
        autoPlay={autoPlay}
        className="w-full"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

export default GunAudioPlayer
```

### 3.2 Create Real-time File Browser
```typescript
// frontend/src/components/GunFileBrowser.tsx
import React, { useState, useEffect } from 'react'
import { gunStorage } from '../utils/gunStorage'
import GunAudioPlayer from './GunAudioPlayer'

interface GunFileBrowserProps {
  artistFilter?: string
  genreFilter?: string
  searchQuery?: string
}

const GunFileBrowser: React.FC<GunFileBrowserProps> = ({
  artistFilter,
  genreFilter,
  searchQuery
}) => {
  const [files, setFiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [artistFilter, genreFilter, searchQuery])

  const loadFiles = async () => {
    setIsLoading(true)
    
    try {
      let fileList: any[] = []

      if (artistFilter) {
        fileList = await gunStorage.getArtistFiles(artistFilter)
      } else if (searchQuery) {
        fileList = await gunStorage.searchFiles(searchQuery)
      } else {
        // Load all files (implement pagination for large datasets)
        fileList = await gunStorage.getAllFiles()
      }

      // Apply genre filter
      if (genreFilter) {
        fileList = fileList.filter(file => 
          file.metadata?.genre?.toLowerCase() === genreFilter.toLowerCase()
        )
      }

      setFiles(fileList)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-slate-400">Loading files...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* File List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-all duration-200 cursor-pointer"
            onClick={() => handleFileSelect(file.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">🎵</div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 font-medium truncate">
                  {file.metadata?.title || file.name}
                </p>
                <p className="text-slate-500 text-sm">
                  {file.metadata?.artist || 'Unknown Artist'}
                </p>
                <p className="text-slate-500 text-sm">
                  {file.metadata?.genre || 'Unknown Genre'}
                </p>
                <p className="text-slate-500 text-xs">
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Audio Player */}
      {selectedFile && (
        <div className="mt-6">
          <GunAudioPlayer fileId={selectedFile} />
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-12 bg-slate-800/30 border border-slate-600 rounded-lg">
          <div className="text-4xl mb-4">🎵</div>
          <p className="text-slate-400">No audio files found</p>
          <p className="text-slate-500 text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  )
}

export default GunFileBrowser
```

---

## Phase 4: Fuego XFG Network Integration

### 4.1 Create Fuego XFG Peer Discovery
```typescript
// frontend/src/utils/fuegoDiscovery.ts
export class FuegoDiscovery {
  private fuegoNetwork: string
  private discoveryNodes: string[]

  constructor() {
    this.fuegoNetwork = 'xfg-mainnet'
    this.discoveryNodes = [
      'https://fuego-xfg-bootstrap1.com',
      'https://fuego-xfg-bootstrap2.com',
      'https://fuego-xfg-bootstrap3.com'
    ]
  }

  async discoverPeers(): Promise<string[]> {
    const peers: string[] = []

    for (const node of this.discoveryNodes) {
      try {
        const response = await fetch(`${node}/api/peers`)
        const data = await response.json()
        peers.push(...data.peers)
      } catch (error) {
        console.warn(`Failed to discover peers from ${node}:`, error)
      }
    }

    return peers
  }

  async registerPeer(peerUrl: string): Promise<void> {
    for (const node of this.discoveryNodes) {
      try {
        await fetch(`${node}/api/peers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peer: peerUrl })
        })
      } catch (error) {
        console.warn(`Failed to register peer with ${node}:`, error)
      }
    }
  }
}
```

### 4.2 Update GUN Configuration for Fuego
```typescript
// frontend/src/utils/gunConfig.ts
import { FuegoDiscovery } from './fuegoDiscovery'

export const createFuegoGunInstance = async () => {
  const discovery = new FuegoDiscovery()
  const peers = await discovery.discoverPeers()

  const gun = Gun({
    peers: [
      ...peers,
      // Fallback peers
      'https://fuego-xfg-peer1.com/gun',
      'https://fuego-xfg-peer2.com/gun'
    ],
    localStorage: true,
    radisk: true,
    axe: true,
    fuego: {
      network: 'xfg-mainnet',
      discovery: 'fuego-discovery',
      bootstrap: true
    }
  })

  // Register this peer with Fuego network
  await discovery.registerPeer(window.location.origin + '/gun')

  return gun
}
```

---

## Phase 5: Advanced Features

### 5.1 Collaborative Radio Stations (Enhanced Paradio)
```typescript
// frontend/src/components/CollaborativeParadio.tsx
import React, { useState, useEffect } from 'react'
import { gunStorage } from '../utils/gunStorage'

interface CollaborativeStation {
  id: string
  name: string
  description: string
  createdBy: string
  collaborators: string[]
  currentTrack: string
  queue: string[]
  listeners: number
  isLive: boolean
  genre: string
  tags: string[]
}

const CollaborativeParadio: React.FC = () => {
  const [stations, setStations] = useState<CollaborativeStation[]>([])
  const [selectedStation, setSelectedStation] = useState<CollaborativeStation | null>(null)
  const [isDJ, setIsDJ] = useState(false)

  useEffect(() => {
    loadStations()
  }, [])

  const loadStations = () => {
    // Real-time station updates
    gunStorage.gun.get('digm-radio-stations').map().once((station: CollaborativeStation) => {
      if (station && station.name) {
        setStations(prev => {
          const existing = prev.find(s => s.id === station.id)
          if (existing) {
            return prev.map(s => s.id === station.id ? station : s)
          } else {
            return [...prev, station]
          }
        })
      }
    })
  }

  const createStation = async () => {
    const name = prompt('Enter station name:')
    if (!name) return

    const station: CollaborativeStation = {
      id: crypto.randomUUID(),
      name,
      description: 'Collaborative radio station',
      createdBy: gunStorage.user.is.pub,
      collaborators: [gunStorage.user.is.pub],
      currentTrack: '',
      queue: [],
      listeners: 0,
      isLive: false,
      genre: 'mixed',
      tags: []
    }

    gunStorage.gun.get('paradio-stations').get(station.id).put(station)
  }

  const joinAsDJ = (stationId: string) => {
    gunStorage.gun.get('paradio-stations').get(stationId).get('collaborators').set(gunStorage.user.is.pub)
    setIsDJ(true)
  }

  const addToQueue = (stationId: string, trackId: string) => {
    gunStorage.gun.get('paradio-stations').get(stationId).get('queue').set(trackId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-200">Collaborative Radio Stations</h2>
        <button onClick={createStation} className="btn-primary">
          Create Station
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.map((station) => (
          <div
            key={station.id}
            className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedStation(station)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-slate-200">{station.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                station.isLive ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
              }`}>
                {station.isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-slate-500 text-sm">{station.description}</p>
            <p className="text-slate-500 text-xs">
              {station.listeners} listeners • {station.queue.length} in queue
            </p>
            <p className="text-slate-500 text-xs">
              {station.collaborators.length} DJs
            </p>
          </div>
        ))}
      </div>

      {selectedStation && (
        <div className="mt-6 p-4 bg-slate-800/30 border border-slate-600 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            {selectedStation.name}
          </h3>
          
          {/* Current Track */}
          {selectedStation.currentTrack && (
            <div className="mb-4">
              <h4 className="text-slate-300 font-medium">Now Playing</h4>
              <p className="text-slate-400">{selectedStation.currentTrack}</p>
            </div>
          )}

          {/* Queue */}
          <div className="mb-4">
            <h4 className="text-slate-300 font-medium">Queue ({selectedStation.queue.length})</h4>
            <div className="space-y-2">
              {selectedStation.queue.map((trackId, index) => (
                <div key={trackId} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <span className="text-slate-400">Track {index + 1}</span>
                  <button 
                    className="text-red-400 hover:text-red-300 text-sm"
                    onClick={() => {/* Remove from queue */}}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* DJ Controls */}
          {selectedStation.collaborators.includes(gunStorage.user.is.pub) && (
            <div className="space-y-2">
              <h4 className="text-slate-300 font-medium">DJ Controls</h4>
              <button className="btn-primary text-sm">
                Add Track to Queue
              </button>
              <button className="btn-secondary text-sm">
                Take DJ Turn
              </button>
            </div>
          )}

          {/* Join as DJ */}
          {!selectedStation.collaborators.includes(gunStorage.user.is.pub) && (
            <button 
              onClick={() => joinAsDJ(selectedStation.id)}
              className="btn-secondary text-sm"
            >
              Join as DJ
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CollaborativeParadio
```

### 5.2 Playlist-Centered Curation System
```typescript
// frontend/src/components/PlaylistCuration.tsx
import React, { useState, useEffect } from 'react'
import { gunStorage } from '../utils/gunStorage'

interface DIGMPlaylist {
  id: string
  name: string
  description: string
  createdBy: string
  creatorType: 'artist' | 'listener' | 'curator'
  tracks: PlaylistTrack[]
  genre: string
  mood: string
  tags: string[]
  isPublic: boolean
  isCurated: boolean
  curatorApproved?: boolean
  curatorId?: string
  stats: {
    plays: number
    likes: number
    shares: number
    followers: number
  }
  revenue: {
    total: number
    creatorShare: number
    curatorShare: number
    platformShare: number
  }
  createdAt: number
  updatedAt: number
}

interface PlaylistTrack {
  id: string
  trackId: string
  position: number
  addedAt: number
  addedBy: string
  note?: string
}

interface CuratorRole {
  id: string
  userId: string
  collateral: number
  status: 'active' | 'suspended' | 'inactive'
  permissions: {
    canApprovePlaylists: boolean
    canRejectPlaylists: boolean
    canFeaturePlaylists: boolean
    canRemovePlaylists: boolean
  }
  stats: {
    playlistsApproved: number
    playlistsRejected: number
    accuracy: number
    totalRewards: number
  }
  createdAt: number
  lastActive: number
}

const PlaylistCuration: React.FC = () => {
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([])
  const [curatorRole, setCuratorRole] = useState<CuratorRole | null>(null)
  const [pendingSubmissions, setPendingSubmissions] = useState<DIGMPlaylist[]>([])

  useEffect(() => {
    loadPlaylists()
    loadCuratorRole()
  }, [])

  const loadPlaylists = () => {
    // Real-time playlist updates
    gunStorage.gun.get('digm-playlists').map().once((playlist: DIGMPlaylist) => {
      if (playlist && playlist.name) {
        setPlaylists(prev => {
          const existing = prev.find(p => p.id === playlist.id)
          if (existing) {
            return prev.map(p => p.id === playlist.id ? playlist : p)
          } else {
            return [...prev, playlist]
          }
        })
      }
    })
  }

  const loadCuratorRole = () => {
    gunStorage.gun.get('digm-curators').get(gunStorage.user.is.pub).once((role: CuratorRole) => {
      if (role && role.userId) {
        setCuratorRole(role)
      }
    })
  }

  const applyForCurator = async () => {
    const collateral = prompt('Enter PARA collateral amount:')
    if (!collateral) return

    const motivation = prompt('Why do you want to be a curator?')
    if (!motivation) return

    const application = {
      id: crypto.randomUUID(),
      userId: gunStorage.user.is.pub,
      collateral: parseInt(collateral),
      motivation,
      experience: 'Music enthusiast with good taste',
      status: 'pending',
      createdAt: Date.now()
    }

    gunStorage.gun.get('digm-curator-applications').get(application.id).put(application)
  }

  const reviewPlaylist = async (playlistId: string, decision: 'approve' | 'reject', notes?: string) => {
    if (!curatorRole) return

    await gunStorage.reviewPlaylist(playlistId, curatorRole.userId, decision, notes)
    
    // Update local state
    setPendingSubmissions(prev => prev.filter(p => p.id !== playlistId))
  }

  const createPlaylist = async () => {
    const name = prompt('Enter playlist name:')
    if (!name) return

    const description = prompt('Enter playlist description:')
    if (!description) return

    const playlist: DIGMPlaylist = {
      id: crypto.randomUUID(),
      name,
      description,
      createdBy: gunStorage.user.is.pub,
      creatorType: 'artist',
      tracks: [],
      genre: '',
      mood: '',
      tags: [],
      isPublic: true,
      isCurated: false,
      stats: { plays: 0, likes: 0, shares: 0, followers: 0 },
      revenue: { total: 0, creatorShare: 0, curatorShare: 0, platformShare: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    gunStorage.gun.get('digm-playlists').get(playlist.id).put(playlist)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-200">Playlist Curation</h2>
        <div className="space-x-2">
          <button onClick={createPlaylist} className="btn-primary">
            Create Playlist
          </button>
          {!curatorRole && (
            <button onClick={applyForCurator} className="btn-secondary">
              Apply for Curator
            </button>
          )}
        </div>
      </div>

      {/* Curator Status */}
      {curatorRole && (
        <div className="p-4 bg-slate-800/30 border border-slate-600 rounded-lg">
          <h3 className="text-slate-300 font-medium mb-2">Curator Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Collateral</p>
              <p className="text-slate-200">{curatorRole.collateral} PARA</p>
            </div>
            <div>
              <p className="text-slate-400">Accuracy</p>
              <p className="text-slate-200">{curatorRole.stats.accuracy}%</p>
            </div>
            <div>
              <p className="text-slate-400">Approved</p>
              <p className="text-slate-200">{curatorRole.stats.playlistsApproved}</p>
            </div>
            <div>
              <p className="text-slate-400">Rewards</p>
              <p className="text-slate-200">{curatorRole.stats.totalRewards} PARA</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Reviews (for curators) */}
      {curatorRole && pendingSubmissions.length > 0 && (
        <div>
          <h3 className="text-slate-300 font-medium mb-4">Pending Reviews ({pendingSubmissions.length})</h3>
          {pendingSubmissions.map(playlist => (
            <div key={playlist.id} className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-slate-200 font-medium">{playlist.name}</h4>
                  <p className="text-slate-500 text-sm">{playlist.description}</p>
                  <p className="text-slate-500 text-xs">
                    {playlist.tracks.length} tracks • {playlist.creatorType}
                  </p>
                </div>
                <div className="text-slate-400 text-xs">
                  {new Date(playlist.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => reviewPlaylist(playlist.id, 'approve')}
                  className="btn-primary text-sm"
                >
                  Approve
                </button>
                <button 
                  onClick={() => reviewPlaylist(playlist.id, 'reject')}
                  className="btn-danger text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Playlists */}
      <div>
        <h3 className="text-slate-300 font-medium mb-4">All Playlists</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(playlist => (
            <div
              key={playlist.id}
              className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-200 font-medium">{playlist.name}</h4>
                {playlist.isCurated && (
                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">CURATED</span>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-2">{playlist.description}</p>
              <p className="text-slate-500 text-xs">
                {playlist.tracks.length} tracks • {playlist.stats.plays} plays
              </p>
              <p className="text-slate-500 text-xs">
                {playlist.creatorType === 'artist' ? 'Artist Playlist' : 'Listener Submission'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PlaylistCuration
```

### 5.3 Real-time Analytics
```typescript
// frontend/src/utils/gunAnalytics.ts
export class GunAnalytics {
  private gun: any

  constructor(gun: any) {
    this.gun = gun
  }

  trackPlay(fileId: string, userId: string) {
    this.gun.get('analytics').get('plays').get(fileId).once((plays: any) => {
      const playCount = (plays?.count || 0) + 1
      this.gun.get('analytics').get('plays').get(fileId).put({
        count: playCount,
        lastPlayed: Date.now(),
        users: { ...plays?.users, [userId]: Date.now() }
      })
    })
  }

  trackUpload(fileId: string, userId: string) {
    this.gun.get('analytics').get('uploads').get(fileId).put({
      uploadedBy: userId,
      uploadedAt: Date.now()
    })
  }

  trackCollaboration(collabId: string, action: string, userId: string) {
    this.gun.get('analytics').get('collaborations').get(collabId).put({
      action,
      userId,
      timestamp: Date.now()
    })
  }

  trackRadioStation(stationId: string, listeners: number) {
    this.gun.get('analytics').get('radio').get(stationId).put({
      listeners,
      timestamp: Date.now()
    })
  }

  getPlayCount(fileId: string): Promise<number> {
    return new Promise((resolve) => {
      this.gun.get('analytics').get('plays').get(fileId).once((plays: any) => {
        resolve(plays?.count || 0)
      })
    })
  }

  getCollaborationStats(collabId: string): Promise<any> {
    return new Promise((resolve) => {
      this.gun.get('analytics').get('collaborations').get(collabId).once((stats: any) => {
        resolve(stats || {})
      })
    })
  }
}
```

---

## Implementation Timeline

### Week 1-2: Foundation with Fuego XFG Integration
- [ ] Install GUN dependencies
- [ ] Create Fuego XFG peer discovery
- [ ] Create GUN configuration with network integration
- [ ] Implement basic storage service with network awareness
- [ ] Test file upload/download with network connectivity

### Week 3-4: Integration & Real-time Features
- [ ] Update upload components to use GUN storage
- [ ] Integrate with existing UI
- [ ] Test real-time features and network sync
- [ ] Implement error handling and fallback mechanisms
- [ ] Create network status monitoring

### Week 5-6: Advanced Features & Optimization
- [ ] Implement collaborative playlists
- [ ] Add real-time analytics
- [ ] Create advanced search with network-wide queries
- [ ] Performance optimization for large networks
- [ ] Network reliability improvements

### Week 7-8: Testing & Deployment
- [ ] Comprehensive testing across network conditions
- [ ] Performance optimization
- [ ] Documentation and user guides
- [ ] Production deployment with monitoring

---

## Success Metrics

### Technical Metrics
- File upload success rate > 95%
- Real-time sync latency < 500ms
- Network discovery time < 5s
- Storage reliability > 99%

### User Experience Metrics
- Upload time < 30s for 10MB files
- Search response time < 2s
- Real-time collaboration lag < 1s
- User satisfaction > 4.5/5

### Network Metrics
- Peer connectivity > 90%
- Data replication factor > 3
- Network uptime > 99.5%
- Cross-region latency < 200ms

---

## Risk Mitigation

### Technical Risks
- **Network instability**: Implement fallback peers
- **Data loss**: Multiple replication strategies
- **Performance issues**: Implement caching and pagination
- **Security vulnerabilities**: Regular security audits

### Operational Risks
- **User adoption**: Gradual migration strategy
- **Data migration**: Backup and rollback procedures
- **Network scaling**: Monitor and optimize performance
- **Cost management**: Efficient resource utilization

This implementation plan provides a comprehensive roadmap for integrating GUN into the DIGM platform while maintaining compatibility with the Fuego XFG network and ensuring a smooth user experience.
