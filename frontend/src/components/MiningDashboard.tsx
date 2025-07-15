import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

const MiningDashboard: React.FC = () => {
  const { evmAddress } = useWallet();
  const [miningStats, setMiningStats] = useState({
    totalContributions: '0',
    currentMiningRate: '0',
    lifetimeEarnings: '0',
    rank: 'Unranked',
    nextReward: '0',
    timeToNextReward: '0'
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [miningPools, setMiningPools] = useState<any[]>([]);

  useEffect(() => {
    if (evmAddress) {
      fetchMiningStats();
      fetchLeaderboard();
      fetchMiningPools();
    }
  }, [evmAddress]);

  const fetchMiningStats = async () => {
    if (!evmAddress) return;
    
    try {
      const response = await fetch(`/api/mining/dashboard/${evmAddress}`);
      const data = await response.json();
      setMiningStats(data);
    } catch (error) {
      console.error('Failed to fetch mining stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/mining/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const fetchMiningPools = async () => {
    try {
      const response = await fetch('/api/mining/pools');
      const data = await response.json();
      setMiningPools(data.pools || []);
    } catch (error) {
      console.error('Failed to fetch mining pools:', error);
    }
  };

  const joinPool = async (poolId: string) => {
    if (!evmAddress) return;

    try {
      const response = await fetch('/api/mining/join-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: evmAddress,
          poolId: poolId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to join pool');
      }

      alert('Successfully joined mining pool!');
      await fetchMiningStats();
    } catch (error) {
      console.error('Failed to join pool:', error);
      alert('Failed to join mining pool');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mining Stats Overview */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Mining Dashboard</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Total Contributions</h3>
            <p className="text-xl font-bold text-white">{miningStats.totalContributions} PARA</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Current Rate</h3>
            <p className="text-xl font-bold text-white">{miningStats.currentMiningRate} XFG/hr</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Lifetime Earnings</h3>
            <p className="text-xl font-bold text-white">{miningStats.lifetimeEarnings} XFG</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Rank</h3>
            <p className="text-xl font-bold text-white">{miningStats.rank}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Next Reward</h3>
            <p className="text-lg font-bold text-white">{miningStats.nextReward} XFG</p>
            <p className="text-xs text-slate-400">in {miningStats.timeToNextReward}</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Mining Efficiency</h3>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(100, (parseFloat(miningStats.currentMiningRate) / 10) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Based on current mining rate</p>
          </div>
        </div>
      </div>

      {/* Mining Pools */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Privacy Mining Pools (LoudMining Integration)</h3>
        <div className="space-y-3">
          {miningPools.length === 0 ? (
            <p className="text-slate-400 text-sm">No mining pools available</p>
          ) : (
            miningPools.map((pool, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-slate-700 rounded-lg">
                <div>
                  <h4 className="text-white font-medium">{pool.name}</h4>
                  <p className="text-slate-400 text-sm">{pool.description}</p>
                  <p className="text-xs text-slate-400">Members: {pool.memberCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{pool.totalMiningPower} XFG/hr</p>
                  <p className="text-slate-400 text-sm">Pool Rate</p>
                  <button
                    onClick={() => joinPool(pool.id)}
                    className="btn-primary text-sm mt-2"
                  >
                    Join Pool
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Fuego Privacy Mining Leaderboard</h3>
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <p className="text-slate-400 text-sm">No leaderboard data available</p>
          ) : (
            leaderboard.map((entry, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`text-lg font-bold ${
                    index === 0 ? 'text-yellow-400' : 
                    index === 1 ? 'text-gray-300' : 
                    index === 2 ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-white font-medium">{entry.address}</p>
                    <p className="text-slate-400 text-sm">Rank: {entry.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{entry.miningPower} XFG/hr</p>
                  <p className="text-slate-400 text-sm">{entry.totalMined} XFG</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mining Tips */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Fuego Privacy Mining Tips & Strategies</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>Privacy-First:</strong> All mining operations are anonymous and untraceable</p>
          <p>• <strong>Early Bird Bonus:</strong> Early contributors get 2x mining power for the first 30 days</p>
          <p>• <strong>LoudMining Integration:</strong> Enhanced mining efficiency through LoudMining.com proxy</p>
          <p>• <strong>CryptoNote Privacy:</strong> Mining rewards distributed using CryptoNote ring signature privacy</p>
          <p>• <strong>Pool Mining:</strong> Join privacy-focused mining pools for increased efficiency</p>
          <p>• <strong>Compound Rewards:</strong> Reinvest your XFG earnings to increase mining power</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => window.open('https://github.com/usexfg/fuego-node', '_blank')}
            className="btn-primary w-full"
          >
            Learn More About Fuego L1
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiningDashboard; 