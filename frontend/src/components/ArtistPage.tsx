import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

interface Album {
  id: string;
  title: string;
  artist: string;
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

interface Track {
  id: string;
  title: string;
  duration: string;
  price: number;
  trackNumber: number;
  isPreview: boolean;
}

interface Artist {
  id: string;
  name: string;
  address: string;
  bio: string;
  avatar: string;
  totalAlbums: number;
  totalSales: number;
  totalRevenue: number;
  totalParaEarned: number; // Add this line
  genres: string[];
  socialLinks: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  verified: boolean;
}

interface ArtistUnlock {
  id: string;
  title: string;
  description: string;
  tokenType: 'PARA' | 'HEAT' | 'XFG';
  tokenAmount: number;
  unlockType: 'exclusive-track' | 'behind-scenes' | 'early-access' | 'custom-content' | 'merch-discount' | 'vip-access';
  contentUrl?: string;
  isActive: boolean;
  createdAt: string;
  totalPurchases: number;
  revenue: number;
}

const ArtistPage: React.FC = () => {
  const { artistId } = useParams<{ artistId: string }>();
  const { evmAddress, stellarAddress } = useWallet();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [unlocks, setUnlocks] = useState<ArtistUnlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedUnlock, setSelectedUnlock] = useState<ArtistUnlock | null>(null);

  useEffect(() => {
    if (artistId) {
      fetchArtistData(artistId);
    }
  }, [artistId]);

