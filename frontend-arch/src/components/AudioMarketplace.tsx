import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { Link } from 'react-router-dom';
import PremiumAccess from './PremiumAccess';

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
  serviceType: 'album-only' | 'streaming-enabled';
  streamingEnabled: boolean;
  paraEarnings: number;
  totalStreamTime: number;
}

const AudioMarketplace: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [currentD, setCurrentD] = useState(0);
  const [currentI, setCurrentI] = useState(0);
  const [currentG, setCurrentG] = useState(0);
  const [currentM, setCurrentM] = useState(0);
  const [transitioningD, setTransitioningD] = useState(false);
  const [transitioningI, setTransitioningI] = useState(false);
  const [transitioningG, setTransitioningG] = useState(false);
  const [transitioningM, setTransitioningM] = useState(false);

  useEffect(() => {
    fetchTracks();
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = () => {
    const premium = localStorage.getItem('digm-premium') === 'true';
    setHasPremium(premium);
  };

  // Auto-rotate individual words at random intervals
  useEffect(() => {
    const D = ['Decentralized', 'Digital', 'Dynamic', 'Distributed', 'Direct', 'Diverse', 'Dual', 'Deeply', 'Dope', 'Driven'];
    const I = ['Independent', 'Innovative', 'Indie', 'Inspired', 'Interactive', 'Iconic', 'Inclusive', 'Infinite', 'Intuitive', 'Intense'];
    const G = ['Groove', 'Genre', 'Glorious', 'Gathering', 'Growth', 'Genius'];
    const M = ['Marketplace', 'Machine', 'Media', 'Music', 'Movement', 'Mining', 'Mission', 'Model', 'Matrix', 'Magic'];

    // Safety check: reset any out-of-bounds indices
    if (currentD >= D.length) setCurrentD(0);
    if (currentI >= I.length) setCurrentI(0);
    if (currentG >= G.length) setCurrentG(0);
    if (currentM >= M.length) setCurrentM(0);

    const changeWord = (setCurrent: React.Dispatch<React.SetStateAction<number>>, setTransitioning: (value: boolean) => void, maxLength: number) => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrent((prev: number) => {
          const nextIndex = (prev + 1) % maxLength;
          // Safety check to ensure index is within bounds
          return nextIndex >= 0 && nextIndex < maxLength ? nextIndex : 0;
        });
        setTransitioning(false);
      }, 300);
    };

    const intervals = [
      setInterval(() => changeWord(setCurrentD, setTransitioningD, D.length), 6000 + Math.random() * 3000),
      setInterval(() => changeWord(setCurrentI, setTransitioningI, I.length), 7000 + Math.random() * 3000),
      setInterval(() => changeWord(setCurrentG, setTransitioningG, G.length), 5000 + Math.random() * 2000),
      setInterval(() => changeWord(setCurrentM, setTransitioningM, M.length), 9000 + Math.random() * 3000)
    ];

    return () => intervals.forEach(clearInterval);
  }, []);

  useEffect(() => {
    filterAndSortTracks();
  }, [tracks, searchTerm, selectedGenre, selectedServiceType, sortBy]);

  const fetchTracks = async () => {
    try {
      // Load tracks from the catalog
      const response = await fetch('/assets/catalog/albums.json');
      const catalogData = await response.json();
      
      // Transform catalog data to match the Track interface
      const tracksFromCatalog: Track[] = [];
      
      catalogData.albums.forEach((album: any) => {
        album.tracks.forEach((track: any) => {
          if (track.isPreview) {
            tracksFromCatalog.push({
              id: track.trackId,
              title: track.title,
              artist: album.artist,
              artistAddress: '0x' + Math.random().toString(16).substr(2, 40), // Mock address
              duration: `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`,
              price: track.fileSize / 10000000, // Convert atomic units to XFG
              genre: album.genre || 'Electronic',
              coverArt: album.coverArt,
              audioUrl: track.previewAudio,
              sales: Math.floor(Math.random() * 500), // Mock sales data
              description: album.description,
              uploadDate: album.releaseDate,
              serviceType: 'streaming-enabled' as const,
              streamingEnabled: true,
              paraEarnings: Math.floor(Math.random() * 200), // Mock PARA earnings
              totalStreamTime: Math.floor(Math.random() * 5000) // Mock stream time
            });
          }
        });
      });
      
      setTracks(tracksFromCatalog);
    } catch (error) {
      console.error('Failed to fetch tracks from catalog:', error);
      
      // Fallback to mock data if catalog fails
      const mockTracks = [
        {
          id: '1',
          title: 'Midnight City',
          artist: 'Headphone Son',
          artistAddress: '0x1234...5678',
          duration: '4:32',
          price: 0.08,
          genre: 'Electronic',
          coverArt: '/assets/covers/headphone-son-bitcoin.jpg',
          audioUrl: '/assets/audio/preview-singles/headphone-son-midnight-city.opus',
          sales: 342,
          description: 'A mesmerizing electronic journey through the neon-lit streets of a digital metropolis.',
          uploadDate: '2024-01-10',
          serviceType: 'streaming-enabled' as const,
          streamingEnabled: true,
          paraEarnings: 156.8,
          totalStreamTime: 2840
        },
        {
          id: '2',
          title: 'Bitcoin',
          artist: 'Headphone Son',
          artistAddress: '0x8765...4321',
          duration: '4:20',
          price: 0.08,
          genre: 'Electronic',
          coverArt: '/assets/covers/headphone-son-bitcoin.jpg',
          audioUrl: '/assets/audio/preview-singles/headphone-son-bitcoin.opus',
          sales: 89,
          description: 'Hot beats with fire energy',
          uploadDate: '2024-01-20',
          serviceType: 'streaming-enabled' as const,
          streamingEnabled: true,
          paraEarnings: 78.9,
          totalStreamTime: 1200
        },
        {
          id: '3',
          title: 'The Arbinger',
          artist: 'Headphone Son',
          artistAddress: '0x9999...8888',
          duration: '4:50',
          price: 0.12,
          genre: 'Electronic',
          coverArt: '/assets/covers/headphone-son-the-arbinger.jpg',
          audioUrl: '/assets/audio/preview-singles/headphone-son-the-arbinger.opus',
          sales: 203,
          description: 'Atmospheric electronic composition',
          uploadDate: '2024-01-10',
          serviceType: 'streaming-enabled' as const,
          streamingEnabled: true,
          paraEarnings: 92.5,
          totalStreamTime: 1850
        }
      ];
      
      setTracks(mockTracks);
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

    // Filter by service type
    if (selectedServiceType) {
      filtered = filtered.filter(track => track.serviceType === selectedServiceType);
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
      // Mock purchase since backend is not running
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      // Simulate successful purchase
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      alert(`Purchase successful! Transaction hash: ${mockTxHash}`);
      
      // Update local sales count
      setTracks(prevTracks => 
        prevTracks.map(t => 
          t.id === track.id ? { ...t, sales: t.sales + 1 } : t
        )
      );
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        {/* Premium Status Banner */}
        {!hasPremium && (
          <div className="glass p-4 rounded-xl border border-fuchsia-500/40 bg-fuchsia-900/20 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">♛</span>
              <div>
                <h3 className="text-fuchsia-400 font-semibold">Premium Access Required</h3>
                <p className="text-gray-400 text-sm">Hold 8,000 HEAT tokens to unlock streaming features</p>
              </div>
              <button
                onClick={() => setShowPremiumModal(true)}
                className="btn-primary text-sm"
              >
                Get Premium
              </button>
            </div>
          </div>
        )}
        
        {hasPremium && (
          <div className="card-success p-4 rounded-xl max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">♛</span>
              <div>
                <h3 className="gradient-text-green font-semibold">Premium Access Active</h3>
                <p className="text-gray-400 text-sm">You can stream music and earn <img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> PARA tokens!</p>
              </div>
            </div>
          </div>
        )}
        <h1 className="text-5xl font-bold">
          <span className={`inline-block transition-all duration-300 ease-in-out transform ${
            transitioningD ? 'opacity-30 scale-50 blur-sm' : 'opacity-100 scale-100 blur-0'
          }`}>
            <span className="gradient-text">
              {(() => {
                const D = ['Decentralized', 'Digital', 'Dynamic', 'Distributed', 'Direct', 'Diverse', 'Dream', 'Deep', 'Dope', 'Driven'];
                return D[currentD];
              })()}
            </span>
          </span>{' '}
          <span className={`inline-block transition-all duration-300 ease-in-out transform ${
            transitioningI ? 'opacity-30 scale-50 blur-sm' : 'opacity-100 scale-100 blur-0'
          }`}>
            <span className="gradient-text">
              {(() => {
                const I = ['Independent', 'Innovative', 'Immersive', 'Inspiring', 'Interactive', 'Iconic', 'Inclusive', 'Infinite', 'Intuitive', 'Intense'];
                return I[currentI];
              })()}
            </span>
          </span>{' '}
          <span className={`inline-block transition-all duration-300 ease-in-out transform ${
            transitioningG ? 'opacity-30 scale-50 blur-sm' : 'opacity-100 scale-100 blur-0'
          }`}>
            <span className="gradient-text">
              {(() => {
                const G = ['Groove', 'Genre', 'Gateway', 'Gathering', 'Growth', 'Genius'];
                return G[currentG];
              })()}
            </span>
          </span>{' '}
          <span className={`inline-block transition-all duration-300 ease-in-out transform ${
            transitioningM ? 'opacity-30 scale-50 blur-sm' : 'opacity-100 scale-100 blur-0'
          }`}>
            <span className="gradient-text">
              {(() => {
                const M = ['Marketplace', 'Machine', 'Media', 'Music', 'Movement', 'Mining', 'Mission', 'Model', 'Matrix', 'Magic'];
                return M[currentM];
              })()}
            </span>
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Explore the future of music with 100% artist-owned tracks on the <span className="gradient-text-gold">Fuego L1</span> blockchain
        </p>
      </div>

        {/* Search and Filters */}
      <div className="glass p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracks or artists..."
                className="input-field w-full pl-12"
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            </div>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            className="input-field lg:w-48"
            >
              {availableGenres.map(genre => (
                <option key={genre} value={genre === 'All Genres' ? '' : genre}>
                  {genre}
                </option>
              ))}
            </select>
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
            className="input-field lg:w-48"
            >
              <option value="">All Services</option>
              <option value="album-only">Album Only</option>
              <option value="streaming-enabled">Streaming Enabled</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            className="input-field lg:w-48"
            >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTracks.map(track => (
          <div key={track.id} className="group">
            <div
              className="card hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => handlePreview(track)}
            >
              <div className="relative">
                <div className="w-full h-64 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  {track.coverArt ? (
                    <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="text-6xl text-fuchsia-400/50">🎵</div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                  {/* Centered Play Button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handlePreview(track);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-fuchsia-600/40 transition-all duration-200 rounded-xl"
                    style={{ pointerEvents: 'auto' }}
                    aria-label="Play Preview"
                  >
                    <span className="text-white text-4xl drop-shadow-lg">▶</span>
                  </button>
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                    {track.duration}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-white font-semibold text-lg truncate group-hover:text-fuchsia-300 transition-colors">
                    {track.title}
                  </h3>
                  <Link 
                    to={`/artist/${track.artist.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-gray-400 text-sm truncate hover:text-fuchsia-300 transition-colors"
                  >
                    {track.artist}
                  </Link>
            </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{track.genre}</span>
                  <div className="flex items-center space-x-2">
                    {track.streamingEnabled && (
                      <span className="bg-sky-600/20 text-sky-400 px-2 py-1 rounded-full text-xs">
                        🎧 Streaming
                      </span>
                    )}
                    <span className="text-fuchsia-400 font-medium">{track.sales} sales</span>
                  </div>
              </div>
              
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold gradient-text">{track.price} XF₲</span>
                    {track.streamingEnabled && (
                      <div className="flex items-center space-x-1 text-xs text-sky-400 mt-1">
                        <img 
                          src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                          alt="PARA" 
                          className="w-3 h-3 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span>+{track.paraEarnings.toFixed(1)} PARA earned</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(track);
                      }}
                      disabled={isPurchasing}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {isPurchasing ? 'Processing...' : 'Purchase'}
                    </button>
                    <Link
                      to={`/album/${track.title.toLowerCase().replace(/\s+/g, '-')}-album`}
                      className="btn-secondary text-xs text-center"
                    >
                      View Album
                    </Link>
                    {track.streamingEnabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasPremium) {
                            setShowPremiumModal(true);
                          } else {
                            // Handle streaming for premium users
                            alert('🎧 Starting stream... Earn PARA while listening!');
                          }
                        }}
                        className={`text-xs ${
                          hasPremium 
                            ? 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-green-500/25' 
                            : 'bg-gray-600/20 text-gray-400 border border-gray-600/40 cursor-not-allowed'
                        }`}
                        disabled={!hasPremium}
                      >
                        {hasPremium ? '🎧 Stream' : '🔒 Premium Required'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTracks.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-2xl font-bold text-white mb-2">No tracks found</h3>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Track Preview Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              <div className="w-full h-80 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl flex items-center justify-center overflow-hidden">
                {selectedTrack.coverArt ? (
                  <img src={selectedTrack.coverArt} alt={selectedTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-8xl text-fuchsia-400/50">🎵</div>
                )}
              </div>

              {/* Audio Player */}
              {selectedTrack.audioUrl && selectedTrack.audioUrl !== '#' && (
                <AudioPlayer audioUrl={selectedTrack.audioUrl} />
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-bold text-2xl">{selectedTrack.title}</h4>
                  <p className="text-fuchsia-300 text-lg">{selectedTrack.artist}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400">Duration</span>
                    <p className="text-white font-medium">{selectedTrack.duration}</p>
                  </div>
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400">Genre</span>
                    <p className="text-white font-medium">{selectedTrack.genre}</p>
                  </div>
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400">Price</span>
                    <p className="gradient-text font-bold text-xl">{selectedTrack.price} XFG</p>
                </div>
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400">Sales</span>
                    <p className="text-white font-medium">{selectedTrack.sales}</p>
                </div>
              </div>

              {selectedTrack.description && (
                  <div className="glass p-4 rounded-xl">
                    <span className="text-gray-400 text-sm">Description</span>
                    <p className="text-white text-sm mt-2">{selectedTrack.description}</p>
                </div>
              )}

                <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => handlePurchase(selectedTrack)}
                  disabled={isPurchasing}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                    {isPurchasing ? 'Processing...' : `Purchase for ${selectedTrack.price} XFG`}
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

      {/* Premium Access Modal */}
      {showPremiumModal && (
        <PremiumAccess 
          onClose={() => setShowPremiumModal(false)} 
          isModal={true} 
        />
      )}

      {/* Artist & Listener Economy Notice */}
      <div className="glass p-8">
        <h3 className="gradient-text text-2xl font-bold mb-6 text-center">Artist & Listener-First Economy</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center space-y-2">
            <div className="text-3xl">₲</div>
            <h4 className="font-semibold text-white">100% Artist Revenue</h4>
            <p className="text-sm text-gray-300">Artists keep every single XFG from their sales. No 60/40 split, no $0.000001 per stream- One. Hundred. Percent. </p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl">🎧</div>
                    <h4 className="font-semibold text-white">Artist & Listener Rewards</h4>
        <p className="text-sm text-gray-300">Earn <img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> Para tokens from listening to music, while the artist you are listening to earns Para as you stream their music.</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl">⇆</div>
            <h4 className="font-semibold text-white">Direct P2P Payments</h4>
            <p className="text-sm text-gray-300">Payments go directly from buyers to artists while inheriting all monetary privacy & security features of XF₲.</p>
          </div>

          <div className="text-center space-y-2">
            <div className="text-3xl">䷍</div>
            <h4 className="font-semibold text-white">True Ownership</h4>
            <p className="text-sm text-gray-300">Artists fully control their music & pricing, while fans OWN (not 'suBScribe to') all audio they purchase, forever.</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl">⛨</div>
            <h4 className="font-semibold text-white">Purchasing Power + Privacy</h4>
            <p className="text-sm text-gray-300">Upgrade your money & preserve value using XF₲ (or HEAT) while controlling privacy of your data, instead of it being tracked & sold behind your back (cough Spotify, Apple, Google, Meta, Amazon, etc).</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl">🜂</div>
            <h4 className="font-semibold gradient-text-gold">Fire Powered</h4>
            <p className="text-sm text-gray-300">Built on the hottest L1 privacy blockchain in town, supporting the private commerce of a worldwide community of artists, musicians, developers, and music lovers alike.</p>
          </div>
 
        </div>
      </div>
    </div>
  );
};

function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => {
        setError('Unable to play audio.');
      });
    }
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setError('Unable to play audio.');
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  React.useEffect(() => {
    setError(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <audio ref={audioRef} src={audioUrl} preload="none" />
      <button
        onClick={handlePlayPause}
        className="btn-primary px-4 py-2 rounded-full text-sm"
        type="button"
      >
        {isPlaying ? 'Pause' : 'Play'} Preview
      </button>
      {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
    </div>
  );
}

export default AudioMarketplace; 