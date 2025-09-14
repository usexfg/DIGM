import React, { useState, useEffect } from 'react';
import { dstIntegration, DSTBalance, DSTTransaction, CollateralInfo } from '../utils/dstIntegration';

interface DSTManagerProps {
  userAddress: string;
  onClose: () => void;
}

const DSTManager: React.FC<DSTManagerProps> = ({ userAddress, onClose }) => {
  const [balance, setBalance] = useState<DSTBalance | null>(null);
  const [collateralInfo, setCollateralInfo] = useState<CollateralInfo[]>([]);
  const [transactions, setTransactions] = useState<DSTTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'mint' | 'burn' | 'transfer' | 'history'>('overview');
  
  // Mint form state
  const [mintForm, setMintForm] = useState({
    collateralAmount: '',
    assetType: 'XFG',
    expectedDST: 0,
    fee: 0
  });
  
  // Burn form state
  const [burnForm, setBurnForm] = useState({
    dstAmount: '',
    preferredAsset: '',
    expectedCollateral: {} as { [asset: string]: number }
  });
  
  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    toAddress: '',
    amount: '',
    fee: 0
  });

  useEffect(() => {
    loadDSTData();
  }, [userAddress]);

  const loadDSTData = async () => {
    try {
      setIsLoading(true);
      
      // Load all DST data in parallel
      const [balanceData, collateralData, transactionsData] = await Promise.all([
        dstIntegration.getDSTBalance(userAddress),
        dstIntegration.getCollateralInfo(),
        dstIntegration.getTransactionHistory(userAddress, 20)
      ]);
      
      setBalance(balanceData);
      setCollateralInfo(collateralData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load DST data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintDST = async () => {
    try {
      setIsLoading(true);
      
      const transaction = await dstIntegration.mintDST(
        userAddress,
        parseFloat(mintForm.collateralAmount),
        mintForm.assetType,
        'mock_private_key' // In real implementation, get from wallet
      );
      
      console.log('DST minting transaction:', transaction);
      
      // Refresh data
      await loadDSTData();
      
      // Reset form
      setMintForm({
        collateralAmount: '',
        assetType: 'XFG',
        expectedDST: 0,
        fee: 0
      });
      
      setActiveTab('overview');
    } catch (error) {
      console.error('Failed to mint DST:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBurnDST = async () => {
    try {
      setIsLoading(true);
      
      const transaction = await dstIntegration.burnDST(
        userAddress,
        parseFloat(burnForm.dstAmount),
        burnForm.preferredAsset || undefined,
        'mock_private_key' // In real implementation, get from wallet
      );
      
      console.log('DST burning transaction:', transaction);
      
      // Refresh data
      await loadDSTData();
      
      // Reset form
      setBurnForm({
        dstAmount: '',
        preferredAsset: '',
        expectedCollateral: {}
      });
      
      setActiveTab('overview');
    } catch (error) {
      console.error('Failed to burn DST:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferDST = async () => {
    try {
      setIsLoading(true);
      
      const transaction = await dstIntegration.transferDST(
        userAddress,
        transferForm.toAddress,
        parseFloat(transferForm.amount),
        'mock_private_key' // In real implementation, get from wallet
      );
      
      console.log('DST transfer transaction:', transaction);
      
      // Refresh data
      await loadDSTData();
      
      // Reset form
      setTransferForm({
        toAddress: '',
        amount: '',
        fee: 0
      });
      
      setActiveTab('overview');
    } catch (error) {
      console.error('Failed to transfer DST:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number, decimals = 4): string => {
    return (amount / 10000000).toFixed(decimals);
  };

  const formatUSD = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'confirmed': return '✅';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  if (isLoading && !balance) {
    return (
      <div className="glass p-8 rounded-2xl max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-8 rounded-2xl max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">DST Manager</h2>
          <p className="text-gray-400">Manage your DIGM Stable Tokens</p>
        </div>
        <button
          onClick={onClose}
          className="btn-secondary"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'mint', label: 'Mint DST' },
          { id: 'burn', label: 'Burn DST' },
          { id: 'transfer', label: 'Transfer' },
          { id: 'history', label: 'History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Balance Overview */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl border border-blue-500/20">
              <h3 className="text-blue-400 font-semibold mb-2">DST Balance</h3>
              <div className="text-3xl font-bold text-white">
                {balance ? formatAmount(balance.balance) : '0.0000'} DST
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {balance ? formatUSD(balance.balance * 0.0001) : '$0.00'} USD
              </div>
            </div>

            <div className="glass p-6 rounded-xl border border-green-500/20">
              <h3 className="text-green-400 font-semibold mb-2">Locked Collateral</h3>
              <div className="text-3xl font-bold text-white">
                {balance ? Object.keys(balance.lockedCollateral).length : 0} Assets
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {balance ? Object.values(balance.lockedCollateral).reduce((a, b) => a + b, 0) : 0} Total
              </div>
            </div>

            <div className="glass p-6 rounded-xl border border-purple-500/20">
              <h3 className="text-purple-400 font-semibold mb-2">Recent Activity</h3>
              <div className="text-3xl font-bold text-white">
                {transactions.length} Transactions
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Last: {transactions[0] ? new Date(transactions[0].timestamp).toLocaleDateString() : 'None'}
              </div>
            </div>
          </div>

          {/* Collateral Information */}
          <div className="glass p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Collateral Basket</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {collateralInfo.map((collateral, index) => (
                <div key={index} className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{collateral.assetType}</span>
                    <span className="text-sm text-gray-400">{collateral.weight}%</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Amount: {formatAmount(collateral.amount)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Value: {formatUSD(collateral.priceUSD)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mint Tab */}
      {activeTab === 'mint' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Mint DST Tokens</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1">Collateral Amount</label>
              <input
                type="number"
                step="0.0001"
                value={mintForm.collateralAmount}
                onChange={(e) => setMintForm(prev => ({ ...prev, collateralAmount: e.target.value }))}
                className="input-field w-full"
                placeholder="1.0000"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">Collateral Asset</label>
              <select
                value={mintForm.assetType}
                onChange={(e) => setMintForm(prev => ({ ...prev, assetType: e.target.value }))}
                className="input-field w-full"
              >
                <option value="XFG">XFG (Fuego)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
                <option value="USDC">USDC (USD Coin)</option>
              </select>
            </div>

            <div className="glass p-4 rounded-lg border border-blue-500/20">
              <h4 className="text-blue-400 font-semibold mb-2">Minting Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Collateral Value:</span>
                  <span className="text-white">${(parseFloat(mintForm.collateralAmount) * 0.0001).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected DST:</span>
                  <span className="text-white">{formatAmount(parseFloat(mintForm.collateralAmount) * 0.95)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Minting Fee:</span>
                  <span className="text-white">5%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleMintDST}
              disabled={!mintForm.collateralAmount || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Minting...' : 'Mint DST'}
            </button>
          </div>
        </div>
      )}

      {/* Burn Tab */}
      {activeTab === 'burn' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Burn DST Tokens</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1">DST Amount to Burn</label>
              <input
                type="number"
                step="0.0001"
                value={burnForm.dstAmount}
                onChange={(e) => setBurnForm(prev => ({ ...prev, dstAmount: e.target.value }))}
                className="input-field w-full"
                placeholder="1.0000"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">Preferred Collateral Asset (Optional)</label>
              <select
                value={burnForm.preferredAsset}
                onChange={(e) => setBurnForm(prev => ({ ...prev, preferredAsset: e.target.value }))}
                className="input-field w-full"
              >
                <option value="">Auto-select optimal mix</option>
                <option value="XFG">XFG (Fuego)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
                <option value="USDC">USDC (USD Coin)</option>
              </select>
            </div>

            <div className="glass p-4 rounded-lg border border-red-500/20">
              <h4 className="text-red-400 font-semibold mb-2">Burning Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">DST to Burn:</span>
                  <span className="text-white">{burnForm.dstAmount || '0.0000'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected Collateral:</span>
                  <span className="text-white">${(parseFloat(burnForm.dstAmount || '0') * 0.0001).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Burning Fee:</span>
                  <span className="text-white">2%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleBurnDST}
              disabled={!burnForm.dstAmount || isLoading}
              className="btn-primary w-full bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Burning...' : 'Burn DST'}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Tab */}
      {activeTab === 'transfer' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Transfer DST Tokens</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1">Recipient Address</label>
              <input
                type="text"
                value={transferForm.toAddress}
                onChange={(e) => setTransferForm(prev => ({ ...prev, toAddress: e.target.value }))}
                className="input-field w-full"
                placeholder="Enter recipient address"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">DST Amount</label>
              <input
                type="number"
                step="0.0001"
                value={transferForm.amount}
                onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                className="input-field w-full"
                placeholder="1.0000"
              />
            </div>

            <div className="glass p-4 rounded-lg border border-purple-500/20">
              <h4 className="text-purple-400 font-semibold mb-2">Transfer Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">From:</span>
                  <span className="text-white text-xs">{userAddress.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To:</span>
                  <span className="text-white text-xs">{transferForm.toAddress.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white">{transferForm.amount || '0.0000'} DST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Fee:</span>
                  <span className="text-white">0.001 XFG</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleTransferDST}
              disabled={!transferForm.toAddress || !transferForm.amount || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Transferring...' : 'Transfer DST'}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Transaction History</h3>
          
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No transactions found
              </div>
            ) : (
              transactions.map((tx, index) => (
                <div key={index} className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {tx.type === 'mint' ? '🪙' : tx.type === 'burn' ? '🔥' : '↔️'}
                      </span>
                      <span className="text-white font-semibold capitalize">{tx.type}</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(tx.status)}`}>
                      {getStatusIcon(tx.status)} {tx.status}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <div className="text-white">{formatAmount(tx.amount)} DST</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <div className="text-white">{new Date(tx.timestamp).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">TX Hash:</span>
                      <div className="text-white text-xs font-mono">
                        {tx.txHash ? `${tx.txHash.slice(0, 20)}...` : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DSTManager;
