import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';

const ParaBridge: React.FC = () => {
  const { evmAddress, stellarAddress, evmProvider } = useWallet();
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evmBalance, setEvmBalance] = useState('0');
  const [stellarBalance, setStellarBalance] = useState('0');
  const [createVoucher, setCreateVoucher] = useState(false);

  useEffect(() => {
    if (evmAddress) {
      fetchEvmBalance();
    }
    if (stellarAddress) {
      fetchStellarBalance();
    }
  }, [evmAddress, stellarAddress]);

  const fetchEvmBalance = async () => {
    if (!evmProvider || !evmAddress) return;
    
    try {
      // This would be the PARA token contract address
      const paraAddress = '0x...'; // Replace with actual PARA contract address
      const balance = await evmProvider.getBalance(evmAddress);
      setEvmBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch EVM balance:', error);
    }
  };

  const fetchStellarBalance = async () => {
    if (!stellarAddress) return;
    
    try {
      // This would call the ParaBridge service
      const response = await fetch(`/api/stellar/balance/${stellarAddress}`);
      const data = await response.json();
      setStellarBalance(data.balance || '0');
    } catch (error) {
      console.error('Failed to fetch Stellar balance:', error);
    }
  };

  const handleBridge = async () => {
    if (!evmAddress || !destinationAddress || !amount) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (createVoucher) {
        // Create voucher on Stellar
        await createStellarVoucher();
      } else {
        // Direct bridge
        await bridgeToStellar();
      }
      
      // Refresh balances
      await fetchEvmBalance();
      await fetchStellarBalance();
      
      setAmount('');
      setDestinationAddress('');
      alert('Bridge transaction successful!');
    } catch (error) {
      console.error('Bridge failed:', error);
      alert('Bridge transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const createStellarVoucher = async () => {
    // This would call the ParaBridge service to create a claimable balance
    const response = await fetch('/api/bridge/create-voucher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: evmAddress,
        toAddress: destinationAddress,
        amount: amount,
        createVoucher: true
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create voucher');
    }
  };

  const bridgeToStellar = async () => {
    // This would call the ParaBridge service for direct bridging
    const response = await fetch('/api/bridge/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAddress: evmAddress,
        toAddress: destinationAddress,
        amount: amount
      })
    });
    
    if (!response.ok) {
      throw new Error('Bridge transfer failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4">PARA Bridge</h2>
        
        {/* Balance Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">EVM Balance</h3>
            <p className="text-2xl font-bold text-white">{evmBalance} PARA</p>
            {evmAddress && (
              <p className="text-xs text-slate-400 mt-1">{evmAddress}</p>
            )}
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Stellar Balance</h3>
            <p className="text-2xl font-bold text-white">{stellarBalance} PARA</p>
            {stellarAddress && (
              <p className="text-xs text-slate-400 mt-1">{stellarAddress}</p>
            )}
          </div>
        </div>

        {/* Bridge Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount (PARA)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="input-field w-full"
              step="0.000001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Destination Stellar Address
            </label>
            <input
              type="text"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="G..."
              className="input-field w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="createVoucher"
              checked={createVoucher}
              onChange={(e) => setCreateVoucher(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700"
            />
            <label htmlFor="createVoucher" className="text-sm text-slate-300">
              Create voucher instead of direct transfer
            </label>
          </div>

          <button
            onClick={handleBridge}
            disabled={isLoading || !evmAddress || !destinationAddress || !amount}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : createVoucher ? 'Create Voucher' : 'Bridge PARA'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">How it works</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>Direct Bridge:</strong> PARA is transferred directly to the destination Stellar address</p>
          <p>• <strong>Voucher:</strong> Creates a claimable balance that the recipient can claim later</p>
          <p>• <strong>Fees:</strong> Small network fees apply for both EVM and Stellar transactions</p>
          <p>• <strong>Time:</strong> Bridge typically completes within 1-2 minutes</p>
        </div>
      </div>
    </div>
  );
};

export default ParaBridge; 