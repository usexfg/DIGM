import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';

const XfgWallet: React.FC = () => {
  const { evmAddress, evmProvider } = useWallet();
  const [xfgBalance, setXfgBalance] = useState('0');
  const [cpuPower, setCpuPower] = useState('1');
  const [totalEarned, setTotalEarned] = useState('0');
  const [isActive, setIsActive] = useState(false);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [contributionAmount, setContributionAmount] = useState('1');
  const [cpuCores, setCpuCores] = useState(4); // Default fallback
  const [miningMode, setMiningMode] = useState<'freemium' | 'para'>('freemium');
  const [isPremium, setIsPremium] = useState(false);
  const [freemiumActive, setFreemiumActive] = useState(false);
  const [paraMiningActive, setParaMiningActive] = useState(false);

  useEffect(() => {
    if (evmAddress) {
      fetchXfgBalance();
      fetchFreemiumStats();
      fetchActivityHistory();
      checkPremiumStatus();
    }
  }, [evmAddress]);

  // Detect CPU cores
  useEffect(() => {
    if (navigator.hardwareConcurrency) {
      setCpuCores(navigator.hardwareConcurrency);
    }
  }, []);

  // Update CPU power based on CPU cores allocation
  useEffect(() => {
    const allocatedCores = parseInt(contributionAmount) || 1;
    setCpuPower(allocatedCores.toString());
  }, [contributionAmount]);

  const checkPremiumStatus = () => {
    // Check if user has premium access
    const premium = localStorage.getItem('digm-premium') === 'true';
    setIsPremium(premium);
  };

  const fetchXfgBalance = async () => {
    if (!evmProvider || !evmAddress) return;
    
    try {
      // This would be the XFG token contract address
      const xfgAddress = '0x...'; // Replace with actual XFG contract address
      const balance = await evmProvider.getBalance(evmAddress);
      setXfgBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch XFG balance:', error);
    }
  };

  const fetchFreemiumStats = async () => {
    if (!evmAddress) return;
    
    try {
      // Mock data since backend is not running
      const mockStats = {
        totalEarned: (Math.random() * 100 + 50).toFixed(2)
      };
      setTotalEarned(mockStats.totalEarned);
    } catch (error) {
      console.error('Failed to fetch freemium stats:', error);
    }
  };

  const fetchActivityHistory = async () => {
    if (!evmAddress) return;
    
    try {
      // Mock data since backend is not running
      const mockHistory = [
        {
          action: 'Freemium Mining Started',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          amount: '0',
          cpuPower: '8.2',
          mode: 'freemium'
        },
        {
          action: 'PARA Mining Started',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          amount: '25.0',
          cpuPower: '7.8',
          mode: 'para'
        },
        {
          action: 'CPU Contribution Started',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          amount: '15.3',
          cpuPower: '9.1',
          mode: 'para'
        }
      ];
      setActivityHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch activity history:', error);
    }
  };

  const activateFreemiumMining = async () => {
    if (!evmAddress || !contributionAmount) {
      alert('Please allocate CPU cores to activate freemium mining');
      return;
    }

    setIsActive(true);
    try {
      // Mock activation since backend is not running
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      setFreemiumActive(true);
      alert(`Freemium mining activated! You now have access to premium features while mining.`);
      
      // Refresh data
      await fetchFreemiumStats();
      await fetchActivityHistory();
      setContributionAmount('');
    } catch (error) {
      console.error('Freemium mining activation failed:', error);
      alert('Failed to activate freemium mining');
    } finally {
      setIsActive(false);
    }
  };

  const activateParaMining = async () => {
    if (!evmAddress || !contributionAmount) {
      alert('Please allocate CPU cores to activate PARA mining');
      return;
    }

    if (!isPremium) {
      alert('You need premium access to mine PARA tokens. Please upgrade to premium first.');
      return;
    }

    setIsActive(true);
    try {
      // Mock activation since backend is not running
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      setParaMiningActive(true);
      alert(`PARA mining activated! You can now earn extra PARA tokens while contributing CPU power.`);
      
      // Refresh data
      await fetchFreemiumStats();
      await fetchActivityHistory();
      setContributionAmount('');
    } catch (error) {
      console.error('PARA mining activation failed:', error);
      alert('Failed to activate PARA mining');
    } finally {
      setIsActive(false);
    }
  };

  const claimRewards = async () => {
    if (!evmAddress) return;

    if (!isPremium) {
      alert('You need premium access to claim PARA rewards from mining.');
      return;
    }

    try {
      // Mock claim since backend is not running
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      
      const mockAmount = (Math.random() * 50 + 25).toFixed(2);
      alert(`Claimed ${mockAmount} PARA tokens!`);
      
      // Refresh data
      await fetchXfgBalance();
      await fetchFreemiumStats();
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Failed to claim rewards');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Freemium Access & Mining</h2>
        
        {/* Status and Stats Display */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Premium Status</h3>
            <p className={`text-2xl font-bold ${isPremium ? 'text-green-400' : 'text-red-400'}`}>
              {isPremium ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Required for PARA mining</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Freemium Mining</h3>
            <p className={`text-2xl font-bold ${freemiumActive ? 'text-green-400' : 'text-gray-400'}`}>
              {freemiumActive ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Premium features while mining</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">PARA Mining</h3>
            <p className={`text-2xl font-bold ${paraMiningActive ? 'text-green-400' : 'text-gray-400'}`}>
              {paraMiningActive ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Extra PARA rewards</p>
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
              <h3 className="text-sm font-medium text-slate-300">Total Mined</h3>
            </div>
            <p className="text-2xl font-bold text-white">{totalEarned} PARA</p>
            <p className="text-xs text-slate-400 mt-1">PARA tokens earned from mining</p>
          </div>
        </div>

        {/* Mining Mode Selection */}
        <div className="glass p-6 rounded-xl mb-6 border border-fuchsia-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Choose Mining Mode</h3>
          
          {/* Freemium Mining Option */}
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-green-500/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-semibold text-lg mb-2">🆓 Freemium Mining</h4>
                <p className="text-gray-400 text-sm mb-3">
                  Contribute CPU power to unlock premium features while mining. No PARA rewards, but you get ad-free access and premium features during mining sessions.
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• ✅ Available to all users</p>
                  <p>• ✅ Premium features while mining</p>
                  <p>• ✅ Ad-free experience during mining</p>
                  <p>• ❌ No PARA token rewards</p>
                </div>
              </div>
              <button
                onClick={() => setMiningMode('freemium')}
                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all ${
                  miningMode === 'freemium'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                Select
              </button>
            </div>
          </div>

          {/* PARA Mining Option */}
          <div className="p-4 bg-slate-800 rounded-lg border border-purple-500/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-semibold text-lg mb-2">💰 PARA Mining</h4>
                <p className="text-gray-400 text-sm mb-3">
                  Earn extra PARA tokens by contributing CPU power. Requires premium access and provides additional PARA rewards on top of normal earnings.
                </p>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• {isPremium ? '✅' : '❌'} Requires premium access</p>
                  <p>• ✅ Extra PARA token rewards</p>
                  <p>• ✅ All premium features included</p>
                  <p>• ✅ Higher earning potential</p>
                </div>
                {!isPremium && (
                  <p className="text-red-400 text-sm mt-2">
                    ⚠️ Upgrade to premium to access PARA mining
                  </p>
                )}
              </div>
              <button
                onClick={() => setMiningMode('para')}
                disabled={!isPremium}
                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all ${
                  !isPremium
                    ? 'bg-slate-600 text-gray-500 cursor-not-allowed'
                    : miningMode === 'para'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {!isPremium ? 'Locked' : 'Select'}
              </button>
            </div>
          </div>
        </div>

        {/* CPU Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CPU Cores Allocation ({cpuCores} cores available)
            </label>
            <div className="flex items-center justify-center space-x-4 bg-slate-800 rounded-lg p-4">
              <button
                onClick={() => {
                  const current = parseInt(contributionAmount) || 1;
                  if (current > 1) {
                    setContributionAmount((current - 1).toString());
                  }
                }}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 hover:scale-110"
                disabled={parseInt(contributionAmount) <= 1}
              >
                -
              </button>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">{contributionAmount}</div>
                <div className="text-sm text-slate-400">cores</div>
              </div>
              <button
                onClick={() => {
                  const current = parseInt(contributionAmount) || 1;
                  if (current < cpuCores) {
                    setContributionAmount((current + 1).toString());
                  }
                }}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 hover:scale-110"
                disabled={parseInt(contributionAmount) >= cpuCores}
              >
                +
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              More CPU cores = {miningMode === 'freemium' ? 'Faster freemium activation' : 'Higher PARA earnings'}
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={miningMode === 'freemium' ? activateFreemiumMining : activateParaMining}
              disabled={isActive || !evmAddress || !contributionAmount || (miningMode === 'para' && !isPremium)}
              className={`flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                miningMode === 'freemium' ? 'btn-success' : 'btn-primary'
              }`}
            >
              {isActive ? 'Activating...' : `Activate ${miningMode === 'freemium' ? 'Freemium' : 'PARA'} Mining`}
            </button>
            <button
              onClick={claimRewards}
              disabled={!evmAddress || !isPremium || !paraMiningActive}
              className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Claim PARA Tokens
            </button>
          </div>
        </div>
      </div>

      {/* Activity History */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Activity History</h3>
        <div className="space-y-2">
          {activityHistory.length === 0 ? (
            <p className="text-slate-400 text-sm">No activity yet</p>
          ) : (
            activityHistory.map((entry, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">{entry.action}</p>
                  <p className="text-slate-400 text-sm">{new Date(entry.timestamp).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    entry.mode === 'freemium' ? 'bg-green-600/20 text-green-400' : 'bg-purple-600/20 text-purple-400'
                  }`}>
                    {entry.mode === 'freemium' ? 'Freemium' : 'PARA'} Mining
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{entry.amount} PARA</p>
                  <p className="text-slate-400 text-sm">{entry.cpuPower}x CPU power</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Freemium Benefits */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Mining Benefits</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>Freemium Mining:</strong> Access premium features while contributing CPU power</p>
          <p>• <strong>PARA Mining:</strong> Earn extra PARA tokens (requires premium access)</p>
          <p>• <strong>Ad-Free Experience:</strong> Enjoy DIGM without any advertisements during mining</p>
          <p>• <strong>Unlimited Streaming:</strong> Stream any track without restrictions</p>
          <p>• <strong>Premium Audio Quality:</strong> Access to high-fidelity audio streams</p>
          <p>• <strong>Exclusive Content:</strong> Access to exclusive artist content and early releases</p>
        </div>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => window.open('/premium', '_blank')}
            className="btn-primary w-full"
          >
            Upgrade to Premium
          </button>
          <button
            onClick={() => window.open('https://github.com/usexfg/fuego-node', '_blank')}
            className="btn-secondary w-full"
          >
            Learn About Fuego L1
          </button>
        </div>
      </div>
    </div>
  );
};

export default XfgWallet; 