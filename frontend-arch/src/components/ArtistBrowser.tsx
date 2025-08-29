import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface Artist {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  genres: string[];
  totalTracks: number;
  totalSales: number;
  followers: number;
  verified: boolean;
  albums: Album[];
}

interface Album {
  id: string;
  title: string;
  coverArt: string;
  trackCount: number;
  totalDuration: string;
  price: number;
  releaseDate: string;
}

const ArtistBrowser: React.FC = () => {
  const { evmAddress } = useWallet();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    filterAndSortArtists();
  }, [artists, searchTerm, selectedGenre, sortBy]);

  const fetchArtists = async () => {
    try {
      const response = await fetch('/api/artists');
      const data = await response.json();
      setArtists(data.artists || []);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
    }
  };

  const filterAndSortArtists = () => {
    let filtered = artists;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(artist =>
        artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artist.bio.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by genre
    if (selectedGenre) {
      filtered = filtered.filter(artist => 
        artist.genres.includes(selectedGenre)
      );
    }

    // Sort artists
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.followers - a.followers);
        break;
      case 'newest':
        filtered.sort((a, b) => b.albums.length - a.albums.length);
        break;
      case 'verified':
        filtered.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
        break;
      case 'sales':
        filtered.sort((a, b) => b.totalSales - a.totalSales);
        break;
    }

    setFilteredArtists(filtered);
  };

  const availableGenres = [
    'All Genres', 'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical',
    'Country', 'R&B', 'Reggae', 'Folk', 'Blues', 'Metal', 'Ambient', 'Techno',
    'House', 'Drum & Bass', 'Trap', 'Lo-fi'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Discover Artists</h2>
        <p className="text-slate-400 mb-6">
          Support independent artists directly. 100% of your purchase goes to the creator.
        </p>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search artists..."
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
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="verified">Verified</option>
              <option value="sales">Top Selling</option>
            </select>
          </div>
        </div>
      </div>

      {/* Artists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArtists.map(artist => (
          <div 
            key={artist.id} 
            className="card hover:bg-slate-700 transition-colors cursor-pointer"
            onClick={() => setSelectedArtist(artist)}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center">
                {artist.avatar ? (
                  <img src={artist.avatar} alt={artist.name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl text-slate-400">🎵</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-white font-medium">{artist.name}</h3>
                  {artist.verified && (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">{artist.genres.join(', ')}</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm mb-4 line-clamp-2">
              {artist.bio || 'No bio available'}
            </p>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white font-medium">{artist.totalTracks}</p>
                <p className="text-slate-400 text-xs">Tracks</p>
              </div>
              <div>
                <p className="text-white font-medium">{artist.albums.length}</p>
                <p className="text-slate-400 text-xs">Albums</p>
              </div>
              <div>
                <p className="text-white font-medium">{artist.followers}</p>
                <p className="text-slate-400 text-xs">Followers</p>
              </div>
            </div>

            <div className="mt-4">
              <button className="btn-primary w-full">
                View Albums
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredArtists.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-lg">No artists found</p>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Artist Detail Modal */}
      {selectedArtist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                  {selectedArtist.avatar ? (
                    <img src={selectedArtist.avatar} alt={selectedArtist.name} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <span className="text-3xl text-slate-400">🎵</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-2xl font-bold text-white">{selectedArtist.name}</h3>
                    {selectedArtist.verified && (
                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                        ✓ Verified Artist
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400">{selectedArtist.genres.join(', ')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedArtist(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold mb-2">About</h4>
                <p className="text-slate-300">{selectedArtist.bio || 'No bio available'}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-white font-medium">{selectedArtist.totalTracks}</p>
                    <p className="text-slate-400 text-sm">Total Tracks</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-white font-medium">{selectedArtist.albums.length}</p>
                    <p className="text-slate-400 text-sm">Albums</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-white font-medium">{selectedArtist.followers}</p>
                    <p className="text-slate-400 text-sm">Followers</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-white font-medium">{selectedArtist.totalSales}</p>
                    <p className="text-slate-400 text-sm">Total Sales</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Albums</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedArtist.albums.map(album => (
                  <div key={album.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="w-full h-32 bg-slate-600 rounded mb-3 flex items-center justify-center">
                      {album.coverArt ? (
                        <img src={album.coverArt} alt={album.title} className="w-full h-full rounded object-cover" />
                      ) : (
                        <span className="text-2xl text-slate-400">🎵</span>
                      )}
                    </div>
                    <h5 className="text-white font-medium mb-1">{album.title}</h5>
                    <p className="text-slate-400 text-sm mb-2">{album.trackCount} tracks • {album.totalDuration}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{album.price} XFG</span>
                      <button className="btn-primary text-sm">
                        View Album
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 100% Artist Revenue Notice */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Support Artists Directly</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>100% Artist Revenue:</strong> Every XFG you spend goes directly to the artist</p>
          <p>• <strong>No Platform Fees:</strong> DIGM takes zero commission from artist sales</p>
          <p>• <strong>Direct Support:</strong> Your purchases directly support independent musicians</p>
          <p>• <strong>Privacy Protected:</strong> All transactions use Fuego L1 privacy blockchain</p>
        </div>
      </div>
    </div>
  );
};

export default ArtistBrowser; 