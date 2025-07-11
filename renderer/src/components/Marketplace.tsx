import { useState } from 'react';

interface Album {
  id: string;
  title: string;
  artist: string;
  price: number;
  coverArt: string;
  tracks: number;
  duration: number;
  elderNode: string;
}

function Marketplace() {
  const [albums] = useState<Album[]>([
    {
      id: '1',
      title: 'Digital Dreams',
      artist: 'CyberSounds',
      price: 0.005,
      coverArt: '🌐',
      tracks: 12,
      duration: 2847,
      elderNode: 'Elder Node #1',
    },
    {
      id: '2',
      title: 'Neon Nights',
      artist: 'ElectroWave',
      price: 0.008,
      coverArt: '🌃',
      tracks: 8,
      duration: 1923,
      elderNode: 'Elder Node #2',
    },
    {
      id: '3',
      title: 'Cosmic Journey',
      artist: 'StarBeats',
      price: 0.012,
      coverArt: '🚀',
      tracks: 15,
      duration: 4102,
      elderNode: 'Elder Node #3',
    },
    {
      id: '4',
      title: 'Urban Pulse',
      artist: 'CityRhythm',
      price: 0.006,
      coverArt: '🏙️',
      tracks: 10,
      duration: 2341,
      elderNode: 'Elder Node #1',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePurchase = (album: Album) => {
    // TODO: Integrate with XFG payment system
    alert(`Purchasing "${album.title}" for ${album.price} XFG`);
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">DIGM Marketplace</h2>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search albums, artists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Genres</option>
              <option value="electronic">Electronic</option>
              <option value="ambient">Ambient</option>
              <option value="synthwave">Synthwave</option>
              <option value="experimental">Experimental</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Albums</h3>
            <p className="text-2xl font-bold">{albums.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Active Artists</h3>
            <p className="text-2xl font-bold">{new Set(albums.map(a => a.artist)).size}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Elder Nodes</h3>
            <p className="text-2xl font-bold">3</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Avg. Price</h3>
            <p className="text-2xl font-bold">
              {(albums.reduce((sum, a) => sum + a.price, 0) / albums.length).toFixed(3)} XFG
            </p>
          </div>
        </div>

        {/* Albums Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
              {/* Album Cover */}
              <div className="w-full aspect-square bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-4xl mb-4">
                {album.coverArt}
              </div>

              {/* Album Info */}
              <div className="mb-4">
                <h3 className="font-bold text-lg mb-1">{album.title}</h3>
                <p className="text-gray-400 mb-2">{album.artist}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{album.tracks} tracks</span>
                  <span>{formatDuration(album.duration)}</span>
                </div>
              </div>

              {/* Hosting Info */}
              <div className="mb-4 p-2 bg-gray-900 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Hosted by:</span>
                  <span className="text-green-400">{album.elderNode}</span>
                </div>
              </div>

              {/* Price and Purchase */}
              <div className="flex items-center justify-between">
                <div className="text-yellow-400 font-bold">
                  {album.price} XFG
                </div>
                <button
                  onClick={() => handlePurchase(album)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition-colors"
                >
                  Purchase
                </button>
              </div>

              {/* Track Preview */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button className="w-full text-left text-sm text-gray-400 hover:text-white">
                  🎵 Preview tracks...
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Featured Section */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">Featured This Week</h3>
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-2xl">
                🎵
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white">Ambient Spaces Collection</h4>
                <p className="text-purple-100">Curated selection of atmospheric tracks</p>
                <p className="text-purple-200 text-sm">Artists keep 100% revenue • Hosted on Elder Nodes</p>
              </div>
              <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-6 py-2 rounded font-medium text-white">
                Explore
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Marketplace; 