import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { playlistStorage, DIGMPlaylist } from '../utils/playlistStorage';

interface RevenueTransaction {
  id: string;
  type: 'curation' | 'listening' | 'playlist' | 'curator_reward';
  amount: number;
  from: string;
  to: string;
  playlistId?: string;
  sessionId?: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
}

interface RevenueStats {
  totalEarned: number;
  totalSpent: number;
  netBalance: number;
  curationEarnings: number;
  listeningEarnings: number;
  playlistEarnings: number;
  curatorRewards: number;
  pendingTransactions: number;
  completedTransactions: number;
}

interface RevenueDistribution {
  listenerShare: number;
  creatorShare: number;
  curatorShare: number;
  platformShare: number;
}

const RevenueManagement: React.FC = () => {
  const { evmAddress } = useWallet();
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    totalEarned: 0,
    totalSpent: 0,
    netBalance: 0,
    curationEarnings: 0,
    listeningEarnings: 0,
    playlistEarnings: 0,
    curatorRewards: 0,
    pendingTransactions: 0,
    completedTransactions: 0
  });
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRevenueData = async () => {
      try {
        // Load playlists
        const allPlaylists = await playlistStorage.getAllPlaylists();
        setPlaylists(allPlaylists);

        // Load mock revenue data
        loadMockRevenueData();
        loadMockTransactions();

      } catch (error) {
        console.error('Error loading revenue data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRevenueData();
  }, []);

  const loadMockRevenueData = () => {
    const mockStats: RevenueStats = {
      totalEarned: Math.floor(Math.random() * 50000) + 10000,
      totalSpent: Math.floor(Math.random() * 20000) + 5000,
      netBalance: Math.floor(Math.random() * 30000) + 5000,
      curationEarnings: Math.floor(Math.random() * 15000) + 3000,
      listeningEarnings: Math.floor(Math.random() * 20000) + 5000,
      playlistEarnings: Math.floor(Math.random() * 10000) + 2000,
      curatorRewards: Math.floor(Math.random() * 5000) + 1000,
      pendingTransactions: Math.floor(Math.random() * 10) + 2,
      completedTransactions: Math.floor(Math.random() * 100) + 50
    };

    setRevenueStats(mockStats);
  };

  const loadMockTransactions = () => {
    const mockTransactions: RevenueTransaction[] = [
      {
        id: 'tx_1',
        type: 'curation',
        amount: 150,
        from: '0x1234...5678',
        to: evmAddress || '0x0000...0000',
        playlistId: 'playlist_1',
        sessionId: 'session_1',
        timestamp: Date.now() - 3600000,
        status: 'completed',
        description: 'Curation session earnings'
      },
      {
        id: 'tx_2',
        type: 'listening',
        amount: 25,
        from: '0x8765...4321',
        to: evmAddress || '0x0000...0000',
        playlistId: 'playlist_2',
        timestamp: Date.now() - 7200000,
        status: 'completed',
        description: 'Listening session earnings'
      },
      {
        id: 'tx_3',
        type: 'playlist',
        amount: 75,
        from: '0x1111...2222',
        to: evmAddress || '0x0000...0000',
        playlistId: 'playlist_3',
        timestamp: Date.now() - 10800000,
        status: 'pending',
        description: 'Playlist creation reward'
      }
    ];

    setTransactions(mockTransactions);
  };

  const getTransactionTypeColor = (type: RevenueTransaction['type']) => {
    switch (type) {
      case 'curation': return 'text-purple-400';
      case 'listening': return 'text-green-400';
      case 'playlist': return 'text-blue-400';
      case 'curator_reward': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTransactionStatusColor = (status: RevenueTransaction['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()} PARA`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTransactionIcon = (type: RevenueTransaction['type']) => {
    switch (type) {
      case 'curation': return '🎛️';
      case 'listening': return '🎧';
      case 'playlist': return '📝';
      case 'curator_reward': return '🏆';
      default: return '💰';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading revenue management...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Revenue Management</h1>
        <p className="text-gray-300">
          Track and manage PARA token earnings and distributions
        </p>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Total Earned</h3>
          <p className="text-3xl font-bold text-green-400">
            {formatAmount(revenueStats.totalEarned)}
          </p>
          <p className="text-gray-400 text-sm">All time earnings</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Net Balance</h3>
          <p className="text-3xl font-bold text-blue-400">
            {formatAmount(revenueStats.netBalance)}
          </p>
          <p className="text-gray-400 text-sm">Current balance</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {revenueStats.pendingTransactions}
          </p>
          <p className="text-gray-400 text-sm">Pending transactions</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Completed</h3>
          <p className="text-3xl font-bold text-purple-400">
            {revenueStats.completedTransactions}
          </p>
          <p className="text-gray-400 text-sm">Completed transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Revenue Breakdown</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎛️</span>
                <span className="text-gray-300">Curation Earnings</span>
              </div>
              <span className="text-purple-400 font-semibold">
                {formatAmount(revenueStats.curationEarnings)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎧</span>
                <span className="text-gray-300">Listening Earnings</span>
              </div>
              <span className="text-green-400 font-semibold">
                {formatAmount(revenueStats.listeningEarnings)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <span className="text-gray-300">Playlist Earnings</span>
              </div>
              <span className="text-blue-400 font-semibold">
                {formatAmount(revenueStats.playlistEarnings)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <span className="text-gray-300">Curator Rewards</span>
              </div>
              <span className="text-yellow-400 font-semibold">
                {formatAmount(revenueStats.curatorRewards)}
              </span>
            </div>
            
            <div className="pt-4 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">Total Spent</span>
                <span className="text-red-400 font-semibold">
                  {formatAmount(revenueStats.totalSpent)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Distribution */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Revenue Distribution</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Listener Share</span>
                <span className="text-green-400">80%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Creator Share</span>
                <span className="text-blue-400">15%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Curator Share</span>
                <span className="text-purple-400">5%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-600">
              <p className="text-gray-400 text-sm">
                During curation station hours, listeners forfeit 20% of PARA earned to playlist creators and curators.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Transaction History</h2>
          
          <div className="flex gap-2">
            {(['24h', '7d', '30d', 'all'] as const).map(timeframe => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No transactions found</p>
          ) : (
            transactions.map(transaction => (
              <div key={transaction.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                    <div>
                      <h3 className="text-white font-medium">{transaction.description}</h3>
                      <p className="text-gray-400 text-sm">
                        {transaction.from} → {transaction.to}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getTransactionTypeColor(transaction.type)}`}>
                      +{formatAmount(transaction.amount)}
                    </p>
                    <p className={`text-sm ${getTransactionStatusColor(transaction.status)}`}>
                      {transaction.status.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>{formatTimestamp(transaction.timestamp)}</span>
                  {transaction.playlistId && (
                    <span>Playlist: {transaction.playlistId}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Revenue Actions */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Revenue Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Withdraw Funds</h3>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Amount in PARA"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                Withdraw PARA
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Transfer Funds</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Recipient Address"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Amount in PARA"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Transfer PARA
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Export Data</h3>
            <div className="space-y-2">
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
                Export Transactions
              </button>
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueManagement;
