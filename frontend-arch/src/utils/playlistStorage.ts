import { getGunRefs, saveToGun, getFromGun, listenToGun } from './gunConfig';

export interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverArt?: string;
  audioUrl: string;
  genre: string;
  mood: string;
<<<<<<< HEAD
  // WebTorrent metadata (optional)
  magnet?: string;
  infoHash?: string;
  pieceLength?: number;
  webSeeds?: string[];
  // Encryption and pricing (optional)
  encryption?: { algo: 'AES-CTR'; keyId: string };
  priceXfg?: string; // decimal string
=======
>>>>>>> e7717dc5f46ac820799332ffaa2c679160691d7b
}

export interface DIGMPlaylist {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  creatorType: 'artist' | 'listener';
  tracks: PlaylistTrack[];
  genre: string;
  mood: string;
  tags: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  curationSchedule?: {
    enabled: boolean;
    timeSlots: any[];
    totalHoursPerDay: number;
    daysActive: string[];
  };
  stats: {
    totalPlays: number;
    totalListeners: number;
    totalHours: number;
    followers: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface CurationTimeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
}

class PlaylistStorageService {
  private playlistsRef: any = null;
  private curationRef: any = null;

  private async initializeRefs() {
    if (!this.playlistsRef || !this.curationRef) {
      const refs = await getGunRefs();
      this.playlistsRef = refs.playlists;
      this.curationRef = refs.curation;
    }
  }

  // Save a new playlist
  async savePlaylist(playlist: DIGMPlaylist): Promise<void> {
    try {
      await this.initializeRefs();
      const playlistRef = this.playlistsRef.get(playlist.id);
      await saveToGun(playlistRef, playlist);
      console.log('Playlist saved to GUN:', playlist.id);
    } catch (error) {
      console.error('Error saving playlist to GUN:', error);
      throw error;
    }
  }

  // Get a playlist by ID
  async getPlaylist(playlistId: string): Promise<DIGMPlaylist | null> {
    try {
      await this.initializeRefs();
      const playlistRef = this.playlistsRef.get(playlistId);
      const playlist = await getFromGun(playlistRef);
      return playlist || null;
    } catch (error) {
      console.error('Error getting playlist from GUN:', error);
      return null;
    }
  }

  // Get all playlists
  async getAllPlaylists(): Promise<DIGMPlaylist[]> {
    try {
      await this.initializeRefs();
      const playlists = await getFromGun(this.playlistsRef);
      if (!playlists) return [];
      
      // Convert GUN data structure to array
      const playlistArray: DIGMPlaylist[] = [];
      Object.keys(playlists).forEach(key => {
        if (key !== '_' && playlists[key]) {
          playlistArray.push(playlists[key]);
        }
      });
      
      return playlistArray.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error getting all playlists from GUN:', error);
      return [];
    }
  }

  // Get playlists by status
  async getPlaylistsByStatus(status: DIGMPlaylist['status']): Promise<DIGMPlaylist[]> {
    try {
      const allPlaylists = await this.getAllPlaylists();
      return allPlaylists.filter(playlist => playlist.status === status);
    } catch (error) {
      console.error('Error getting playlists by status:', error);
      return [];
    }
  }

  // Get playlists by creator
  async getPlaylistsByCreator(creatorAddress: string): Promise<DIGMPlaylist[]> {
    try {
      const allPlaylists = await this.getAllPlaylists();
      return allPlaylists.filter(playlist => playlist.createdBy === creatorAddress);
    } catch (error) {
      console.error('Error getting playlists by creator:', error);
      return [];
    }
  }

  // Update playlist status
  async updatePlaylistStatus(playlistId: string, status: DIGMPlaylist['status']): Promise<void> {
    try {
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      playlist.status = status;
      playlist.updatedAt = Date.now();
      await this.savePlaylist(playlist);
      console.log('Playlist status updated:', playlistId, status);
    } catch (error) {
      console.error('Error updating playlist status:', error);
      throw error;
    }
  }

  // Listen for real-time playlist updates
  async onPlaylistUpdate(callback: (playlist: DIGMPlaylist) => void): Promise<void> {
    await this.initializeRefs();
    this.playlistsRef.on((data: any) => {
      if (data) {
        Object.keys(data).forEach(key => {
          if (key !== '_' && data[key]) {
            callback(data[key]);
          }
        });
      }
    });
  }

  // Listen for real-time curation updates
  async onCurationUpdate(callback: (curationData: any) => void): Promise<void> {
    await this.initializeRefs();
    this.curationRef.on((data: any) => {
      if (data) {
        callback(data);
      }
    });
  }

  // Save curation data
  async saveCurationData(data: any): Promise<void> {
    try {
      await this.initializeRefs();
      await saveToGun(this.curationRef, data);
      console.log('Curation data saved to GUN');
    } catch (error) {
      console.error('Error saving curation data to GUN:', error);
      throw error;
    }
  }

  // Get curation data
  async getCurationData(): Promise<any> {
    try {
      await this.initializeRefs();
      return await getFromGun(this.curationRef);
    } catch (error) {
      console.error('Error getting curation data from GUN:', error);
      return null;
    }
  }

  // Search playlists by genre, mood, or tags
  async searchPlaylists(query: string): Promise<DIGMPlaylist[]> {
    try {
      const allPlaylists = await this.getAllPlaylists();
      const lowerQuery = query.toLowerCase();
      
      return allPlaylists.filter(playlist => 
        playlist.name.toLowerCase().includes(lowerQuery) ||
        playlist.description.toLowerCase().includes(lowerQuery) ||
        playlist.genre.toLowerCase().includes(lowerQuery) ||
        playlist.mood.toLowerCase().includes(lowerQuery) ||
        playlist.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      console.error('Error searching playlists:', error);
      return [];
    }
  }

  // Get playlists with curation enabled
  async getCurationEnabledPlaylists(): Promise<DIGMPlaylist[]> {
    try {
      const allPlaylists = await this.getAllPlaylists();
      return allPlaylists.filter(playlist => 
        playlist.curationSchedule?.enabled === true
      );
    } catch (error) {
      console.error('Error getting curation enabled playlists:', error);
      return [];
    }
  }

  // Update playlist stats
  async updatePlaylistStats(playlistId: string, stats: Partial<DIGMPlaylist['stats']>): Promise<void> {
    try {
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      playlist.stats = { ...playlist.stats, ...stats };
      playlist.updatedAt = Date.now();
      await this.savePlaylist(playlist);
      console.log('Playlist stats updated:', playlistId);
    } catch (error) {
      console.error('Error updating playlist stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const playlistStorage = new PlaylistStorageService();
export default playlistStorage;

