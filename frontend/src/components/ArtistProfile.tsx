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

const ArtistProfile: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (evmAddress) {
      fetchArtistProfile();
    }
  }, [evmAddress]);

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
    </div>
  );
};

export default ArtistProfile; 