import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { playlistStorage, DIGMPlaylist } from '../utils/playlistStorage';
import { fuegoDiscovery } from '../utils/fuegoDiscovery';

interface CollaborativeStation {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  collaborators: string[];
  currentTrack: string;
  queue: string[];
  listeners: number;
  isLive: boolean;
  genre: string;
  tags: string[];
  djRotation: string[];
  currentDJ: string;
  revenue: {
    totalEarned: number;
    distributedToCollaborators: number;
    platformShare: number;
  };
  settings: {
    maxCollaborators: number;
    djRotationTime: number; // minutes
    requireApproval: boolean;
    isPublic: boolean;
  };
  chat: ChatMessage[];
  schedule: StationSchedule[];
  stats: {
    totalHoursLive: number;
    peakListeners: number;
    tracksPlayed: number;
    averageRating: number;
  };
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system' | 'dj_action';
}

interface StationSchedule {
  id: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  assignedDJ: string;
  theme?: string;
}

interface DJRequest {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

const CollaborativeRadioStations: React.FC = () => {
  const { evmAddress } = useWallet();
  const [stations, setStations] = useState<CollaborativeStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<CollaborativeStation | null>(null);
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([]);
  const [djRequests, setDjRequests] = useState<DJRequest[]>([]);
  const [currentTrackPosition, setCurrentTrackPosition] = useState(0);
  const [isCreatingStation, setIsCreatingStation] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load playlists
        const allPlaylists = await playlistStorage.getAllPlaylists();
        setPlaylists(allPlaylists);

        // Load mock stations
        loadMockStations();
        loadMockDJRequests();

      } catch (error) {
        console.error('Error loading collaborative stations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Set up real-time updates
    const interval = setInterval(() => {
      updateStationStats();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadMockStations = () => {
    const mockStations: CollaborativeStation[] = [
      {
        id: 'station_1',
        name: 'Crypto Beats Collective',
        description: 'Collaborative electronic music station',
        createdBy: '0x1234...5678',
        collaborators: ['0x1234...5678', '0x8765...4321', '0x1111...2222'],
        currentTrack: 'Deep House Track #1',
        queue: ['track_2', 'track_3', 'track_4'],
        listeners: 47,
        isLive: true,
        genre: 'Electronic',
        tags: ['Deep House', 'Techno', 'Ambient'],
        djRotation: ['0x1234...5678', '0x8765...4321'],
        currentDJ: '0x1234...5678',
        revenue: {
          totalEarned: 2450,
          distributedToCollaborators: 1960,
          platformShare: 490
        },
        settings: {
          maxCollaborators: 5,
          djRotationTime: 60,
          requireApproval: true,
          isPublic: true
        },
        chat: [
          {
            id: 'msg_1',
            userId: '0x8765...4321',
            username: 'DJ_Alex',
            message: 'Great track selection!',
            timestamp: Date.now() - 300000,
            type: 'message'
          }
        ],
        schedule: [
          {
            id: 'sched_1',
            dayOfWeek: 1,
            startTime: '18:00',
            endTime: '20:00',
            assignedDJ: '0x1234...5678',
            theme: 'Deep House Monday'
          }
        ],
        stats: {
          totalHoursLive: 145,
          peakListeners: 89,
          tracksPlayed: 523,
          averageRating: 4.7
        }
      },
      {
        id: 'station_2',
        name: 'Indie Folk Collective',
        description: 'Collaborative indie and folk music station',
        createdBy: '0x3333...4444',
        collaborators: ['0x3333...4444', '0x5555...6666'],
        currentTrack: '',
        queue: [],
        listeners: 0,
        isLive: false,
        genre: 'Indie Folk',
        tags: ['Indie', 'Folk', 'Acoustic'],
        djRotation: ['0x3333...4444'],
        currentDJ: '',
        revenue: {
          totalEarned: 890,
          distributedToCollaborators: 712,
          platformShare: 178
        },
        settings: {
          maxCollaborators: 3,
          djRotationTime: 90,
          requireApproval: false,
          isPublic: true
        },
        chat: [],
        schedule: [],
        stats: {
          totalHoursLive: 67,
          peakListeners: 34,
          tracksPlayed: 234,
          averageRating: 4.4
        }
      }
    ];

    setStations(mockStations);
  };

  const loadMockDJRequests = () => {
    const mockRequests: DJRequest[] = [
      {
        id: 'req_1',
        userId: '0x7777...8888',
        username: 'MusicLover42',
        message: 'I have a great collection of ambient tracks to share!',
        timestamp: Date.now() - 3600000,
        status: 'pending'
      }
    ];

    setDjRequests(mockRequests);
  };

  const updateStationStats = () => {
    setStations(prev => prev.map(station => ({
      ...station,
      listeners: station.isLive ? Math.max(0, station.listeners + Math.floor(Math.random() * 10) - 5) : 0
    })));
  };

  const createStation = async () => {
    if (!evmAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setIsCreatingStation(true);
    
    // This would normally show a proper form modal
    const name = prompt('Enter station name:');
    const description = prompt('Enter station description:');
    const genre = prompt('Enter main genre:');

    if (!name || !description || !genre) {
      setIsCreatingStation(false);
      return;
    }

    const newStation: CollaborativeStation = {
      id: `station_${Date.now()}`,
      name,
      description,
      createdBy: evmAddress,
      collaborators: [evmAddress],
      currentTrack: '',
      queue: [],
      listeners: 0,
      isLive: false,
      genre,
      tags: [],
      djRotation: [evmAddress],
      currentDJ: '',
      revenue: {
        totalEarned: 0,
        distributedToCollaborators: 0,
        platformShare: 0
      },
      settings: {
        maxCollaborators: 5,
        djRotationTime: 60,
        requireApproval: true,
        isPublic: true
      },
      chat: [],
      schedule: [],
      stats: {
        totalHoursLive: 0,
        peakListeners: 0,
        tracksPlayed: 0,
        averageRating: 0
      }
    };

    setStations(prev => [...prev, newStation]);
    setIsCreatingStation(false);
    
    // TODO: Save to GUN storage
    console.log('Station created:', newStation);
  };

  const joinAsCollaborator = async (stationId: string) => {
    if (!evmAddress) return;

    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    if (station.settings.requireApproval) {
      // Add to DJ requests
      const request: DJRequest = {
        id: `req_${Date.now()}`,
        userId: evmAddress,
        username: `User_${evmAddress.slice(-4)}`,
        message: 'I would like to join as a collaborator',
        timestamp: Date.now(),
        status: 'pending'
      };

      setDjRequests(prev => [...prev, request]);
      alert('Request sent to station owner for approval');
    } else {
      // Add directly as collaborator
      setStations(prev => prev.map(s => 
        s.id === stationId 
          ? { ...s, collaborators: [...s.collaborators, evmAddress] }
          : s
      ));
      alert('Successfully joined as collaborator!');
    }
  };

  const approveDJRequest = (requestId: string, stationId: string) => {
    const request = djRequests.find(r => r.id === requestId);
    if (!request) return;

    setDjRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'approved' as const } : r
    ));

    setStations(prev => prev.map(s => 
      s.id === stationId 
        ? { ...s, collaborators: [...s.collaborators, request.userId] }
        : s
    ));
  };

  const rejectDJRequest = (requestId: string) => {
    setDjRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'rejected' as const } : r
    ));
  };

  const goLive = (stationId: string) => {
    setStations(prev => prev.map(s => 
      s.id === stationId 
        ? { ...s, isLive: true, currentDJ: evmAddress || '' }
        : s
    ));
  };

  const goOffline = (stationId: string) => {
    setStations(prev => prev.map(s => 
      s.id === stationId 
        ? { ...s, isLive: false, currentDJ: '' }
        : s
    ));
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !selectedStation || !evmAddress) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      userId: evmAddress,
      username: `User_${evmAddress.slice(-4)}`,
      message: chatMessage.trim(),
      timestamp: Date.now(),
      type: 'message'
    };

    setStations(prev => prev.map(s => 
      s.id === selectedStation.id 
        ? { ...s, chat: [...s.chat, newMessage] }
        : s
    ));

    setChatMessage('');

    // Scroll to bottom
    setTimeout(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 100);
  };

  const isUserCollaborator = (station: CollaborativeStation) => {
    return evmAddress && station.collaborators.includes(evmAddress);
  };

  const isStationOwner = (station: CollaborativeStation) => {
    return evmAddress === station.createdBy;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading collaborative radio stations...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Collaborative Radio Stations</h1>
        <p className="text-gray-300">
          Create and collaborate on live radio stations with other artists and DJs
        </p>
      </div>

      {/* Station Creation */}
      <div className="flex justify-center">
        <button
          onClick={createStation}
          disabled={isCreatingStation}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200"
        >
          {isCreatingStation ? 'Creating...' : 'Create Collaborative Station'}
        </button>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map(station => (
          <div
            key={station.id}
            className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedStation(station)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{station.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  station.isLive ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {station.isLive ? 'LIVE' : 'OFFLINE'}
                </span>
                <span className="text-yellow-400">★ {station.stats.averageRating}</span>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm mb-3">{station.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Genre:</span>
                <span className="text-white">{station.genre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Listeners:</span>
                <span className="text-green-400">{station.listeners}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Collaborators:</span>
                <span className="text-blue-400">{station.collaborators.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Queue:</span>
                <span className="text-purple-400">{station.queue.length} tracks</span>
              </div>
            </div>

            {station.currentTrack && (
              <div className="mt-3 p-2 bg-gray-700/50 rounded">
                <div className="text-xs text-gray-400">Now Playing:</div>
                <div className="text-sm text-white truncate">{station.currentTrack}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Station Details */}
      {selectedStation && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedStation.name}</h2>
              <p className="text-gray-300">{selectedStation.description}</p>
            </div>
            <button
              onClick={() => setSelectedStation(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Station Info & Controls */}
            <div className="space-y-6">
              {/* Station Stats */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Station Stats</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Hours Live:</span>
                    <p className="text-white">{selectedStation.stats.totalHoursLive}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Peak Listeners:</span>
                    <p className="text-white">{selectedStation.stats.peakListeners}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Tracks Played:</span>
                    <p className="text-white">{selectedStation.stats.tracksPlayed}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Earned:</span>
                    <p className="text-green-400">{selectedStation.revenue.totalEarned} PARA</p>
                  </div>
                </div>
              </div>

              {/* DJ Controls */}
              {isUserCollaborator(selectedStation) && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">DJ Controls</h3>
                  <div className="space-y-2">
                    {!selectedStation.isLive ? (
                      <button
                        onClick={() => goLive(selectedStation.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Go Live
                      </button>
                    ) : (
                      <button
                        onClick={() => goOffline(selectedStation.id)}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Go Offline
                      </button>
                    )}
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                      Add Track to Queue
                    </button>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                      Take DJ Turn
                    </button>
                  </div>
                </div>
              )}

              {/* Join Station */}
              {!isUserCollaborator(selectedStation) && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Join Station</h3>
                  <button
                    onClick={() => joinAsCollaborator(selectedStation.id)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Request to Join as DJ
                  </button>
                </div>
              )}

              {/* DJ Requests (for station owner) */}
              {isStationOwner(selectedStation) && djRequests.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">DJ Requests</h3>
                  <div className="space-y-3">
                    {djRequests
                      .filter(req => req.status === 'pending')
                      .map(request => (
                        <div key={request.id} className="bg-gray-600/50 rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white font-medium">{request.username}</span>
                            <span className="text-gray-400 text-sm">{formatTime(request.timestamp)}</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-3">{request.message}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveDJRequest(request.id, selectedStation.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectDJRequest(request.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Live Chat</h3>
              
              <div 
                ref={chatRef}
                className="h-64 overflow-y-auto mb-4 space-y-2"
              >
                {selectedStation.chat.map(message => (
                  <div key={message.id} className="text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-blue-400 font-medium">{message.username}</span>
                      <span className="text-gray-500 text-xs">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-gray-300">{message.message}</p>
                  </div>
                ))}
                
                {selectedStation.chat.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No messages yet. Be the first to chat!</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeRadioStations;
