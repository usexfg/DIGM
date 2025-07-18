// Mock API Service for DIGM Platform
// This can be replaced with real API calls when backend is ready

import { UploadedFile } from './fileUpload';

export interface TrackUploadData {
  artistAddress: string;
  title: string;
  price: number;
  genre: string;
  description: string;
  audioFile: UploadedFile;
  coverArt?: UploadedFile;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  price: number;
  genre: string;
  coverArt: string;
  audioUrl: string;
  sales: number;
  revenue: number;
  uploadDate: string;
  status: 'published' | 'draft' | 'processing';
}

export interface SalesData {
  totalSales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  topTracks: Track[];
  recentSales: any[];
}

// In-memory storage for development
let tracks: Track[] = [];
let salesData: { [artistAddress: string]: SalesData } = {};

// Simulate API delay
const simulateApiDelay = (ms: number = 1000) => 
  new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000));

// Track Management API
export const trackAPI = {
  // Upload a new track
  async uploadTrack(data: TrackUploadData): Promise<Track> {
    await simulateApiDelay(2000);
    
    const newTrack: Track = {
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      artist: data.artistAddress,
      duration: data.audioFile.duration ? formatDuration(data.audioFile.duration) : 'Unknown',
      price: data.price,
      genre: data.genre,
      coverArt: data.coverArt?.url || '',
      audioUrl: data.audioFile.url,
      sales: 0,
      revenue: 0,
      uploadDate: new Date().toISOString(),
      status: 'published'
    };

    tracks.push(newTrack);
    console.log('Track uploaded:', newTrack);
    
    return newTrack;
  },

  // Get tracks for an artist
  async getArtistTracks(artistAddress: string): Promise<Track[]> {
    await simulateApiDelay(500);
    return tracks.filter(track => track.artist === artistAddress);
  },

  // Update track status
  async updateTrackStatus(trackId: string, status: 'published' | 'unpublish' | 'delete'): Promise<void> {
    await simulateApiDelay(1000);
    
    const trackIndex = tracks.findIndex(track => track.id === trackId);
    if (trackIndex === -1) {
      throw new Error('Track not found');
    }

    if (status === 'delete') {
      tracks.splice(trackIndex, 1);
    } else {
      tracks[trackIndex].status = status === 'unpublish' ? 'draft' : 'published';
    }
  },

  // Get all tracks (for marketplace)
  async getAllTracks(): Promise<Track[]> {
    await simulateApiDelay(500);
    return tracks.filter(track => track.status === 'published');
  }
};

// Sales Analytics API
export const salesAPI = {
  // Get sales data for an artist
  async getArtistSales(artistAddress: string): Promise<SalesData> {
    await simulateApiDelay(800);
    
    if (!salesData[artistAddress]) {
      // Generate mock sales data
      const artistTracks = tracks.filter(track => track.artist === artistAddress);
      const totalSales = Math.floor(Math.random() * 1000);
      const totalRevenue = totalSales * 0.5; // Mock average price
      const monthlyRevenue = totalRevenue * 0.1; // Mock monthly revenue
      
      salesData[artistAddress] = {
        totalSales,
        totalRevenue,
        monthlyRevenue,
        topTracks: artistTracks.slice(0, 5).map(track => ({
          ...track,
          sales: Math.floor(Math.random() * 100),
          revenue: Math.floor(Math.random() * 50)
        })),
        recentSales: Array.from({ length: 5 }, (_, i) => ({
          trackTitle: artistTracks[i % artistTracks.length]?.title || 'Unknown Track',
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: Math.random() * 2
        }))
      };
    }
    
    return salesData[artistAddress];
  },

  // Record a sale
  async recordSale(trackId: string, amount: number): Promise<void> {
    await simulateApiDelay(300);
    
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      track.sales += 1;
      track.revenue += amount;
      
      // Update sales data
      if (salesData[track.artist]) {
        salesData[track.artist].totalSales += 1;
        salesData[track.artist].totalRevenue += amount;
        salesData[track.artist].monthlyRevenue += amount * 0.1;
      }
    }
  }
};

// File Upload API (Mock)
export const uploadAPI = {
  // Upload file to storage
  async uploadFile(file: File, type: 'audio' | 'image'): Promise<UploadedFile> {
    await simulateApiDelay(1500);
    
    // In a real implementation, this would upload to IPFS, S3, or similar
    const fileId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file), // For development, use blob URL
      uploadedAt: new Date()
    };
  },

  // Delete uploaded file
  async deleteFile(fileId: string): Promise<void> {
    await simulateApiDelay(500);
    console.log('File deleted:', fileId);
  }
};

// Utility function for formatting duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Export all APIs
export const api = {
  tracks: trackAPI,
  sales: salesAPI,
  upload: uploadAPI
}; 