  const fetchArtistData = async (id: string) => {
    setIsLoading(true);
    try {
      // Mock data for example artists
      const mockArtists: Record<string, Artist> = {
        'crypto-beats': {
          id: 'crypto-beats',
          name: 'Crypto Beats',
          address: '0x1234...5678',
          bio: 'Pioneering electronic music producer blending blockchain technology with futuristic soundscapes. Known for creating immersive digital experiences through innovative beats and cutting-edge production techniques.',
          avatar: '',
          totalAlbums: 3,
          totalSales: 127,
          totalRevenue: 6.35,
          totalParaEarned: 1234,
          genres: ['Electronic', 'Techno', 'Ambient'],
          socialLinks: {
            twitter: 'https://twitter.com/cryptobeats',
            instagram: 'https://instagram.com/cryptobeats',
            website: 'https://cryptobeats.io'
          },
          verified: true
        },
        'heat-wave': {
          id: 'heat-wave',
          name: 'Heat Wave',
          address: '0x8765...4321',
          bio: 'Hip-hop artist bringing the fire with every track. Combining traditional rap with modern blockchain culture, Heat Wave delivers authentic stories from the streets to the digital frontier.',
          avatar: '',
          totalAlbums: 2,
          totalSales: 89,
          totalRevenue: 7.12,
          totalParaEarned: 500,
          genres: ['Hip Hop', 'Rap', 'Trap'],
          socialLinks: {
            twitter: 'https://twitter.com/heatwave',
            instagram: 'https://instagram.com/heatwave'
          },
          verified: true
        },
        'cosmic-dj': {
          id: 'cosmic-dj',
          name: 'Cosmic DJ',
          address: '0x9999...8888',
          bio: 'Space-inspired ambient music creator exploring the vastness of sound. Each track is a journey through cosmic frequencies and ethereal soundscapes.',
          avatar: '',
          totalAlbums: 4,
          totalSales: 203,
          totalRevenue: 24.36,
          totalParaEarned: 2000,
          genres: ['Ambient', 'Space', 'Chill'],
          socialLinks: {
            website: 'https://cosmicdj.space'
          },
          verified: true
        },
        'decentralized-soul': {
          id: 'decentralized-soul',
          name: 'Decentralized Soul',
          address: '0x5555...6666',
          bio: 'Blues with a digital twist. Decentralized Soul brings classic blues into the blockchain era with soulful melodies and modern themes.',
          avatar: '',
          totalAlbums: 1,
          totalSales: 156,
          totalRevenue: 4.21,
          totalParaEarned: 1000,
          genres: ['Blues', 'Digital Blues'],
          socialLinks: {
            twitter: 'https://twitter.com/decentralizedsoul',
            website: 'https://decentralizedsoul.xyz'
          },
          verified: true
        },
        'headphone-son': {
          id: 'headphone-son',
          name: 'Headphone Son',
          address: '0x1234...5678',
          bio: 'Electronic journeys through neon-lit cities. Headphone Son crafts immersive soundscapes perfect for late-night listening.',
          avatar: '',
          totalAlbums: 2,
          totalSales: 634,
          totalRevenue: 12.34,
          totalParaEarned: 800,
          genres: ['Electronic', 'Ambient', 'Techno'],
          socialLinks: {
            twitter: 'https://twitter.com/headphoneson',
            website: 'https://headphoneson.io'
          },
          verified: true
        }
      };

      const mockAlbums: Record<string, Album[]> = {
        'crypto-beats': [
          {
            id: 'digital-dreams-album',
            title: 'Digital Dreams',
            artist: 'Crypto Beats',
            artistAddress: '0x1234...5678',
            coverArt: '',
            price: 0.05,
            genre: 'Electronic',
            releaseDate: '2024-01-15',
            trackCount: 12,
            totalSales: 127,
            totalRevenue: 6.35,
            description: 'A futuristic electronic album exploring the intersection of technology and human emotion.',
            tracks: [
              { id: '1', title: 'Digital Dreams', duration: '3:45', price: 0.05, trackNumber: 1, isPreview: false },
              { id: '2', title: 'Blockchain Flow', duration: '4:12', price: 0.05, trackNumber: 2, isPreview: true },
              { id: '3', title: 'Crypto Nights', duration: '3:58', price: 0.05, trackNumber: 3, isPreview: false },
              { id: '4', title: 'Digital Love', duration: '4:30', price: 0.05, trackNumber: 4, isPreview: false },
              { id: '5', title: 'Future Bass', duration: '3:22', price: 0.05, trackNumber: 5, isPreview: true },
              { id: '6', title: 'Tech Soul', duration: '4:15', price: 0.05, trackNumber: 6, isPreview: false },
              { id: '7', title: 'Digital Rain', duration: '3:50', price: 0.05, trackNumber: 7, isPreview: false },
              { id: '8', title: 'Crypto Vibes', duration: '4:08', price: 0.05, trackNumber: 8, isPreview: true },
              { id: '9', title: 'Future Dreams', duration: '3:35', price: 0.05, trackNumber: 9, isPreview: false },
              { id: '10', title: 'Digital World', duration: '4:20', price: 0.05, trackNumber: 10, isPreview: false },
              { id: '11', title: 'Tech Future', duration: '3:45', price: 0.05, trackNumber: 11, isPreview: true },
              { id: '12', title: 'Digital End', duration: '4:05', price: 0.05, trackNumber: 12, isPreview: false }
            ]
          },
          {
            id: 'neural-networks-album',
            title: 'Neural Networks',
            artist: 'Crypto Beats',
            artistAddress: '0x1234...5678',
            coverArt: '',
            price: 0.08,
            genre: 'Techno',
            releaseDate: '2024-02-20',
            trackCount: 10,
            totalSales: 95,
            totalRevenue: 7.60,
            description: 'Deep techno exploration of artificial intelligence and neural networks.',
            tracks: [
              { id: '1', title: 'Neural Networks', duration: '4:15', price: 0.08, trackNumber: 1, isPreview: false },
              { id: '2', title: 'AI Dreams', duration: '3:50', price: 0.08, trackNumber: 2, isPreview: true },
              { id: '3', title: 'Machine Learning', duration: '4:30', price: 0.08, trackNumber: 3, isPreview: false },
              { id: '4', title: 'Deep Learning', duration: '3:45', price: 0.08, trackNumber: 4, isPreview: false },
              { id: '5', title: 'Algorithm', duration: '4:10', price: 0.08, trackNumber: 5, isPreview: true },
              { id: '6', title: 'Data Flow', duration: '3:55', price: 0.08, trackNumber: 6, isPreview: false },
              { id: '7', title: 'Binary Code', duration: '4:20', price: 0.08, trackNumber: 7, isPreview: false },
              { id: '8', title: 'Quantum Bits', duration: '3:40', price: 0.08, trackNumber: 8, isPreview: true },
              { id: '9', title: 'Digital Mind', duration: '4:05', price: 0.08, trackNumber: 9, isPreview: false },
              { id: '10', title: 'Future Code', duration: '3:50', price: 0.08, trackNumber: 10, isPreview: false }
            ]
          }
        ],
        'heat-wave': [
          {
            id: 'fuego-flow-album',
            title: 'Fuego Flow',
            artist: 'Heat Wave',
            artistAddress: '0x8765...4321',
            coverArt: '',
            price: 0.08,
            genre: 'Hip Hop',
            releaseDate: '2024-01-20',
            trackCount: 15,
            totalSales: 89,
            totalRevenue: 7.12,
            description: 'Hot beats with fire energy - the definitive Heat Wave experience.',
            tracks: [
              { id: '1', title: 'Fuego Flow', duration: '4:20', price: 0.08, trackNumber: 1, isPreview: false },
              { id: '2', title: 'Heat Wave', duration: '3:45', price: 0.08, trackNumber: 2, isPreview: true },
              { id: '3', title: 'Fire Starter', duration: '4:15', price: 0.08, trackNumber: 3, isPreview: false },
              { id: '4', title: 'Hot Money', duration: '3:50', price: 0.08, trackNumber: 4, isPreview: false },
              { id: '5', title: 'Burn It Down', duration: '4:10', price: 0.08, trackNumber: 5, isPreview: true },
              { id: '6', title: 'Flame Thrower', duration: '3:35', price: 0.08, trackNumber: 6, isPreview: false },
              { id: '7', title: 'Heat Check', duration: '4:25', price: 0.08, trackNumber: 7, isPreview: false },
              { id: '8', title: 'Fire Power', duration: '3:40', price: 0.08, trackNumber: 8, isPreview: true },
              { id: '9', title: 'Hot Sauce', duration: '4:05', price: 0.08, trackNumber: 9, isPreview: false },
              { id: '10', title: 'Burn Notice', duration: '3:55', price: 0.08, trackNumber: 10, isPreview: false },
              { id: '11', title: 'Fire Squad', duration: '4:15', price: 0.08, trackNumber: 11, isPreview: true },
              { id: '12', title: 'Heat Seeker', duration: '3:30', price: 0.08, trackNumber: 12, isPreview: false },
              { id: '13', title: 'Flame On', duration: '4:20', price: 0.08, trackNumber: 13, isPreview: false },
              { id: '14', title: 'Hot Pursuit', duration: '3:45', price: 0.08, trackNumber: 14, isPreview: true },
              { id: '15', title: 'Fire Finale', duration: '4:10', price: 0.08, trackNumber: 15, isPreview: false }
            ]
          }
        ],
        'cosmic-dj': [
          {
            id: 'stellar-symphony-album',
            title: 'Stellar Symphony',
            artist: 'Cosmic DJ',
            artistAddress: '0x9999...8888',
            coverArt: '',
            price: 0.12,
            genre: 'Ambient',
            releaseDate: '2024-01-10',
            trackCount: 8,
            totalSales: 203,
            totalRevenue: 24.36,
            description: 'Space-inspired ambient music that takes you on a journey through the cosmos.',
            tracks: [
              { id: '1', title: 'Stellar Symphony', duration: '5:15', price: 0.12, trackNumber: 1, isPreview: false },
              { id: '2', title: 'Nebula Dreams', duration: '6:30', price: 0.12, trackNumber: 2, isPreview: true },
              { id: '3', title: 'Cosmic Drift', duration: '5:45', price: 0.12, trackNumber: 3, isPreview: false },
              { id: '4', title: 'Space Echo', duration: '4:50', price: 0.12, trackNumber: 4, isPreview: false },
              { id: '5', title: 'Galaxy Flow', duration: '6:15', price: 0.12, trackNumber: 5, isPreview: true },
              { id: '6', title: 'Orbital Path', duration: '5:20', price: 0.12, trackNumber: 6, isPreview: false },
              { id: '7', title: 'Star Light', duration: '4:35', price: 0.12, trackNumber: 7, isPreview: false },
              { id: '8', title: 'Cosmic End', duration: '6:00', price: 0.12, trackNumber: 8, isPreview: true }
            ]
          }
        ],
        'decentralized-soul': [
          {
            id: 'blockchain-blues-album',
            title: 'Blockchain Blues',
            artist: 'Decentralized Soul',
            artistAddress: '0x5555...6666',
            coverArt: '',
            price: 0.06,
            genre: 'Blues',
            releaseDate: '2024-01-25',
            trackCount: 1,
            totalSales: 156,
            totalRevenue: 4.21,
            description: 'A digital twist on classic blues, featuring the hit "Blockchain Blues".',
            tracks: [
              { id: '1', title: 'Blockchain Blues', duration: '3:30', price: 0.06, trackNumber: 1, isPreview: true }
            ]
          }
        ],
        'headphone-son': [
          {
            id: 'midnight-city-album',
            title: 'Midnight City',
            artist: 'Headphone Son',
            artistAddress: '0x1234...5678',
            coverArt: '',
            price: 0.08,
            genre: 'Electronic',
            releaseDate: '2024-01-10',
            trackCount: 3,
            totalSales: 342,
            totalRevenue: 8.21,
            description: 'A mesmerizing electronic journey through the neon-lit streets of a digital metropolis.',
            tracks: [
              { id: '1', title: 'Midnight City', duration: '4:32', price: 0.08, trackNumber: 1, isPreview: true },
              { id: '2', title: 'Bitcoin', duration: '4:20', price: 0.08, trackNumber: 2, isPreview: false },
              { id: '3', title: 'Recording 2018-04-19', duration: '5:15', price: 0.12, trackNumber: 3, isPreview: false }
            ]
          }
        ]
      };

      const artistData = mockArtists[id];
      const artistAlbums = mockAlbums[id] || [];

      if (artistData) {
        setArtist(artistData);
        setAlbums(artistAlbums);
        fetchArtistUnlocks(id);
      } else {
        // Handle artist not found
        console.error('Artist not found:', id);
      }
    } catch (error) {
      console.error('Failed to fetch artist data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArtistUnlocks = async (artistId: string) => {
    try {
      // Mock data for artist unlocks - in real implementation this would fetch from API
      const mockUnlocks: Record<string, ArtistUnlock[]> = {
        'crypto-beats': [
          {
            id: '1',
            title: 'Exclusive B-Side Track',
            description: 'Unlock an exclusive B-side track that was never released publicly',
            tokenType: 'PARA',
            tokenAmount: 50,
            unlockType: 'exclusive-track',
            contentUrl: 'https://example.com/exclusive-track.mp3',
            isActive: true,
            createdAt: '2024-01-15T10:30:00Z',
            totalPurchases: 23,
            revenue: 1150
          },
          {
            id: '2',
            title: 'Behind the Scenes Studio Session',
            description: 'Watch the full studio recording session for our latest album',
            tokenType: 'HEAT',
            tokenAmount: 200,
            unlockType: 'behind-scenes',
            contentUrl: 'https://example.com/studio-session.mp4',
            isActive: true,
            createdAt: '2024-01-10T14:20:00Z',
            totalPurchases: 12,
            revenue: 2400
          }
        ],
        'heat-wave': [
          {
            id: '3',
            title: 'Early Access to Next Release',
            description: 'Get 48-hour early access to our upcoming single',
            tokenType: 'XFG',
            tokenAmount: 0.001,
            unlockType: 'early-access',
            isActive: true,
            createdAt: '2024-01-05T09:15:00Z',
            totalPurchases: 8,
            revenue: 0.008
          },
          {
            id: '4',
            title: 'VIP Backstage Pass',
            description: 'Exclusive backstage access and meet & greet at upcoming shows',
            tokenType: 'PARA',
            tokenAmount: 100,
            unlockType: 'vip-access',
            isActive: true,
            createdAt: '2024-01-12T16:45:00Z',
            totalPurchases: 5,
            revenue: 500
          }
        ],
        'cosmic-dj': [
          {
            id: '5',
            title: 'Custom Space Ambient Mix',
            description: 'A personalized 30-minute ambient mix created just for you',
            tokenType: 'HEAT',
            tokenAmount: 150,
            unlockType: 'custom-content',
            isActive: true,
            createdAt: '2024-01-08T11:20:00Z',
            totalPurchases: 15,
            revenue: 2250
          }
        ],
        'decentralized-soul': [
          {
            id: '6',
            title: 'Digital Blues Experience',
            description: 'Unlock a digital blues experience, including a curated playlist and exclusive merch.',
            tokenType: 'XFG',
            tokenAmount: 0.01,
            unlockType: 'custom-content',
            isActive: true,
            createdAt: '2024-01-18T10:00:00Z',
            totalPurchases: 10,
            revenue: 100
          }
        ],
        'headphone-son': [
          {
            id: '7',
            title: 'Neon City Soundtrack',
            description: 'Unlock the full soundtrack of "Midnight City" and a special remix.',
            tokenType: 'PARA',
            tokenAmount: 50,
            unlockType: 'exclusive-track',
            isActive: true,
            createdAt: '2024-01-20T11:00:00Z',
            totalPurchases: 8,
            revenue: 400
          }
        ]
      };

      const artistUnlocks = mockUnlocks[artistId] || [];
      setUnlocks(artistUnlocks);
    } catch (error) {
      console.error('Failed to fetch artist unlocks:', error);
    }
  };

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handlePurchaseAlbum = async (album: Album) => {
    try {
      // Mock purchase logic
      alert(`Purchasing ${album.title} for ${album.price} XFG...`);
      // In real implementation, this would trigger wallet connection and transaction
    } catch (error) {
      console.error('Failed to purchase album:', error);
      alert('Failed to purchase album');
    }
  };

  const handlePurchaseUnlock = async (unlock: ArtistUnlock) => {
    try {
      // Mock purchase logic
      alert(`Purchasing ${unlock.title} for ${unlock.tokenAmount} ${unlock.tokenType}...`);
      // In real implementation, this would trigger wallet connection and transaction
    } catch (error) {
      console.error('Failed to purchase unlock:', error);
      alert('Failed to purchase unlock');
    }
  };

  const getUnlockTypeInfo = (type: ArtistUnlock['unlockType']) => {
    const types = {
      'exclusive-track': { label: 'Exclusive Track', icon: '🎵', color: 'text-green-400' },
      'behind-scenes': { label: 'Behind the Scenes', icon: '🎬', color: 'text-blue-400' },
      'early-access': { label: 'Early Access', icon: '⏰', color: 'text-yellow-400' },
      'custom-content': { label: 'Custom Content', icon: '🎨', color: 'text-purple-400' },
      'merch-discount': { label: 'Merch Discount', icon: '👕', color: 'text-orange-400' },
              'vip-access': { label: 'VIP Access', icon: '👑', color: 'text-fuchsia-400' }
    };
    return types[type];
  };

  const getTokenInfo = (tokenType: 'PARA' | 'HEAT' | 'XFG') => {
    const tokens = {
              'PARA': { icon: '🔥', color: 'text-orange-400', name: 'PARA Token' },
      'HEAT': { icon: '🔥', color: 'text-yellow-400', name: 'HEAT Token' },
      'XFG': { icon: '🔥', color: 'text-red-400', name: 'XFG Coin' }
    };
    return tokens[tokenType];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-fuchsia-400">Loading artist...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold text-white mb-2">Artist Not Found</h2>
          <p className="text-gray-400">The artist you're looking for doesn't exist.</p>
          <Link to="/marketplace" className="btn-primary mt-4 inline-block">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Artist Header */}
      <div className="glass p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="w-32 h-32 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-full flex items-center justify-center text-4xl text-fuchsia-400">
            {artist.avatar ? (
              <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              '🎤'
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{artist.name}</h1>
              {artist.verified && (
                <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                  ✓ Verified
                </span>
              )}
            </div>
            
            <p className="text-gray-300 mb-4 max-w-2xl">{artist.bio}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {artist.genres.map(genre => (
                <span key={genre} className="bg-fuchsia-600/20 text-fuchsia-400 px-3 py-1 rounded-full text-sm">
                  {genre}
                </span>
              ))}
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div>
                <span className="text-gray-400">Address:</span>
                <span className="text-white ml-2 font-mono">{artist.address}</span>
              </div>
              <div>
                <span className="text-gray-400">Albums:</span>
                <span className="text-white ml-2">{artist.totalAlbums}</span>
              </div>
              <div>
                <span className="text-gray-400">Total Sales:</span>
                <span className="text-white ml-2">{artist.totalSales}</span>
              </div>
              <div>
                <span className="text-gray-400">Revenue:</span>
                <span className="gradient-text font-bold ml-2">{artist.totalRevenue} XFG</span>
              </div>
              <div className="text-sm text-green-400 font-bold mt-2">Total PARA Earned: {artist.totalParaEarned.toLocaleString()} PARA</div>
            </div>
            
            {Object.keys(artist.socialLinks).length > 0 && (
              <div className="flex space-x-4 mt-4">
                {artist.socialLinks.twitter && (
                  <a href={artist.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                    Twitter
                  </a>
                )}
                {artist.socialLinks.instagram && (
                  <a href={artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition-colors">
                    Instagram
                  </a>
                )}
                {artist.socialLinks.website && (
                  <a href={artist.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-fuchsia-400 transition-colors">
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Unlocks Section */}
      {unlocks.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Premium Unlocks</h2>
          <p className="text-gray-400">Exclusive content and experiences from {artist.name}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unlocks.filter(unlock => unlock.isActive).map(unlock => {
              const typeInfo = getUnlockTypeInfo(unlock.unlockType);
              const tokenInfo = getTokenInfo(unlock.tokenType);
              
              return (
                <div key={unlock.id} className="group">
                  <div className="card hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                    <div className="relative">
                      <div className="w-full h-48 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                        <div className="text-4xl">{typeInfo.icon}</div>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
                          {unlock.totalPurchases} sold
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-white font-semibold text-lg truncate group-hover:text-fuchsia-300 transition-colors">
                          {unlock.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{unlock.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className={tokenInfo.color}>{tokenInfo.icon}</span>
                          <span className="text-white font-medium">
                            {unlock.tokenAmount} {unlock.tokenType}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.color} bg-opacity-20`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          {unlock.revenue} {unlock.tokenType} earned
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUnlock(unlock);
                            setShowUnlockModal(true);
                          }}
                          className="btn-primary text-sm"
                        >
                          Unlock Content
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Albums Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Albums</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map(album => (
            <div key={album.id} className="group">
              <div className="card hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="relative">
                  <div className="w-full h-64 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                    {album.coverArt ? (
                      <img src={album.coverArt} alt={album.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="text-6xl text-fuchsia-400/50">💿</div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                      {album.trackCount} tracks
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg truncate group-hover:text-fuchsia-300 transition-colors">
                      {album.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{album.releaseDate}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{album.genre}</span>
                    <span className="text-fuchsia-400 font-medium">{album.totalSales} sales</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold gradient-text">{album.price} XFG</span>
                      <div className="text-xs text-gray-400 mt-1">
                        Revenue: {album.totalRevenue} XFG
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlbumClick(album);
                        }}
                        className="btn-secondary text-sm"
                      >
                        View Tracks
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchaseAlbum(album);
                        }}
                        className="btn-primary text-sm"
                      >
                        Purchase Album
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="gradient-text text-2xl font-bold">Album: {selectedAlbum.title}</h3>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
                <div className="w-full md:w-64 h-64 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedAlbum.coverArt ? (
                    <img src={selectedAlbum.coverArt} alt={selectedAlbum.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-6xl text-fuchsia-400/50">💿</div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-white font-bold text-2xl">{selectedAlbum.title}</h4>
                    <p className="text-fuchsia-300 text-lg">{selectedAlbum.artist}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="glass p-4 rounded-xl">
                      <span className="text-gray-400">Release Date</span>
                      <p className="text-white font-medium">{selectedAlbum.releaseDate}</p>
                    </div>
                    <div className="glass p-4 rounded-xl">
                      <span className="text-gray-400">Genre</span>
                      <p className="text-white font-medium">{selectedAlbum.genre}</p>
                    </div>
                    <div className="glass p-4 rounded-xl">
                      <span className="text-gray-400">Price</span>
                      <p className="gradient-text font-bold text-xl">{selectedAlbum.price} XFG</p>
                    </div>
                    <div className="glass p-4 rounded-xl">
                      <span className="text-gray-400">Total Sales</span>
                      <p className="text-white font-medium">{selectedAlbum.totalSales}</p>
                    </div>
                  </div>

                  {selectedAlbum.description && (
                    <div className="glass p-4 rounded-xl">
                      <span className="text-gray-400 text-sm">Description</span>
                      <p className="text-white text-sm mt-2">{selectedAlbum.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Track List */}
              <div className="space-y-4">
                <h5 className="text-white font-semibold text-lg">Tracks ({selectedAlbum.tracks.length})</h5>
                <div className="space-y-2">
                  {selectedAlbum.tracks.map(track => (
                    <div key={track.id} className="glass p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-400 text-sm w-8">{track.trackNumber}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{track.title}</span>
                            {track.isPreview && (
                              <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded-full text-xs">
                                Preview
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 text-sm">{track.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-fuchsia-400 font-medium">{track.price} XFG</span>
                        <button className="btn-secondary text-xs">
                          {track.isPreview ? 'Preview' : 'Purchase'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => handlePurchaseAlbum(selectedAlbum)}
                  className="btn-primary flex-1"
                >
                  Purchase Full Album for {selectedAlbum.price} XFG
                </button>
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Detail Modal */}
      {showUnlockModal && selectedUnlock && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="gradient-text text-2xl font-bold">Premium Unlock</h3>
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setSelectedUnlock(null);
                }}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">{getUnlockTypeInfo(selectedUnlock.unlockType).icon}</div>
                <h4 className="text-white font-bold text-xl mb-2">{selectedUnlock.title}</h4>
                <p className="text-gray-400">{selectedUnlock.description}</p>
              </div>

              <div className="glass p-6 rounded-xl">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Token Type</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={getTokenInfo(selectedUnlock.tokenType).color}>
                        {getTokenInfo(selectedUnlock.tokenType).icon}
                      </span>
                      <span className="text-white font-medium">{selectedUnlock.tokenType}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Price</span>
                    <p className="text-white font-bold text-lg mt-1">
                      {selectedUnlock.tokenAmount} {selectedUnlock.tokenType}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Type</span>
                    <p className={`font-medium mt-1 ${getUnlockTypeInfo(selectedUnlock.unlockType).color}`}>
                      {getUnlockTypeInfo(selectedUnlock.unlockType).label}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Purchases</span>
                    <p className="text-white font-medium mt-1">{selectedUnlock.totalPurchases}</p>
                  </div>
                </div>
              </div>

              {selectedUnlock.contentUrl && (
                <div className="glass p-4 rounded-xl">
                  <h5 className="text-white font-semibold mb-2">Content Preview</h5>
                  <div className="bg-black/20 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">
                      Content URL: <a href={selectedUnlock.contentUrl} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:underline">{selectedUnlock.contentUrl}</a>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => handlePurchaseUnlock(selectedUnlock)}
                  className="btn-primary flex-1"
                >
                  Purchase for {selectedUnlock.tokenAmount} {selectedUnlock.tokenType}
                </button>
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    setSelectedUnlock(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistPage; 