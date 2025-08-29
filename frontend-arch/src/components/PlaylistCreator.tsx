import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { formatDuration } from '../utils/fileUpload';
import { playlistStorage, DIGMPlaylist, PlaylistTrack } from '../utils/playlistStorage';

// Using interfaces from playlistStorage.ts

const PlaylistCreator: React.FC = () => {
  const { evmAddress } = useWallet();
  const [hasDigmHosting, setHasDigmHosting] = useState(false);

  // Check DIGM hosting status
  useEffect(() => {
    const checkDigmHosting = async () => {
      if (!evmAddress) {
        setHasDigmHosting(false);
        return;
      }

      try {
        // Mock check - in real app this would query the blockchain
        const mockHasHosting = Math.random() > 0.5; // 50% chance for demo
        setHasDigmHosting(mockHasHosting);
      } catch (error) {
        console.error('Failed to check DIGM hosting status:', error);
        setHasDigmHosting(false);
      }
    };

    checkDigmHosting();
  }, [evmAddress]);
  const [playlist, setPlaylist] = useState<Partial<DIGMPlaylist>>({
    name: '',
    description: '',
    genre: '',
    mood: '',
    tags: [],
    tracks: [],
    status: 'draft'
  });
  const [availableTracks, setAvailableTracks] = useState<PlaylistTrack[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [curationEnabled, setCurationEnabled] = useState(false);

  // Mock available tracks (in real implementation, this would come from DIGM platform)
  useEffect(() => {
    const mockTracks: PlaylistTrack[] = [
      {
        id: '1',
        title: 'Digital Dreams',
        artist: 'CryptoBeats',
        duration: 180,
        audioUrl: '/mock/audio1.mp3',
        genre: 'Electronic',
        mood: 'Energetic'
      },
      {
        id: '2',
        title: 'Blockchain Blues',
        artist: 'DeFi Diva',
        duration: 240,
        audioUrl: '/mock/audio2.mp3',
        genre: 'Jazz',
        mood: 'Chill'
      },
      {
        id: '3',
        title: 'Mining Melody',
        artist: 'Hash Harmony',
        duration: 200,
        audioUrl: '/mock/audio3.mp3',
        genre: 'Rock',
        mood: 'Intense'
      }
    ];
    setAvailableTracks(mockTracks);
  }, []);

  const addTrackToPlaylist = (track: PlaylistTrack) => {
    if (!playlist.tracks?.find(t => t.id === track.id)) {
      setPlaylist(prev => ({
        ...prev,
        tracks: [...(prev.tracks || []), track]
      }));
    }
  };

  const removeTrackFromPlaylist = (trackId: string) => {
    setPlaylist(prev => ({
      ...prev,
      tracks: prev.tracks?.filter(t => t.id !== trackId) || []
    }));
  };

  const addTag = (tag: string) => {
    if (tag && !playlist.tags?.includes(tag)) {
      setPlaylist(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setPlaylist(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  const handleSubmit = async () => {
    if (!evmAddress || !hasDigmHosting) {
      alert('You need DIGM hosting permissions to create playlists');
      return;
    }

    if (!playlist.name || !playlist.description || !playlist.tracks?.length) {
      alert('Please fill in all required fields and add at least one track');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPlaylist: DIGMPlaylist = {
        id: `playlist_${Date.now()}`,
        name: playlist.name!,
        description: playlist.description!,
        createdBy: evmAddress,
        creatorType: 'artist',
        tracks: playlist.tracks!,
        genre: playlist.genre!,
        mood: playlist.mood!,
        tags: playlist.tags || [],
        status: 'submitted',
        curationSchedule: curationEnabled ? {
          enabled: true,
          timeSlots: [],
          totalHoursPerDay: 2,
          daysActive: ['monday', 'wednesday', 'friday']
        } : undefined,
        stats: {
          totalPlays: 0,
          totalListeners: 0,
          totalHours: 0,
          followers: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save to GUN storage
      await playlistStorage.savePlaylist(newPlaylist);
      console.log('Playlist submitted for curation:', newPlaylist);
      
      alert('Playlist submitted for curation! Curators will review your submission.');
      setPlaylist({
        name: '',
        description: '',
        genre: '',
        mood: '',
        tags: [],
        tracks: [],
        status: 'draft'
      });
      setCurationEnabled(false);
    } catch (error) {
      console.error('Error submitting playlist:', error);
      alert('Failed to submit playlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDuration = playlist.tracks?.reduce((sum, track) => sum + track.duration, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Create Playlist for Curation</h1>
        <p className="text-gray-300">
          Create a playlist that can be extended into a Paradio curation station during scheduled hours
        </p>
      </div>

      {!hasDigmHosting && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-300">
            You need DIGM hosting permissions to create playlists for curation.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Playlist Details */}
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Playlist Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  value={playlist.name}
                  onChange={(e) => setPlaylist(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter playlist name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={playlist.description}
                  onChange={(e) => setPlaylist(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Describe your playlist concept..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Genre *
                  </label>
                  <select
                    value={playlist.genre}
                    onChange={(e) => setPlaylist(prev => ({ ...prev, genre: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select genre</option>
                    <option value="Electronic">Electronic</option>
                    <option value="Rock">Rock</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Hip-Hop">Hip-Hop</option>
                    <option value="Classical">Classical</option>
                    <option value="Ambient">Ambient</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mood *
                  </label>
                  <select
                    value={playlist.mood}
                    onChange={(e) => setPlaylist(prev => ({ ...prev, mood: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select mood</option>
                    <option value="Energetic">Energetic</option>
                    <option value="Chill">Chill</option>
                    <option value="Intense">Intense</option>
                    <option value="Melancholic">Melancholic</option>
                    <option value="Uplifting">Uplifting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {playlist.tags?.map(tag => (
                    <span
                      key={tag}
                      className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        addTag(input.value.trim());
                        input.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Curation Settings */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Curation Station Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="curationEnabled"
                  checked={curationEnabled}
                  onChange={(e) => setCurationEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="curationEnabled" className="text-gray-300">
                  Enable curation station extension
                </label>
              </div>

              {curationEnabled && (
                <div className="text-sm text-gray-400 space-y-2">
                  <p>• Playlist will become a live radio station during scheduled hours</p>
                  <p>• Listeners will forfeit 20% of PARA earnings to you and curators</p>
                  <p>• Curators will manage specific time slots for your playlist</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track Selection */}
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Available Tracks</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableTracks.map(track => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{track.title}</h3>
                    <p className="text-gray-400 text-sm">{track.artist}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        {track.genre}
                      </span>
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        {track.mood}
                      </span>
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => addTrackToPlaylist(track)}
                    disabled={playlist.tracks?.some(t => t.id === track.id)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    {playlist.tracks?.some(t => t.id === track.id) ? 'Added' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Tracks */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Selected Tracks ({playlist.tracks?.length || 0})
            </h2>
            
            {playlist.tracks?.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No tracks selected</p>
            ) : (
              <div className="space-y-3">
                {playlist.tracks?.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                      <div>
                        <h3 className="text-white font-medium">{track.title}</h3>
                        <p className="text-gray-400 text-sm">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={() => removeTrackFromPlaylist(track.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="border-t border-gray-600 pt-3">
                  <div className="flex justify-between text-gray-300">
                    <span>Total Duration:</span>
                    <span>{formatDuration(totalDuration)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!hasDigmHosting || isSubmitting || !playlist.name || !playlist.description || !playlist.tracks?.length}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Curation'}
        </button>
      </div>
    </div>
  );
};

export default PlaylistCreator;
