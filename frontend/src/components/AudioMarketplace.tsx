import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface Track {
  id: string;
  title: string;
  artist: string;
  artistAddress: string;
  duration: string;
  price: number;
  genre: string;
  coverArt: string;
  audioUrl: string;
  sales: number;
  description: string;
  uploadDate: string;
  previewUrl?: string;
}

const AudioMarketplace: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    filterAndSortTracks();
  }, [tracks, searchTerm, selectedGenre, sortBy]);

  const fetchTracks = async () => {
    try {
      const response = await fetch('/api/marketplace/tracks');
      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    }
  };

  const filterAndSortTracks = () => {
    let filtered = tracks;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(track =>
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by genre
    if (selectedGenre) {
      filtered = filtered.filter(track => track.genre === selectedGenre);
    }

    // Sort tracks
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime());
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a, b) => b.sales - a.sales);
        break;
    }

    setFilteredTracks(filtered);
  };

  const handlePurchase = async (track: Track) => {
    if (!evmAddress) {
      alert('Please connect your wallet to purchase tracks');
      return;
    }

    setIsPurchasing(true);
    try {
      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          buyerAddress: evmAddress,
          price: track.price
        })
      });
      
      if (!response.ok) {
        throw new Error('Purchase failed');
      }

      const result = await response.json();
      alert(`Purchase successful! Transaction hash: ${result.txHash}`);
      
      // Refresh tracks to update sales count
      await fetchTracks();
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePreview = (track: Track) => {
    setSelectedTrack(track);
  };

  const availableGenres = [
    'All Genres', 'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical',
    'Country', 'R&B', 'Reggae', 'Folk', 'Blues', 'Metal', 'Ambient', 'Techno',
    'House', 'Drum & Bass', 'Trap', 'Lo-fi'
  ];

  return (
    <div className="space-y-6">
      {/* Marketplace Header */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Audio Marketplace</h2>
        <p className="text-slate-400 mb-6">
          Discover and purchase music with complete privacy using Fuego L1 blockchain
        </p>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracks or artists..."
                className="input-field w-full"
              />
            </div>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="input-field"
            >
              {availableGenres.map(genre => (
                <option key={genre} value={genre === 'All Genres' ? '' : genre}>
                  {genre}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTracks.map(track => (
          <div key={track.id} className="card hover:bg-slate-700 transition-colors cursor-pointer">
            <div className="relative">
              <div className="w-full h-48 bg-slate-600 rounded-lg mb-4 flex items-center justify-center">
                {track.coverArt ? (
                  <img src={track.coverArt} alt={track.title} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <span className="text-4xl text-slate-400">🎵</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(track);
                  }}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                >
                  ▶️
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-medium truncate">{track.title}</h3>
              <p className="text-slate-400 text-sm truncate">{track.artist}</p>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{track.duration}</span>
                <span className="text-white font-medium">{track.price} XFG</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{track.genre}</span>
                <span className="text-slate-400 text-sm">{track.sales} sales</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePurchase(track);
                }}
                disabled={isPurchasing}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isPurchasing ? 'Processing...' : `Pay ${track.artist} ${track.price} XFG`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTracks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No tracks found</p>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Track Preview Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Track Preview</h3>
              <button
                onClick={() => setSelectedTrack(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="w-full h-48 bg-slate-600 rounded-lg flex items-center justify-center">
                {selectedTrack.coverArt ? (
                  <img src={selectedTrack.coverArt} alt={selectedTrack.title} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <span className="text-4xl text-slate-400">🎵</span>
                )}
              </div>

              <div>
                <h4 className="text-white font-medium text-lg">{selectedTrack.title}</h4>
                <p className="text-slate-400">{selectedTrack.artist}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Duration:</span>
                  <p className="text-white">{selectedTrack.duration}</p>
                </div>
                <div>
                  <span className="text-slate-400">Genre:</span>
                  <p className="text-white">{selectedTrack.genre}</p>
                </div>
                <div>
                  <span className="text-slate-400">Price:</span>
                  <p className="text-white">{selectedTrack.price} XFG</p>
                </div>
                <div>
                  <span className="text-slate-400">Sales:</span>
                  <p className="text-white">{selectedTrack.sales}</p>
                </div>
              </div>

              {selectedTrack.description && (
                <div>
                  <span className="text-slate-400 text-sm">Description:</span>
                  <p className="text-white text-sm mt-1">{selectedTrack.description}</p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => handlePurchase(selectedTrack)}
                  disabled={isPurchasing}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isPurchasing ? 'Processing...' : `Pay ${selectedTrack.artist} ${selectedTrack.price} XFG`}
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
      )}

      {/* Artist-First Notice */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">100% Artist-First Economy</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>100% Artist Revenue:</strong> Artists keep every single XFG from their sales</p>
          <p>• <strong>Zero Platform Fees:</strong> No hidden fees, no opaque calculations, no intermediaries</p>
          <p>• <strong>Direct P2P Transactions:</strong> Payments go directly from listener to artist</p>
          <p>• <strong>Privacy-Preserving:</strong> All transactions use Fuego L1 zero-knowledge proofs</p>
          <p>• <strong>True Ownership:</strong> Artists control their music, pricing, and fan connections</p>
        </div>
      </div>
    </div>
  );
};

export default AudioMarketplace; 