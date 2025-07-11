import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

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

const VoucherClaim: React.FC = () => {
  const { stellarAddress } = useWallet();
  const [claimableBalances, setClaimableBalances] = useState<ClaimableBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (stellarAddress) {
      fetchClaimableBalances();
    }
  }, [stellarAddress]);

  const fetchClaimableBalances = async () => {
    if (!stellarAddress) return;
    
    setRefreshing(true);
    try {
      const response = await fetch(`/api/stellar/claimable-balances/${stellarAddress}`);
      if (response.ok) {
        const data = await response.json();
        setClaimableBalances(data.records || []);
      }
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

    setIsLoading(true);
    try {
      const response = await fetch('/api/stellar/claim-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balanceId,
          claimantAddress: stellarAddress
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully claimed ${result.amount} ${result.asset}!`);
        // Refresh the list
        await fetchClaimableBalances();
      } else {
        const error = await response.json();
        alert(`Failed to claim: ${error.message}`);
      }
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Failed to claim balance');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: string, asset: string) => {
    // Convert from Stellar's 7 decimal places
    const numAmount = parseFloat(amount) / 10000000;
    return `${numAmount.toFixed(7)} ${asset}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!stellarAddress) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Claim Vouchers</h2>
        <p className="text-slate-300">Please connect your Stellar wallet to view and claim vouchers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              Vouchers will appear here when they're created for your address
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
                        {formatAmount(balance.amount, balance.asset)}
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
                    disabled={isLoading}
                    className="btn-primary ml-4 disabled:opacity-50"
                  >
                    {isLoading ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">About Vouchers</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p>• <strong>Vouchers</strong> are claimable balances created on the Stellar network</p>
          <p>• They allow you to receive PARA without needing to sign a transaction immediately</p>
          <p>• Click "Claim" to transfer the PARA to your Stellar wallet</p>
          <p>• Vouchers may have expiration dates set by the creator</p>
          <p>• You can only claim vouchers created for your address</p>
        </div>
      </div>
    </div>
  );
};

export default VoucherClaim; 