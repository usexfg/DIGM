import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';

const XfgWallet: React.FC = () => {
  const { evmAddress, evmProvider } = useWallet();
  const [xfgBalance, setXfgBalance] = useState('0');
  const [miningPower, setMiningPower] = useState('0');
  const [totalMined, setTotalMined] = useState('0');
  const [isMining, setIsMining] = useState(false);
  const [miningHistory, setMiningHistory] = useState<any[]>([]);
  const [contributionAmount, setContributionAmount] = useState('');

  useEffect(() => {
    if (evmAddress) {
      fetchXfgBalance();
      fetchMiningStats();
      fetchMiningHistory();
    }
  }, [evmAddress]);

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

  const fetchMiningStats = async () => {
    if (!evmAddress) return;
    
    try {
      // This would call the mining service
      const response = await fetch(`/api/mining/stats/${evmAddress}`);
      const data = await response.json();
      setMiningPower(data.miningPower || '0');
      setTotalMined(data.totalMined || '0');
    } catch (error) {
      console.error('Failed to fetch mining stats:', error);
    }
  };

  const fetchMiningHistory = async () => {
    if (!evmAddress) return;
    
    try {
      const response = await fetch(`/api/mining/history/${evmAddress}`);
      const data = await response.json();
      setMiningHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch mining history:', error);
    }
  };

  const startMining = async () => {
    if (!evmAddress || !contributionAmount) {
      alert('Please enter a contribution amount');
      return;
    }

    setIsMining(true);
    try {
      const response = await fetch('/api/mining/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: evmAddress,
          contribution: contributionAmount
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start mining');
      }

      const result = await response.json();
      alert(`Mining started! Mining power: ${result.miningPower} XFG/hour`);
      
      // Refresh data
      await fetchMiningStats();
      await fetchMiningHistory();
      setContributionAmount('');
    } catch (error) {
      console.error('Mining failed:', error);
      alert('Failed to start mining');
    } finally {
      setIsMining(false);
    }
  };

  const claimRewards = async () => {
    if (!evmAddress) return;

    try {
      const response = await fetch('/api/mining/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: evmAddress
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to claim rewards');
      }

      const result = await response.json();
      alert(`Claimed ${result.amount} XFG!`);
      
      // Refresh data
      await fetchXfgBalance();
      await fetchMiningStats();
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Failed to claim rewards');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Fuego XFG Wallet & Privacy Mining</h2>
        
        {/* Balance and Stats Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">XFG Balance</h3>
            <p className="text-2xl font-bold text-white">{xfgBalance} XFG</p>
            {evmAddress && (
              <p className="text-xs text-slate-400 mt-1">{evmAddress}</p>
            )}
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Mining Power</h3>
            <p className="text-2xl font-bold text-white">{miningPower} XFG/hr</p>
            <p className="text-xs text-slate-400 mt-1">Current mining rate</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Total Mined</h3>
            <p className="text-2xl font-bold text-white">{totalMined} XFG</p>
            <p className="text-xs text-slate-400 mt-1">Lifetime earnings</p>
          </div>
        </div>

        {/* Mining Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contribution Amount (PARA)
            </label>
            <input
              type="number"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              placeholder="0.0"
              className="input-field w-full"
              step="0.000001"
            />
            <p className="text-xs text-slate-400 mt-1">
              Higher contributions = higher mining power
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={startMining}
              disabled={isMining || !evmAddress || !contributionAmount}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMining ? 'Starting...' : 'Start Mining'}
            </button>
            <button
              onClick={claimRewards}
              disabled={!evmAddress || parseFloat(miningPower) === 0}
              className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Claim Rewards
            </button>
          </div>
        </div>
      </div>

      {/* Mining History */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Mining History</h3>
        <div className="space-y-2">
          {miningHistory.length === 0 ? (
            <p className="text-slate-400 text-sm">No mining activity yet</p>
          ) : (
            miningHistory.map((entry, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">{entry.action}</p>
                  <p className="text-slate-400 text-sm">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{entry.amount} XFG</p>
                  <p className="text-slate-400 text-sm">{entry.miningPower} XFG/hr</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mining Info */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Fuego L1 Privacy Blockchain & LoudMining Integration</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>Fuego L1:</strong> XFG is the native token of the Fuego L1 Privacy Blockchain Network</p>
          <p>• <strong>Privacy-First Mining:</strong> Mining operations use zero-knowledge proofs for complete privacy</p>
          <p>• <strong>LoudMining Proxy:</strong> Integrated with LoudMining.com for enhanced mining efficiency</p>
          <p>• <strong>Contribution-Based:</strong> Mine XFG by contributing PARA tokens to the DIGM platform</p>
          <p>• <strong>Privacy Preserved:</strong> All mining activities are anonymous and untraceable</p>
          <p>• <strong>Early Adopter Bonus:</strong> Early contributors get 2x mining power for the first 30 days</p>
        </div>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => window.open('/mining-dashboard', '_blank')}
            className="btn-secondary w-full"
          >
            View Advanced Mining Dashboard
          </button>
          <button
            onClick={() => window.open('https://github.com/usexfg/fuego-node', '_blank')}
            className="btn-primary w-full"
          >
            View Fuego Node Repository
          </button>
        </div>
      </div>
    </div>
  );
};

export default XfgWallet; 