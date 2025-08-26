import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { formatDuration } from '../utils/fileUpload';
import { playlistStorage, DIGMPlaylist, PlaylistTrack } from '../utils/playlistStorage';

// Using interfaces from playlistStorage.ts

const PlaylistDiscovery: React.FC = () => {
  const { evmAddress } = useWallet();
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load playlists from GUN storage
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const allPlaylists = await playlistStorage.getAllPlaylists();
        setPlaylists(allPlaylists);
      } catch (error) {
        console.error('Error loading playlists:', error);
        // Fallback to mock data if GUN fails
        const mockPlaylists: DIGMPlaylist[] = [
          {
            id: '1',
            name: 'Digital Night Vibes',
            description: 'A curated selection of electronic tracks perfect for late-night listening sessions.',
            createdBy: '0x1234...5678',
            creatorType: 'artist',
            tracks: [
              {
                id: '1',
                title: 'Digital Dreams',
                artist: 'CryptoBeats',
                duration: 180,
                audioUrl: '/mock/audio1.mp3',
                genre: 'Electronic',
                mood: 'Energetic'
              }
            ],
            genre: 'Electronic',
            mood: 'Chill',
            tags: ['ambient', 'synth', 'night'],
            status: 'submitted',
            curationSchedule: {
              enabled: true,
              timeSlots: [],
              totalHoursPerDay: 2,
              daysActive: ['monday', 'wednesday', 'friday']
            },
            stats: {
              totalPlays: 0,
              totalListeners: 0,
              totalHours: 0,
              followers: 0
            },
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now() - 86400000
          }
        ];
        setPlaylists(mockPlaylists);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylists();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading playlists...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Playlist Discovery</h1>
        <p className="text-gray-300">
          Browse playlists submitted for Paradio curation station conversion
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists.map(playlist => (
          <div
            key={playlist.id}
            className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-700/50 transition-colors cursor-pointer"
          >
            <h3 className="text-xl font-semibold text-white mb-2">{playlist.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{playlist.description}</p>
            
            <div className="flex gap-2 mb-4">
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {playlist.genre}
              </span>
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                {playlist.mood}
              </span>
              {playlist.curationSchedule?.enabled && (
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                  Curation Enabled
                </span>
              )}
            </div>

            <div className="text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Tracks:</span>
                <span>{playlist.tracks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Creator:</span>
                <span className="capitalize">{playlist.creatorType}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistDiscovery;
