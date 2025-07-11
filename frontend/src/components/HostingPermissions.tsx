import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface DigmNft {
  tokenId: string;
  tier: 'bronze' | 'silver' | 'gold';
  contributionPoints?: number;
  mintType: 'curve' | 'contribution';
}

const HostingPermissions: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const [digmNfts, setDigmNfts] = useState<DigmNft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hostingStatus, setHostingStatus] = useState<'none' | 'bronze' | 'silver' | 'gold'>('none');
  const [currentPrice, setCurrentPrice] = useState('0');

  useEffect(() => {
    if (evmAddress) {
      fetchDigmNfts();
      fetchCurrentPrice();
    }
  }, [evmAddress]);

  useEffect(() => {
    // Determine highest tier from NFTs
    if (digmNfts.length > 0) {
      const tiers = digmNfts.map(nft => nft.tier);
      if (tiers.includes('gold')) {
        setHostingStatus('gold');
      } else if (tiers.includes('silver')) {
        setHostingStatus('silver');
      } else if (tiers.includes('bronze')) {
        setHostingStatus('bronze');
      }
    } else {
      setHostingStatus('none');
    }
  }, [digmNfts]);

  const fetchDigmNfts = async () => {
    if (!evmAddress) return;
    
    setIsLoading(true);
    try {
      // This would query the CosmWasm NFT contract
      const response = await fetch(`/api/nft/digm/${evmAddress}`);
      if (response.ok) {
        const data = await response.json();
        setDigmNfts(data.nfts || []);
      }
    } catch (error) {
      console.error('Failed to fetch DIGM NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPrice = async () => {
    try {
      // This would query the bonding curve price
      const response = await fetch('/api/nft/curve-price');
      if (response.ok) {
        const data = await response.json();
        setCurrentPrice(data.price || '0');
      }
    } catch (error) {
      console.error('Failed to fetch current price:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'bg-yellow-600';
      case 'silver': return 'bg-gray-500';
      case 'bronze': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'gold':
        return ['Unlimited hosting', 'Priority support', 'Advanced features', 'DAO voting rights'];
      case 'silver':
        return ['Up to 10 hosted services', 'Standard support', 'Basic features'];
      case 'bronze':
        return ['Up to 3 hosted services', 'Community support'];
      default:
        return [];
    }
  };

  const canHost = hostingStatus !== 'none';

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Hosting Permissions</h2>
        
        <div className="bg-slate-700 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Current Status</h3>
              <p className="text-slate-300">
                {canHost 
                  ? `You have ${hostingStatus} tier hosting permissions`
                  : 'No hosting permissions - acquire a DIGM NFT to start hosting'
                }
              </p>
            </div>
            {canHost && (
              <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getTierColor(hostingStatus)}`}>
                {hostingStatus.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Benefits */}
        {canHost && (
          <div className="mb-6">
            <h4 className="text-md font-semibold mb-3">Your Benefits</h4>
            <ul className="space-y-2">
              {getTierBenefits(hostingStatus).map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-slate-300">
                  <span className="text-green-400 mr-2">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {canHost ? (
            <button className="btn-primary w-full">
              Start Hosting Service
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-center p-4 bg-slate-700 rounded-lg">
                <p className="text-slate-300 mb-2">Current NFT Price: {currentPrice} PARA</p>
                <button className="btn-primary">
                  Mint DIGM NFT
                </button>
              </div>
              <p className="text-sm text-slate-400 text-center">
                Or earn one through contributions to the DIGM ecosystem
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NFT Collection */}
      {evmAddress && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Your DIGM NFTs</h3>
            <button
              onClick={fetchDigmNfts}
              disabled={isLoading}
              className="btn-secondary text-sm"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {digmNfts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No DIGM NFTs found</p>
              <p className="text-sm text-slate-500 mt-2">
                Mint an NFT or earn one through contributions to get hosting permissions
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {digmNfts.map((nft) => (
                <div
                  key={nft.tokenId}
                  className="bg-slate-700 border border-slate-600 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">
                      DIGM #{nft.tokenId}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getTierColor(nft.tier)}`}>
                      {nft.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>Type: {nft.mintType === 'curve' ? 'Bonding Curve' : 'Contribution'}</p>
                    {nft.contributionPoints && (
                      <p>Points: {nft.contributionPoints.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">How Hosting Permissions Work</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold">1.</span>
            <div>
              <p className="font-medium">Acquire a DIGM NFT</p>
              <p className="text-slate-400">Mint via bonding curve or earn through contributions</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold">2.</span>
            <div>
              <p className="font-medium">Get Hosting Rights</p>
              <p className="text-slate-400">NFT tier determines your hosting capabilities</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold">3.</span>
            <div>
              <p className="font-medium">Start Hosting</p>
              <p className="text-slate-400">Deploy services within your tier limits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostingPermissions; 