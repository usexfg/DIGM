import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { STELLAR_CONFIG, PARA_UTILS } from '../config/stellar';

interface ClaimableBalance {
  id: string;
  amount: string;
  asset: string;
  claimants: Array<{
    destination: string;
    predicate: any;
  }>;
  sponsor: string;
  last_modified_ledger: number;
  last_modified_time: string;
}

const ParaBridge: React.FC = () => {
  const { evmAddress, stellarAddress, evmProvider } = useWallet();
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evmBalance, setEvmBalance] = useState('0');
  const [stellarBalance, setStellarBalance] = useState('0');
  const [createVoucher, setCreateVoucher] = useState(false);
  const [claimableBalances, setClaimableBalances] = useState<ClaimableBalance[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<'bridge' | 'vouchers'>('bridge');

  const fetchClaimableBalances = async () => {
    if (!stellarAddress) return;
    
    setRefreshing(true);
    try {
      // Mock data since backend is not running
      const mockBalances: ClaimableBalance[] = [
        {
          id: 'mock-balance-1',
          amount: '87654321', // This will display as 87654321 PARA (your example)
          asset: 'PARA',
          claimants: [{ destination: stellarAddress, predicate: {} }],
          sponsor: 'mock-sponsor-address',
          last_modified_ledger: 123456,
          last_modified_time: new Date().toISOString()
        }
      ];
      setClaimableBalances(mockBalances);
    } catch (error) {
      console.error('Failed to fetch claimable balances:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const claimBalance = async (balanceId: string) => {
    if (!stellarAddress) {
      alert('Please connect your Stellar wallet');
      return;
    }

    setClaiming(true);
    try {
      // Mock claim since backend is not running
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Successfully claimed voucher!');
      await fetchClaimableBalances();
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Failed to claim balance');
    } finally {
      setClaiming(false);
    }
  };

  const formatAmount = (amount: string, asset: string) => {
    if (asset === STELLAR_CONFIG.PARA_CODE) {
      return PARA_UTILS.formatPARA(parseFloat(amount)) + ' ' + asset;
    }
    // Stellar uses 7 decimals for PARA
    const numAmount = parseFloat(amount) / 10000000;
    return `${numAmount.toFixed(7)} ${asset}`;
  };

  // Convert PARA to whole number display (18th decimal as base unit)
  const formatParaAsWholeNumber = (paraAmount: string) => {
    const numAmount = parseFloat(paraAmount);
    // Convert to smallest unit (18th decimal)
    const smallestUnit = Math.floor(numAmount * Math.pow(10, 18));
    return smallestUnit.toLocaleString();
  };

  // Utility: Format PARA numbers for UX (whole number and subunit abbreviations)
  function formatParaAmount(num: number | string): string {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (!n) return '0';
    const abs = Math.abs(n);
    // Large numbers (>= 1)
    const large = [
      { value: 1e21, symbol: 'SX' },
      { value: 1e18, symbol: 'QN' },
      { value: 1e15, symbol: 'QD' },
      { value: 1e12, symbol: 'T' },
      { value: 1e9, symbol: 'B' },
      { value: 1e6, symbol: 'M' },
      { value: 1e3, symbol: 'K' },
    ];
    for (const l of large) {
      if (abs >= l.value) {
        const val = n / l.value;
        const rounded = Math.round(val);
        return rounded + l.symbol;
      }
    }
    // For numbers less than 1, show '1' if nonzero, otherwise '0'
    if (abs < 1) {
      return n > 0 ? '1' : '0';
    }
    // For all other numbers, show as whole number (rounded)
    return Math.round(n).toString();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    if (evmAddress) {
      fetchEvmBalance();
    }
    if (stellarAddress) {
      fetchStellarBalance();
      fetchClaimableBalances();
    }
  }, [evmAddress, stellarAddress]);

  const fetchEvmBalance = async () => {
    if (!evmProvider || !evmAddress) return;
    
    try {
      // This would be the PARA token contract address
      const paraAddress = '0x...'; // Replace with actual PARA contract address
      const balance = await evmProvider.getBalance(evmAddress);
      // EVM uses 18 decimals (wei to ether)
      setEvmBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch EVM balance:', error);
    }
  };

  const fetchStellarBalance = async () => {
    if (!stellarAddress) return;
    
    try {
      // Mock data since backend is not running
      // Stellar uses 7 decimals, so we generate a random amount in atta-PARA (7 decimals)
      const mockBalanceInAtta = Math.floor(Math.random() * 1000000000 + 500000000); // 50-1000 PARA in atta-PARA
      const mockBalance = (mockBalanceInAtta / 10000000).toFixed(7); // Convert to PARA with 7 decimals
      setStellarBalance(mockBalance);
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
    // Mock voucher creation since backend is not running
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate network delay
    console.log('Mock voucher created for:', { fromAddress: evmAddress, toAddress: destinationAddress, amount });
  };

  const bridgeToStellar = async () => {
    // Mock bridge transfer since backend is not running
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
    console.log('Mock bridge transfer:', { fromAddress: evmAddress, toAddress: destinationAddress, amount });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('bridge')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'bridge'
              ? 'bg-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-300'
              : 'text-gray-300 hover:bg-black/40 hover:text-white border border-transparent'
          }`}
        >
          🌉 Bridge
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'vouchers'
              ? 'bg-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-300'
              : 'text-gray-300 hover:bg-black/40 hover:text-white border border-transparent'
          }`}
        >
          🎫 Vouchers
        </button>
      </div>

      {activeTab === 'bridge' && (
        <>
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <img 
                src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                alt="PARA" 
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              PARA Bridge
            </h2>
          
            {/* Balance Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                  <h3 className="text-sm font-medium text-slate-300">EVM Balance</h3>
                </div>
                <p className="text-2xl font-bold text-white">{formatParaAmount(evmBalance)} PARA</p>
                {evmAddress && (
                  <p className="text-xs text-slate-400 mt-1">{evmAddress}</p>
                )}
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
                  <h3 className="text-sm font-medium text-slate-300">Stellar Balance</h3>
                </div>
                <p className="text-2xl font-bold text-white">{formatParaAmount(stellarBalance)} PARA</p>
                {stellarAddress && (
                  <p className="text-xs text-slate-400 mt-1">{stellarAddress}</p>
                )}
              </div>
            </div>

            {/* Bridge Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount (<img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> tokens)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="input-field w-full"
                  step="0.000000000000000001"
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
                {isLoading ? 'Processing...' : createVoucher ? 'Create Voucher' : `Bridge ${<img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" />} tokens`}
              </button>
            </div>
          </div>

          {/* About PARA Section */}
          <div className="glass p-6 rounded-xl border border-blue-500/20 max-w-2xl mx-auto mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src="/assets/para.png" alt="PARA Logo" className="w-10 h-10 object-contain rounded-full bg-black" />
              </div>
              <h3 className="text-white font-semibold text-lg">PARA Token</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Networks:</span>
                <span className="text-white">Stellar, EVM (Arbitrum, Ethereum)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Asset Type:</span>
                <span className="text-white">Multi-chain Utility & Rewards Token</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Decimals:</span>
                <span className="text-white">7 (Stellar), 18 (EVM)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Use Case:</span>
                <span className="text-white">Artist & Listener Rewards, Elder Node Rewards, Listener-centric Economy</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">How it works</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>• <strong>Direct Bridge:</strong> <img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> PARA tokens are transferred directly to the your Stellar address</p>
              <p>• <strong>Voucher:</strong> Creates a claimable balance that recipient can redeem later</p>
              <p>• <strong>Fees:</strong> Small network fees apply for both EVM and Stellar-based transactions</p>
              <p>• <strong>Time:</strong> Bridge typically completes within 1-2 minutes</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'vouchers' && (
        <>
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Claim Vouchers</h2>
              <button
                onClick={fetchClaimableBalances}
                disabled={refreshing}
                className="btn-secondary text-sm"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {claimableBalances.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No claimable balances found</p>
                <p className="text-sm text-slate-500 mt-2">
                  Vouchers will appear here when they've been created for your address
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {claimableBalances.map((balance) => (
                  <div
                    key={balance.id}
                    className="bg-slate-700 border border-slate-600 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-semibold text-white">
                            {formatParaAmount(parseFloat(balance.amount) / 1e7)} {balance.asset}
                          </span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            Voucher
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>ID: {balance.id.slice(0, 8)}...</p>
                          <p>Created: {formatDate(balance.last_modified_time)}</p>
                          <p>Sponsor: {balance.sponsor.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <button
                        onClick={() => claimBalance(balance.id)}
                        disabled={claiming}
                        className="btn-primary ml-4 disabled:opacity-50"
                      >
                        {claiming ? 'Claiming...' : 'Claim'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voucher Instructions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">About Vouchers</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>• <strong>Vouchers</strong> are claimable balances created on the Stellar network</p>
              <p>• They allow you to receive <img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> PARA without needing to sign a transaction immediately</p>
              <p>• Click "Claim" to transfer the <img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> PARA to your Stellar wallet</p>
              <p>• Vouchers may have expiration dates set by the creator</p>
              <p>• You can only claim vouchers created for your address</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParaBridge; 