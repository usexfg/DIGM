import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { playlistStorage, DIGMPlaylist } from '../utils/playlistStorage';
import { getGunRefs } from '../utils/gunConfig';

interface SyncStatus {
  isConnected: boolean;
  lastSync: number;
  pendingChanges: number;
  networkPeers: number;
  syncErrors: string[];
}

interface LiveUpdate {
  id: string;
  type: 'playlist_created' | 'playlist_updated' | 'playlist_approved' | 'playlist_rejected';
  playlistId: string;
  timestamp: number;
  user: string;
  data: any;
}

const RealTimePlaylistSync: React.FC = () => {
  const { evmAddress } = useWallet();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: 0,
    pendingChanges: 0,
    networkPeers: 0,
    syncErrors: []
  });
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([]);
  const [isListening, setIsListening] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize real-time sync
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Start listening for real-time updates
        startListening();
        
        // Set up periodic sync
        syncIntervalRef.current = setInterval(() => {
          performSync();
        }, 5000); // Sync every 5 seconds

        setSyncStatus(prev => ({
          ...prev,
          isConnected: true,
          lastSync: Date.now()
        }));

        // Load initial playlists
        const initialPlaylists = await playlistStorage.getAllPlaylists();
        setPlaylists(initialPlaylists);
      } catch (error) {
        console.error('Failed to initialize real-time sync:', error);
        setSyncStatus(prev => ({
          ...prev,
          syncErrors: [...prev.syncErrors, `Sync initialization failed: ${error}`]
        }));
      }
    };

    initializeSync();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  const startListening = async () => {
    if (isListening) return;

    try {
      // Listen for playlist updates
      await playlistStorage.onPlaylistUpdate((playlist: DIGMPlaylist) => {
        handlePlaylistUpdate(playlist);
      });

      // Listen for curation updates
      await playlistStorage.onCurationUpdate((curationData: any) => {
        handleCurationUpdate(curationData);
      });

      setIsListening(true);
      console.log('Real-time sync listening started');
    } catch (error) {
      console.error('Failed to start listening:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, `Listening failed: ${error}`]
      }));
    }
  };

  const handlePlaylistUpdate = (playlist: DIGMPlaylist) => {
    // Update local playlists
    setPlaylists(prev => {
      const existingIndex = prev.findIndex(p => p.id === playlist.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = playlist;
        return updated;
      } else {
        return [...prev, playlist];
      }
    });

    // Add to live updates
    const update: LiveUpdate = {
      id: `update_${Date.now()}_${Math.random()}`,
      type: playlist.status === 'submitted' ? 'playlist_created' : 
            playlist.status === 'approved' ? 'playlist_approved' :
            playlist.status === 'rejected' ? 'playlist_rejected' : 'playlist_updated',
      playlistId: playlist.id,
      timestamp: Date.now(),
      user: playlist.createdBy,
      data: { status: playlist.status, name: playlist.name }
    };

    addLiveUpdate(update);
  };

  const handleCurationUpdate = (curationData: any) => {
    const update: LiveUpdate = {
      id: `curation_${Date.now()}_${Math.random()}`,
      type: 'playlist_updated',
      playlistId: curationData.playlistId || 'unknown',
      timestamp: Date.now(),
      user: curationData.reviewer || 'unknown',
      data: curationData
    };

    addLiveUpdate(update);
  };

  const addLiveUpdate = (update: LiveUpdate) => {
    setLiveUpdates(prev => {
      const newUpdates = [update, ...prev.slice(0, 9)]; // Keep last 10 updates
      return newUpdates;
    });
  };

  const performSync = async () => {
    try {
      // Simulate network peer count
      const mockPeerCount = Math.floor(Math.random() * 10) + 1;
      
      // Check for pending changes
      const pendingChanges = Math.floor(Math.random() * 3);
      
      setSyncStatus(prev => ({
        ...prev,
        lastSync: Date.now(),
        pendingChanges,
        networkPeers: mockPeerCount
      }));

      // Refresh playlists from storage
      const updatedPlaylists = await playlistStorage.getAllPlaylists();
      setPlaylists(updatedPlaylists);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors.slice(-4), `Sync failed: ${error}`] // Keep last 5 errors
      }));
    }
  };

  const clearErrors = () => {
    setSyncStatus(prev => ({
      ...prev,
      syncErrors: []
    }));
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getUpdateIcon = (type: LiveUpdate['type']) => {
    switch (type) {
      case 'playlist_created': return '🎵';
      case 'playlist_updated': return '✏️';
      case 'playlist_approved': return '✅';
      case 'playlist_rejected': return '❌';
      default: return '📝';
    }
  };

  const getUpdateColor = (type: LiveUpdate['type']) => {
    switch (type) {
      case 'playlist_created': return 'text-blue-400';
      case 'playlist_updated': return 'text-yellow-400';
      case 'playlist_approved': return 'text-green-400';
      case 'playlist_rejected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Real-Time Playlist Sync</h1>
        <p className="text-gray-300">
          Live synchronization of playlist curation across the network
        </p>
      </div>

      {/* Sync Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Connection Status</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${syncStatus.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-white">{syncStatus.isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Network Peers</h3>
          <p className="text-3xl font-bold text-blue-400">{syncStatus.networkPeers}</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Pending Changes</h3>
          <p className="text-3xl font-bold text-yellow-400">{syncStatus.pendingChanges}</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Last Sync</h3>
          <p className="text-sm text-gray-300">{formatTime(syncStatus.lastSync)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Updates */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Live Updates</h2>
          
          {liveUpdates.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent updates</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveUpdates.map(update => (
                <div key={update.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getUpdateIcon(update.type)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className={`font-medium ${getUpdateColor(update.type)}`}>
                          {update.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(update.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        Playlist: {update.data.name || update.playlistId}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        by {update.user.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Errors */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Sync Errors</h2>
            {syncStatus.syncErrors.length > 0 && (
              <button
                onClick={clearErrors}
                className="text-sm text-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          
          {syncStatus.syncErrors.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No sync errors</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {syncStatus.syncErrors.map((error, index) => (
                <div key={index} className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Playlists */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Synchronized Playlists</h2>
        
        {playlists.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No playlists found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map(playlist => (
              <div key={playlist.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-medium">{playlist.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    playlist.status === 'approved' ? 'bg-green-600 text-white' :
                    playlist.status === 'rejected' ? 'bg-red-600 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {playlist.status}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{playlist.description}</p>
                
                <div className="flex gap-2 mb-3">
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    {playlist.genre}
                  </span>
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                    {playlist.mood}
                  </span>
                </div>
                
                <div className="text-sm text-gray-300">
                  <div>Tracks: {playlist.tracks.length}</div>
                  <div>Creator: {playlist.creatorType}</div>
                  {playlist.curationSchedule?.enabled && (
                    <div className="text-green-400">
                      Curation: {playlist.curationSchedule.totalHoursPerDay}h/day
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Controls */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Sync Controls</h2>
        
        <div className="flex gap-4">
          <button
            onClick={performSync}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Manual Sync
          </button>
          
          <button
            onClick={startListening}
            disabled={isListening}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isListening ? 'Listening...' : 'Start Listening'}
          </button>
          
          <button
            onClick={clearErrors}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Clear Errors
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealTimePlaylistSync;
