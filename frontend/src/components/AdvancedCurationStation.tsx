import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { playlistStorage, DIGMPlaylist } from '../utils/playlistStorage';
import { fuegoDiscovery, FuegoNetworkStats } from '../utils/fuegoDiscovery';

interface CurationSession {
  id: string;
  playlistId: string;
  curatorId: string;
  startTime: number;
  endTime: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  listeners: number;
  totalPARAEarned: number;
}

interface CuratorProfile {
  id: string;
  address: string;
  name: string;
  reputation: number;
  totalSessions: number;
  totalPARAEarned: number;
  specialties: string[];
}

const AdvancedCurationStation: React.FC = () => {
  const { evmAddress } = useWallet();
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([]);
  const [curationSessions, setCurationSessions] = useState<CurationSession[]>([]);
  const [curators, setCurators] = useState<CuratorProfile[]>([]);
  const [networkStats, setNetworkStats] = useState<FuegoNetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load approved playlists
        const allPlaylists = await playlistStorage.getAllPlaylists();
        const approvedPlaylists = allPlaylists.filter(p => p.status === 'approved');
        setPlaylists(approvedPlaylists);

        // Load mock curators
        const mockCurators: CuratorProfile[] = [
          {
            id: 'curator_1',
            address: '0x1234...5678',
            name: 'Crypto DJ Max',
            reputation: 95,
            totalSessions: 47,
            totalPARAEarned: 1250,
            specialties: ['Electronic', 'Ambient', 'Techno']
          },
          {
            id: 'curator_2',
            address: '0x8765...4321',
            name: 'DeFi Diva',
            reputation: 88,
            totalSessions: 32,
            totalPARAEarned: 890,
            specialties: ['Jazz', 'Blues', 'Soul']
          }
        ];
        setCurators(mockCurators);

        // Load network stats
        const stats = fuegoDiscovery.getNetworkStats();
        setNetworkStats(stats);

      } catch (error) {
        console.error('Error loading curation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading advanced curation station...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Advanced Curation Station</h1>
        <p className="text-gray-300">
          Manage Paradio curation stations with advanced scheduling and revenue distribution
        </p>
      </div>

      {/* Network Status */}
      {networkStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Network Health</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                networkStats.networkHealth === 'excellent' ? 'bg-green-400' :
                networkStats.networkHealth === 'good' ? 'bg-blue-400' :
                networkStats.networkHealth === 'fair' ? 'bg-yellow-400' :
                'bg-red-400'
              }`}></div>
              <span className="text-white capitalize">{networkStats.networkHealth}</span>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Active Peers</h3>
            <p className="text-3xl font-bold text-blue-400">{networkStats.activePeers}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Avg Latency</h3>
            <p className="text-3xl font-bold text-green-400">{networkStats.averageLatency}ms</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Total Peers</h3>
            <p className="text-3xl font-bold text-purple-400">{networkStats.totalPeers}</p>
          </div>
        </div>
      )}

      {/* Curator Profiles */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Available Curators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curators.map(curator => (
            <div key={curator.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-medium">{curator.name}</h3>
                  <p className="text-gray-400 text-sm">{curator.address}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{curator.reputation}</div>
                  <div className="text-xs text-gray-400">Reputation</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  <span className="text-gray-400">Sessions:</span> {curator.totalSessions}
                </div>
                <div>
                  <span className="text-gray-400">PARA Earned:</span> {curator.totalPARAEarned}
                </div>
                <div>
                  <span className="text-gray-400">Specialties:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {curator.specialties.map(specialty => (
                      <span key={specialty} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedCurationStation;
