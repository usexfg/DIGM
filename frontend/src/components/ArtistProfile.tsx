import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface ArtistProfile {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  genres: string[];
  socialLinks: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    spotify?: string;
  };
  totalSales: number;
  totalTracks: number;
  followers: number;
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

const ArtistProfile: React.FC = () => {
  const { evmAddress } = useWallet();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unlocks, setUnlocks] = useState<ArtistUnlock[]>([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [editingUnlock, setEditingUnlock] = useState<ArtistUnlock | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    genres: [] as string[],
    socialLinks: {
      twitter: '',
      instagram: '',
      youtube: '',
      spotify: ''
    }
  });

  const [unlockFormData, setUnlockFormData] = useState({
    title: '',
    description: '',
    tokenType: 'PARA' as 'PARA' | 'HEAT' | 'XFG',
    tokenAmount: 0,
    unlockType: 'exclusive-track' as ArtistUnlock['unlockType'],
    contentUrl: '',
    isActive: true
  });

  useEffect(() => {
    if (evmAddress) {
      fetchArtistProfile();
      fetchArtistUnlocks();
    }
  }, [evmAddress, fetchArtistProfile, fetchArtistUnlocks]);

  const fetchArtistProfile = async () => {
    if (!evmAddress) return;
    
    try {
      const response = await fetch(`/api/artist/profile/${evmAddress}`);
      const data = await response.json();
      setProfile(data.profile);
      
      // Initialize form data
      setFormData({
        name: data.profile?.name || '',
        bio: data.profile?.bio || '',
        genres: data.profile?.genres || [],
        socialLinks: data.profile?.socialLinks || {
          twitter: '',
          instagram: '',
          youtube: '',
          spotify: ''
        }
      });
    } catch (error) {
      console.error('Failed to fetch artist profile:', error);
    }
  };

  const fetchArtistUnlocks = async () => {
    if (!evmAddress) return;
    
    try {
      // Mock data for now - in real implementation this would fetch from API
      const mockUnlocks: ArtistUnlock[] = [
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
        },
        {
          id: '3',
          title: 'Early Access to Next Release',
          description: 'Get 48-hour early access to our upcoming single',
          tokenType: 'XFG',
          tokenAmount: 0.001,
          unlockType: 'early-access',
          isActive: false,
          createdAt: '2024-01-05T09:15:00Z',
          totalPurchases: 8,
          revenue: 0.008
        }
      ];
      
      setUnlocks(mockUnlocks);
    } catch (error) {
      console.error('Failed to fetch artist unlocks:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!evmAddress) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/artist/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: evmAddress,
          ...formData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      await fetchArtistProfile();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreChange = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleCreateUnlock = () => {
    setEditingUnlock(null);
    setUnlockFormData({
      title: '',
      description: '',
      tokenType: 'PARA',
      tokenAmount: 0,
      unlockType: 'exclusive-track',
      contentUrl: '',
      isActive: true
    });
    setShowUnlockModal(true);
  };

  const handleEditUnlock = (unlock: ArtistUnlock) => {
    setEditingUnlock(unlock);
    setUnlockFormData({
      title: unlock.title,
      description: unlock.description,
      tokenType: unlock.tokenType,
      tokenAmount: unlock.tokenAmount,
      unlockType: unlock.unlockType,
      contentUrl: unlock.contentUrl || '',
      isActive: unlock.isActive
    });
    setShowUnlockModal(true);
  };

  const handleSaveUnlock = async () => {
    if (!evmAddress) return;

    try {
      const unlockData = {
        ...unlockFormData,
        artistAddress: evmAddress,
        id: editingUnlock?.id || Date.now().toString()
      };

      // Mock save - in real implementation this would save to API
      if (editingUnlock) {
        setUnlocks(prev => prev.map(u => u.id === editingUnlock.id ? { ...u, ...unlockData } : u));
      } else {
        const newUnlock: ArtistUnlock = {
          ...unlockData,
          createdAt: new Date().toISOString(),
          totalPurchases: 0,
          revenue: 0
        };
        setUnlocks(prev => [...prev, newUnlock]);
      }

      setShowUnlockModal(false);
      setEditingUnlock(null);
      alert(editingUnlock ? 'Unlock updated successfully!' : 'Unlock created successfully!');
    } catch (error) {
      console.error('Failed to save unlock:', error);
      alert('Failed to save unlock');
    }
  };

  const handleToggleUnlock = async (unlockId: string) => {
    setUnlocks(prev => prev.map(u => 
      u.id === unlockId ? { ...u, isActive: !u.isActive } : u
    ));
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

  const availableGenres = [
    'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical',
    'Country', 'R&B', 'Reggae', 'Folk', 'Blues', 'Metal',
    'Ambient', 'Techno', 'House', 'Drum & Bass', 'Trap', 'Lo-fi'
  ];

  if (!evmAddress) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Artist Profile</h2>
        <p className="text-slate-400">Please connect your wallet to access your artist profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold">Artist Profile</h2>
          {profile && (
            <div className="flex space-x-2">
              {profile.verified && (
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                  Verified Artist
                </span>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-secondary text-sm"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          )}
        </div>

        {!profile && !isEditing ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">You haven't created your artist profile yet.</p>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary"
            >
              Create Artist Profile
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Image */}
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Artist" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl text-slate-400">🎵</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{profile?.name || 'Artist Name'}</h3>
                <p className="text-slate-400 text-sm">{evmAddress}</p>
              </div>
            </div>

            {/* Profile Form */}
            {isEditing && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Artist Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field w-full"
                    placeholder="Enter your artist name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="input-field w-full h-24 resize-none"
                    placeholder="Tell us about your music..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Genres
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableGenres.map(genre => (
                      <label key={genre} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.genres.includes(genre)}
                          onChange={() => handleGenreChange(genre)}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <span className="text-sm text-slate-300">{genre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Twitter
                    </label>
                    <input
                      type="text"
                      value={formData.socialLinks.twitter}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                      }))}
                      className="input-field w-full"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={formData.socialLinks.instagram}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                      }))}
                      className="input-field w-full"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      YouTube
                    </label>
                    <input
                      type="text"
                      value={formData.socialLinks.youtube}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                      }))}
                      className="input-field w-full"
                      placeholder="Channel URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Spotify
                    </label>
                    <input
                      type="text"
                      value={formData.socialLinks.spotify}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, spotify: e.target.value }
                      }))}
                      className="input-field w-full"
                      placeholder="Artist URL"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Profile Display */}
            {!isEditing && profile && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Bio</h4>
                  <p className="text-white">{profile.bio || 'No bio available'}</p>
                </div>

                {profile.genres.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Genres</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.genres.map(genre => (
                        <span key={genre} className="bg-slate-700 px-2 py-1 rounded text-xs">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">{profile.totalSales}</p>
                    <p className="text-xs text-slate-400">Total Sales</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">{profile.totalTracks}</p>
                    <p className="text-xs text-slate-400">Tracks</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">{profile.followers}</p>
                    <p className="text-xs text-slate-400">Followers</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">{profile.verified ? '✓' : '—'}</p>
                    <p className="text-xs text-slate-400">Verified</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Artist Premium Unlocks Section */}
      {profile && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">Premium Unlocks</h2>
              <p className="text-slate-400 text-sm">Create exclusive content for your fans using PARA, HEAT, or XFG tokens</p>
            </div>
            <button
              onClick={handleCreateUnlock}
              className="btn-primary text-sm"
            >
              + Create Unlock
            </button>
          </div>

          {unlocks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold mb-2">No Premium Unlocks Yet</h3>
              <p className="text-slate-400 mb-4">Create exclusive content for your fans to unlock with tokens</p>
              <button
                onClick={handleCreateUnlock}
                className="btn-primary"
              >
                Create Your First Unlock
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {unlocks.map(unlock => {
                const typeInfo = getUnlockTypeInfo(unlock.unlockType);
                const tokenInfo = getTokenInfo(unlock.tokenType);
                
                return (
                  <div key={unlock.id} className={`glass p-4 rounded-xl border ${
                    unlock.isActive ? 'border-green-500/20' : 'border-gray-600/20'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-xl">{typeInfo.icon}</span>
                          <h3 className="text-white font-semibold">{unlock.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            unlock.isActive ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                          }`}>
                            {unlock.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <p className="text-slate-400 text-sm mb-3">{unlock.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className={tokenInfo.color}>{tokenInfo.icon}</span>
                            <span className="text-white font-medium">
                              {unlock.tokenAmount} {unlock.tokenType}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            {unlock.totalPurchases} purchases
                          </div>
                          <div className="text-green-400 font-medium">
                            {unlock.revenue} {unlock.tokenType} earned
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUnlock(unlock)}
                          className="btn-secondary text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleUnlock(unlock.id)}
                          className={`text-xs px-3 py-1 rounded ${
                            unlock.isActive 
                              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                          }`}
                        >
                          {unlock.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="gradient-text text-2xl font-bold">
                {editingUnlock ? 'Edit Premium Unlock' : 'Create Premium Unlock'}
              </h3>
              <button
                onClick={() => setShowUnlockModal(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Unlock Title
                </label>
                <input
                  type="text"
                  value={unlockFormData.title}
                  onChange={(e) => setUnlockFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., Exclusive B-Side Track"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={unlockFormData.description}
                  onChange={(e) => setUnlockFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field w-full h-24 resize-none"
                  placeholder="Describe what fans will unlock..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Token Type
                  </label>
                  <select
                    value={unlockFormData.tokenType}
                    onChange={(e) => setUnlockFormData(prev => ({ 
                      ...prev, 
                      tokenType: e.target.value as 'PARA' | 'HEAT' | 'XFG' 
                    }))}
                    className="input-field w-full"
                  >
                    <option value="PARA">🔥 PARA Token</option>
                    <option value="HEAT">🔥 HEAT Token</option>
                    <option value="XFG">🔥 XFG Coin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Token Amount
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={unlockFormData.tokenAmount}
                    onChange={(e) => setUnlockFormData(prev => ({ 
                      ...prev, 
                      tokenAmount: parseFloat(e.target.value) || 0 
                    }))}
                    className="input-field w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Unlock Type
                </label>
                <select
                  value={unlockFormData.unlockType}
                  onChange={(e) => setUnlockFormData(prev => ({ 
                    ...prev, 
                    unlockType: e.target.value as ArtistUnlock['unlockType'] 
                  }))}
                  className="input-field w-full"
                >
                  <option value="exclusive-track">🎵 Exclusive Track</option>
                  <option value="behind-scenes">🎬 Behind the Scenes</option>
                  <option value="early-access">⏰ Early Access</option>
                  <option value="custom-content">🎨 Custom Content</option>
                  <option value="merch-discount">👕 Merch Discount</option>
                  <option value="vip-access">👑 VIP Access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Content URL (Optional)
                </label>
                <input
                  type="url"
                  value={unlockFormData.contentUrl}
                  onChange={(e) => setUnlockFormData(prev => ({ ...prev, contentUrl: e.target.value }))}
                  className="input-field w-full"
                  placeholder="https://example.com/content"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Link to the exclusive content (audio, video, document, etc.)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={unlockFormData.isActive}
                  onChange={(e) => setUnlockFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">
                  Activate this unlock immediately
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleSaveUnlock}
                  className="btn-primary flex-1"
                >
                  {editingUnlock ? 'Update Unlock' : 'Create Unlock'}
                </button>
                <button
                  onClick={() => setShowUnlockModal(false)}
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

export default ArtistProfile; 