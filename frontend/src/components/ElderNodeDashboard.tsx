import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';

interface ElderNodeStats {
  totalUptime: number; // Total uptime in seconds
  currentSession: number; // Current session uptime in seconds
  totalPARAEarned: number; // Total PARA earned
  currentEarningRate: number; // PARA per minute
  uptimeMultiplier: number; // Multiplier based on uptime
  streamingSessions: number; // Number of streaming sessions processed
  totalStreamingTime: number; // Total streaming time processed in seconds
  nodeStatus: 'active' | 'inactive' | 'maintenance';
  lastActive: number; // Timestamp of last activity
  consecutiveDays: number; // Consecutive days of uptime
}

const ElderNodeDashboard: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const [stats, setStats] = useState<ElderNodeStats>({
    totalUptime: 0,
    currentSession: 0,
    totalPARAEarned: 0,
    currentEarningRate: 0,
    uptimeMultiplier: 1.0,
    streamingSessions: 0,
    totalStreamingTime: 0,
    nodeStatus: 'inactive',
    lastActive: Date.now(),
    consecutiveDays: 0
  });

  const [isActive, setIsActive] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [claimablePARA, setClaimablePARA] = useState(0);
  
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const earningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsKey = 'elder-node-stats';

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (isActive) {
      startEarningSession();
    } else {
      stopEarningSession();
    }
  }, [isActive]);

  const loadStats = () => {
    try {
      const savedStats = localStorage.getItem(statsKey);
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setStats(parsedStats);
      }
    } catch (error) {
      console.error('Failed to load Elder Node stats:', error);
    }
  };

  const saveStats = (updatedStats: ElderNodeStats) => {
    try {
      localStorage.setItem(statsKey, JSON.stringify(updatedStats));
    } catch (error) {
      console.error('Failed to save Elder Node stats:', error);
    }
  };

  const calculateUptimeMultiplier = (totalUptimeHours: number, consecutiveDays: number): number => {
    // Base multiplier starts at 1.0
    let multiplier = 1.0;
    
    // Uptime-based bonuses
    if (totalUptimeHours >= 24) multiplier += 0.1; // 24+ hours: +10%
    if (totalUptimeHours >= 168) multiplier += 0.2; // 1+ week: +20%
    if (totalUptimeHours >= 720) multiplier += 0.3; // 1+ month: +30%
    if (totalUptimeHours >= 2160) multiplier += 0.4; // 3+ months: +40%
    if (totalUptimeHours >= 4320) multiplier += 0.5; // 6+ months: +50%
    
    // Consecutive days bonus
    if (consecutiveDays >= 7) multiplier += 0.1; // 1+ week consecutive: +10%
    if (consecutiveDays >= 30) multiplier += 0.2; // 1+ month consecutive: +20%
    if (consecutiveDays >= 90) multiplier += 0.3; // 3+ months consecutive: +30%
    if (consecutiveDays >= 180) multiplier += 0.4; // 6+ months consecutive: +40%
    if (consecutiveDays >= 365) multiplier += 0.5; // 1+ year consecutive: +50%
    
    return Math.min(multiplier, 3.0); // Cap at 3x multiplier
  };

  const startEarningSession = () => {
    setStats(prev => ({
      ...prev,
      nodeStatus: 'active',
      lastActive: Date.now()
    }));

    // Update session timer every second
    sessionIntervalRef.current = setInterval(() => {
      setStats(prev => {
        const newStats = {
          ...prev,
          currentSession: prev.currentSession + 1,
          totalUptime: prev.totalUptime + 1
        };
        
        // Update multiplier based on new uptime
        newStats.uptimeMultiplier = calculateUptimeMultiplier(
          newStats.totalUptime / 3600, // Convert to hours
          newStats.consecutiveDays
        );
        
        saveStats(newStats);
        return newStats;
      });
    }, 1000);

    // Process streaming rewards every minute
    earningIntervalRef.current = setInterval(() => {
      processStreamingRewards();
    }, 60000); // Every minute
  };

  const stopEarningSession = () => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
    if (earningIntervalRef.current) {
      clearInterval(earningIntervalRef.current);
      earningIntervalRef.current = null;
    }

    setStats(prev => ({
      ...prev,
      nodeStatus: 'inactive'
    }));
  };

  const processStreamingRewards = () => {
    // Simulate processing streaming audio
    // In real implementation, this would process actual streaming data
    const streamingMinutesProcessed = Math.random() * 10 + 5; // 5-15 minutes of streaming
    const basePARA = streamingMinutesProcessed; // 1 PARA per minute
    const totalPARA = basePARA * stats.uptimeMultiplier;

    setStats(prev => {
      const newStats = {
        ...prev,
        totalPARAEarned: prev.totalPARAEarned + totalPARA,
        streamingSessions: prev.streamingSessions + 1,
        totalStreamingTime: prev.totalStreamingTime + (streamingMinutesProcessed * 60),
        currentEarningRate: totalPARA // PARA earned this minute
      };
      
      saveStats(newStats);
      return newStats;
    });

    console.log(`🎵 Elder Node processed ${streamingMinutesProcessed.toFixed(1)} minutes of streaming, earned ${totalPARA.toFixed(2)} PARA (${stats.uptimeMultiplier.toFixed(2)}x multiplier)`);
  };

  const toggleNode = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      setIsActive(true);
    }
  };

  const claimRewards = async () => {
    if (!stellarAddress) {
      alert('Please connect your Stellar wallet to claim rewards');
      return;
    }

    if (stats.totalPARAEarned <= 0) {
      alert('No PARA rewards to claim');
      return;
    }

    try {
      // Mock claim transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const claimedAmount = stats.totalPARAEarned;
      setClaimablePARA(claimedAmount);
      setShowRewardsModal(true);
      
      setStats(prev => ({
        ...prev,
        totalPARAEarned: 0
      }));
      
      console.log(`💰 Elder Node claimed ${claimedAmount.toFixed(2)} PARA rewards`);
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      alert('Failed to claim rewards');
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatEarningRate = (paraPerMinute: number): string => {
    if (paraPerMinute >= 60) return `${(paraPerMinute / 60).toFixed(1)} PARA/hr`;
    return `${paraPerMinute.toFixed(2)} PARA/min`;
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
          <span className="text-3xl">🏛️</span>
          <span>Elder Node Dashboard</span>
        </h2>
        
        {/* Node Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Node Status</h3>
            <p className={`text-2xl font-bold ${
              stats.nodeStatus === 'active' ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.nodeStatus === 'active' ? '🟢 Active' : '🔴 Inactive'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Processing streaming audio</p>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Uptime Multiplier</h3>
            <p className="text-2xl font-bold text-purple-400">{stats.uptimeMultiplier.toFixed(2)}x</p>
            <p className="text-xs text-slate-400 mt-1">Reward multiplier</p>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Current Rate</h3>
            <p className="text-2xl font-bold text-cyan-400">{formatEarningRate(stats.currentEarningRate)}</p>
            <p className="text-xs text-slate-400 mt-1">PARA per minute</p>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <img 
                src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                alt="PARA" 
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h3 className="text-sm font-medium text-slate-300">Total Earned</h3>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalPARAEarned.toFixed(2)} PARA</p>
            <p className="text-xs text-slate-400 mt-1">Lifetime earnings</p>
          </div>
        </div>

        {/* Uptime Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Total Uptime</h3>
            <p className="text-xl font-bold text-white">{formatUptime(stats.totalUptime)}</p>
            <p className="text-xs text-slate-400 mt-1">Lifetime uptime</p>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Current Session</h3>
            <p className="text-xl font-bold text-green-400">{formatUptime(stats.currentSession)}</p>
            <p className="text-xs text-slate-400 mt-1">Active session</p>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Consecutive Days</h3>
            <p className="text-xl font-bold text-orange-400">{stats.consecutiveDays} days</p>
            <p className="text-xs text-slate-400 mt-1">Consistent uptime</p>
          </div>
        </div>

        {/* Node Controls */}
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={toggleNode}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                isActive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isActive ? '🛑 Stop Node' : '▶️ Start Node'}
            </button>
            <button
              onClick={claimRewards}
              disabled={stats.totalPARAEarned <= 0 || !stellarAddress}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💰 Claim {stats.totalPARAEarned.toFixed(2)} PARA
            </button>
          </div>
        </div>
      </div>

      {/* Multiplier Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Uptime Multiplier Breakdown</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">Base Rate</span>
            <span className="text-white font-medium">1.0x (1 PARA/minute)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">24+ Hours Uptime</span>
            <span className="text-green-400 font-medium">+0.1x (10% bonus)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">1+ Week Uptime</span>
            <span className="text-green-400 font-medium">+0.2x (20% bonus)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">1+ Month Uptime</span>
            <span className="text-green-400 font-medium">+0.3x (30% bonus)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">3+ Months Uptime</span>
            <span className="text-green-400 font-medium">+0.4x (40% bonus)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">6+ Months Uptime</span>
            <span className="text-green-400 font-medium">+0.5x (50% bonus)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300">Consecutive Days Bonus</span>
            <span className="text-cyan-400 font-medium">+0.1x to +0.5x</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-purple-600/20 rounded-lg border border-purple-500/40">
            <span className="text-purple-300 font-medium">Current Total Multiplier</span>
            <span className="text-purple-300 font-bold">{stats.uptimeMultiplier.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Streaming Sessions Processed</p>
              <p className="text-slate-400 text-sm">{stats.streamingSessions} sessions</p>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{formatUptime(stats.totalStreamingTime)}</p>
              <p className="text-slate-400 text-sm">Total streaming time</p>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Last Active</p>
              <p className="text-slate-400 text-sm">{new Date(stats.lastActive).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">{formatEarningRate(stats.currentEarningRate)}</p>
              <p className="text-slate-400 text-sm">Current earning rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Modal */}
      {showRewardsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">🎉 Rewards Claimed!</h3>
            <p className="text-slate-300 mb-4">
              Successfully claimed <span className="text-green-400 font-bold">{claimablePARA.toFixed(2)} PARA</span> to your Stellar wallet.
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Your Elder Node continues to earn rewards while processing streaming audio. Keep it running for maximum earnings!
            </p>
            <button
              onClick={() => setShowRewardsModal(false)}
              className="btn-primary w-full"
            >
              Continue Mining
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElderNodeDashboard; 