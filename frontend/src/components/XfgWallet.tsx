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

  useEffect(() => {
    if (evmAddress) {
      fetchXfgBalance();
      fetchFreemiumStats();
      fetchActivityHistory();
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
          action: 'Freemium Activated',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          amount: '12.5',
          cpuPower: '8.2'
        },
        {
          action: 'HEAT Tokens Claimed',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          amount: '25.0',
          cpuPower: '7.8'
        },
        {
          action: 'CPU Contribution Started',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          amount: '15.3',
          cpuPower: '9.1'
        }
      ];
      setActivityHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch activity history:', error);
    }
  };

  const activateFreemium = async () => {
    if (!evmAddress || !contributionAmount) {
      alert('Please allocate CPU cores to activate freemium');
      return;
    }

    setIsActive(true);
    try {
      // Mock activation since backend is not running
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      const mockCpuPower = (Math.random() * 5 + 5).toFixed(2);
      alert(`Freemium activated! CPU power: ${mockCpuPower}x multiplier`);
      
      // Refresh data
      await fetchFreemiumStats();
      await fetchActivityHistory();
      setContributionAmount('');
    } catch (error) {
      console.error('Freemium activation failed:', error);
      alert('Failed to activate freemium');
    } finally {
      setIsActive(false);
    }
  };

  const claimRewards = async () => {
    if (!evmAddress) return;

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
        <h2 className="text-xl font-bold mb-4">Freemium Access</h2>
        
        {/* Status and Stats Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Freemium Status</h3>
            <p className="text-2xl font-bold text-green-400">Inactive</p>
            <p className="text-xs text-slate-400 mt-1">No ads, just premium features</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">CPU Power</h3>
            <p className="text-2xl font-bold gradient-text-green">{cpuPower}x</p>
            <p className="text-xs text-slate-400 mt-1">CPU cores allocated</p>
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
            <p className="text-xs text-slate-400 mt-1">PARA tokens earned from CPU contribution</p>
          </div>
        </div>

        {/* How to Get Freemium Section */}
        <div className="glass p-6 rounded-xl mb-6 border border-fuchsia-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">How to Get Freemium Access</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
              <div>
                <h4 className="text-white font-medium">Allocate CPU Cores</h4>
                <p className="text-gray-400 text-sm">Choose how many CPU cores to contribute to the Fuego L1 network</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
              <div>
                <h4 className="text-white font-medium">Activate Freemium</h4>
                <p className="text-gray-400 text-sm">Start contributing CPU power to unlock ad-free premium features</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
              <div>
                <h4 className="text-white font-medium">Earn PARA Tokens</h4>
                <p className="text-gray-400 text-sm">Receive PARA tokens as rewards for your computational contribution</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
              <div>
                <h4 className="text-white font-medium">Enjoy Premium Features</h4>
                <p className="text-gray-400 text-sm">Access unlimited streaming, exclusive content, and premium audio quality</p>
              </div>
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
              More CPU cores = Higher HEAT token earnings and faster freemium activation
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={activateFreemium}
              disabled={isActive || !evmAddress || !contributionAmount}
              className="btn-success flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActive ? 'Activating...' : 'Activate Freemium'}
            </button>
            <button
              onClick={claimRewards}
              disabled={!evmAddress || parseFloat(cpuPower) === 0}
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
        <h3 className="text-lg font-semibold mb-3">Freemium Benefits</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>Ad-Free Experience:</strong> Enjoy DIGM without any advertisements</p>
          <p>• <strong>Unlimited Streaming:</strong> Stream any track without restrictions</p>
          <p>• <strong>Premium Audio Quality:</strong> Access to high-fidelity audio streams</p>
          <p>• <strong>PARA Token Rewards:</strong> Earn PARA tokens while contributing CPU power</p>
          <p>• <strong>Exclusive Content:</strong> Access to exclusive artist content and early releases</p>
          <p>• <strong>Priority Support:</strong> Priority customer support and faster response times</p>
        </div>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => window.open('/freemium-dashboard', '_blank')}
            className="btn-secondary w-full"
          >
            View Freemium Dashboard
          </button>
          <button
            onClick={() => window.open('https://github.com/usexfg/fuego-node', '_blank')}
            className="btn-primary w-full"
          >
            Learn About Fuego L1
          </button>
        </div>
      </div>
    </div>
  );
};

export default XfgWallet; 