import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

interface Track {
  id: string;
  title: string;
  duration: string;
  price: number;
  trackNumber: number;
  isPreview: boolean;
  audioUrl: string;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  artistAddress: string;
  coverArt: string;
  price: number;
  genre: string;
  releaseDate: string;
  trackCount: number;
  totalSales: number;
  totalRevenue: number;
  description: string;
  tracks: Track[];
}

const AlbumPage: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const { evmAddress, stellarAddress } = useWallet();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (albumId) {
      fetchAlbumData(albumId);
    }
  }, [albumId]);

  const fetchAlbumData = async (id: string) => {
    setIsLoading(true);
    try {
      // Mock data for example albums
      const mockAlbums: Record<string, Album> = {
        'digital-dreams-album': {
          id: 'digital-dreams-album',
          title: 'Digital Dreams',
          artist: 'Crypto Beats',
          artistId: 'crypto-beats',
          artistAddress: '0x1234...5678',
          coverArt: '',
          price: 0.05,
          genre: 'Electronic',
          releaseDate: '2024-01-15',
          trackCount: 12,
          totalSales: 127,
          totalRevenue: 6.35,
          description: 'A futuristic electronic album exploring the intersection of technology and human emotion. Each track is crafted with cutting-edge production techniques and innovative sound design.',
          tracks: [
            { id: '1', title: 'Digital Dreams', duration: '3:45', price: 0.05, trackNumber: 1, isPreview: false, audioUrl: '#' },
            { id: '2', title: 'Blockchain Flow', duration: '4:12', price: 0.05, trackNumber: 2, isPreview: true, audioUrl: '#' },
            { id: '3', title: 'Crypto Nights', duration: '3:58', price: 0.05, trackNumber: 3, isPreview: false, audioUrl: '#' },
            { id: '4', title: 'Digital Love', duration: '4:30', price: 0.05, trackNumber: 4, isPreview: false, audioUrl: '#' },
            { id: '5', title: 'Future Bass', duration: '3:22', price: 0.05, trackNumber: 5, isPreview: true, audioUrl: '#' },
            { id: '6', title: 'Tech Soul', duration: '4:15', price: 0.05, trackNumber: 6, isPreview: false, audioUrl: '#' },
            { id: '7', title: 'Digital Rain', duration: '3:50', price: 0.05, trackNumber: 7, isPreview: false, audioUrl: '#' },
            { id: '8', title: 'Crypto Vibes', duration: '4:08', price: 0.05, trackNumber: 8, isPreview: true, audioUrl: '#' },
            { id: '9', title: 'Future Dreams', duration: '3:35', price: 0.05, trackNumber: 9, isPreview: false, audioUrl: '#' },
            { id: '10', title: 'Digital World', duration: '4:20', price: 0.05, trackNumber: 10, isPreview: false, audioUrl: '#' },
            { id: '11', title: 'Tech Future', duration: '3:45', price: 0.05, trackNumber: 11, isPreview: true, audioUrl: '#' },
            { id: '12', title: 'Digital End', duration: '4:05', price: 0.05, trackNumber: 12, isPreview: false, audioUrl: '#' }
          ]
        },
        'fuego-flow-album': {
          id: 'fuego-flow-album',
          title: 'Fuego Flow',
          artist: 'Heat Wave',
          artistId: 'heat-wave',
          artistAddress: '0x8765...4321',
          coverArt: '',
          price: 0.08,
          genre: 'Hip Hop',
          releaseDate: '2024-01-20',
          trackCount: 15,
          totalSales: 89,
          totalRevenue: 7.12,
          description: 'Hot beats with fire energy - the definitive Heat Wave experience. Every track brings the heat with authentic hip-hop vibes and modern blockchain culture.',
          tracks: [
            { id: '1', title: 'Fuego Flow', duration: '4:20', price: 0.08, trackNumber: 1, isPreview: false, audioUrl: '#' },
            { id: '2', title: 'Heat Wave', duration: '3:45', price: 0.08, trackNumber: 2, isPreview: true, audioUrl: '#' },
            { id: '3', title: 'Fire Starter', duration: '4:15', price: 0.08, trackNumber: 3, isPreview: false, audioUrl: '#' },
            { id: '4', title: 'Hot Money', duration: '3:50', price: 0.08, trackNumber: 4, isPreview: false, audioUrl: '#' },
            { id: '5', title: 'Burn It Down', duration: '4:10', price: 0.08, trackNumber: 5, isPreview: true, audioUrl: '#' },
            { id: '6', title: 'Flame Thrower', duration: '3:35', price: 0.08, trackNumber: 6, isPreview: false, audioUrl: '#' },
            { id: '7', title: 'Heat Check', duration: '4:25', price: 0.08, trackNumber: 7, isPreview: false, audioUrl: '#' },
            { id: '8', title: 'Fire Power', duration: '3:40', price: 0.08, trackNumber: 8, isPreview: true, audioUrl: '#' },
            { id: '9', title: 'Hot Sauce', duration: '4:05', price: 0.08, trackNumber: 9, isPreview: false, audioUrl: '#' },
            { id: '10', title: 'Burn Notice', duration: '3:55', price: 0.08, trackNumber: 10, isPreview: false, audioUrl: '#' },
            { id: '11', title: 'Fire Squad', duration: '4:15', price: 0.08, trackNumber: 11, isPreview: true, audioUrl: '#' },
            { id: '12', title: 'Heat Seeker', duration: '3:30', price: 0.08, trackNumber: 12, isPreview: false, audioUrl: '#' },
            { id: '13', title: 'Flame On', duration: '4:20', price: 0.08, trackNumber: 13, isPreview: false, audioUrl: '#' },
            { id: '14', title: 'Hot Pursuit', duration: '3:45', price: 0.08, trackNumber: 14, isPreview: true, audioUrl: '#' },
            { id: '15', title: 'Fire Finale', duration: '4:10', price: 0.08, trackNumber: 15, isPreview: false, audioUrl: '#' }
          ]
        },
        'stellar-symphony-album': {
          id: 'stellar-symphony-album',
          title: 'Stellar Symphony',
          artist: 'Cosmic DJ',
          artistId: 'cosmic-dj',
          artistAddress: '0x9999...8888',
          coverArt: '',
          price: 0.12,
          genre: 'Ambient',
          releaseDate: '2024-01-10',
          trackCount: 8,
          totalSales: 203,
          totalRevenue: 24.36,
          description: 'Space-inspired ambient music that takes you on a journey through the cosmos. Each track is carefully crafted to evoke the vastness and beauty of space.',
          tracks: [
            { id: '1', title: 'Stellar Symphony', duration: '5:15', price: 0.12, trackNumber: 1, isPreview: false, audioUrl: '#' },
            { id: '2', title: 'Nebula Dreams', duration: '6:30', price: 0.12, trackNumber: 2, isPreview: true, audioUrl: '#' },
            { id: '3', title: 'Cosmic Drift', duration: '5:45', price: 0.12, trackNumber: 3, isPreview: false, audioUrl: '#' },
            { id: '4', title: 'Space Echo', duration: '4:50', price: 0.12, trackNumber: 4, isPreview: false, audioUrl: '#' },
            { id: '5', title: 'Galaxy Flow', duration: '6:15', price: 0.12, trackNumber: 5, isPreview: true, audioUrl: '#' },
            { id: '6', title: 'Orbital Path', duration: '5:20', price: 0.12, trackNumber: 6, isPreview: false, audioUrl: '#' },
            { id: '7', title: 'Star Light', duration: '4:35', price: 0.12, trackNumber: 7, isPreview: false, audioUrl: '#' },
            { id: '8', title: 'Cosmic End', duration: '6:00', price: 0.12, trackNumber: 8, isPreview: true, audioUrl: '#' }
          ]
        }
      };

      const albumData = mockAlbums[id];
      if (albumData) {
        setAlbum(albumData);
      } else {
        console.error('Album not found:', id);
      }
    } catch (error) {
      console.error('Failed to fetch album data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseAlbum = async () => {
    if (!album) return;
    
    try {
      setIsPurchasing(true);
      // Mock purchase logic
      alert(`Purchasing ${album.title} for ${album.price} XFG...`);
      // In real implementation, this would trigger wallet connection and transaction
    } catch (error) {
      console.error('Failed to purchase album:', error);
      alert('Failed to purchase album');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePurchaseTrack = async (track: Track) => {
    try {
      // Mock purchase logic
      alert(`Purchasing ${track.title} for ${track.price} XFG...`);
      // In real implementation, this would trigger wallet connection and transaction
    } catch (error) {
      console.error('Failed to purchase track:', error);
      alert('Failed to purchase track');
    }
  };

  const handlePreviewTrack = (track: Track) => {
    setSelectedTrack(track);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-fuchsia-400">Loading album...</div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">💿</div>
          <h2 className="text-2xl font-bold text-white mb-2">Album Not Found</h2>
          <p className="text-gray-400">The album you're looking for doesn't exist.</p>
          <Link to="/marketplace" className="btn-primary mt-4 inline-block">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Album Header */}
      <div className="glass p-8">
        <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
          <div className="w-full md:w-80 h-80 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl flex items-center justify-center overflow-hidden">
            {album.coverArt ? (
              <img src={album.coverArt} alt={album.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-8xl text-fuchsia-400/50">💿</div>
            )}
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{album.title}</h1>
              <Link to={`/artist/${album.artistId}`} className="text-2xl text-fuchsia-300 hover:text-fuchsia-400 transition-colors">
                by {album.artist}
              </Link>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="bg-fuchsia-600/20 text-fuchsia-400 px-3 py-1 rounded-full text-sm">
                {album.genre}
              </span>
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                {album.trackCount} tracks
              </span>
              <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                {album.totalSales} sales
              </span>
            </div>
            
            <p className="text-gray-300 max-w-2xl">{album.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="glass p-4 rounded-xl">
                <span className="text-gray-400">Release Date</span>
                <p className="text-white font-medium">{album.releaseDate}</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <span className="text-gray-400">Artist Address</span>
                <p className="text-white font-mono text-xs">{album.artistAddress}</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <span className="text-gray-400">Total Revenue</span>
                <p className="gradient-text font-bold">{album.totalRevenue} XFG</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <span className="text-gray-400">Album Price</span>
                <p className="gradient-text font-bold text-xl">{album.price} XFG</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handlePurchaseAlbum}
                disabled={isPurchasing}
                className="btn-primary text-lg px-8 py-3 disabled:opacity-50"
              >
                {isPurchasing ? 'Processing...' : `Purchase Full Album (${album.price} XFG)`}
              </button>
              <Link to={`/artist/${album.artistId}`} className="btn-secondary text-lg px-8 py-3">
                View Artist
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="glass p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Tracks ({album.tracks.length})</h2>
          <div className="text-sm text-gray-400">
            Total Duration: {album.tracks.reduce((total, track) => {
              const [min, sec] = track.duration.split(':').map(Number);
              return total + min * 60 + sec;
            }, 0) / 60 | 0}:{String(album.tracks.reduce((total, track) => {
              const [min, sec] = track.duration.split(':').map(Number);
              return total + min * 60 + sec;
            }, 0) % 60).padStart(2, '0')}
          </div>
        </div>
        
        <div className="space-y-2">
          {album.tracks.map(track => (
            <div key={track.id} className="glass p-4 rounded-xl hover:bg-fuchsia-900/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <span className="text-gray-400 text-sm w-8">{track.trackNumber}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{track.title}</span>
                      {track.isPreview && (
                        <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded-full text-xs">
                          Preview Available
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">{track.duration}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-fuchsia-400 font-medium">{track.price} XFG</span>
                  <div className="flex space-x-2">
                    {track.isPreview && (
                      <button
                        onClick={() => handlePreviewTrack(track)}
                        className="btn-secondary text-xs"
                      >
                        Preview
                      </button>
                    )}
                    <button
                      onClick={() => handlePurchaseTrack(track)}
                      className="btn-primary text-xs"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Track Preview Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-6">
              <h3 className="gradient-text text-2xl font-bold">Track Preview</h3>
              <button
                onClick={() => setSelectedTrack(null)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="w-full h-64 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl flex items-center justify-center">
                <div className="text-6xl text-fuchsia-400/50">🎵</div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-bold text-2xl">{selectedTrack.title}</h4>
                  <p className="text-fuchsia-300 text-lg">{album.artist}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400">Duration</span>
                    <p className="text-white font-medium">{selectedTrack.duration}</p>
                  </div>
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400">Price</span>
                    <p className="gradient-text font-bold text-xl">{selectedTrack.price} XFG</p>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => handlePurchaseTrack(selectedTrack)}
                    className="btn-primary flex-1"
                  >
                    Purchase Track
                  </button>
                  <button
                    onClick={() => setSelectedTrack(null)}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumPage; 