import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface DigmCoin {
  tokenId: string;
  tier: 'bronze' | 'silver' | 'gold';
  contributionPoints?: number;
  mintType: 'curve' | 'contribution';
}

const HostingPermissions: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const [digmCoins, setDigmCoins] = useState<DigmCoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hostingStatus, setHostingStatus] = useState<'none' | 'bronze' | 'silver' | 'gold'>('none');
  const [currentPrice, setCurrentPrice] = useState('0');

  useEffect(() => {
    if (evmAddress) {
      fetchDigmCoins();
      fetchCurrentPrice();
    }
  }, [evmAddress]);

  useEffect(() => {
    // Determine highest tier from DI₲M coins
    if (digmCoins.length > 0) {
      const tiers = digmCoins.map(coin => coin.tier);
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
  }, [digmCoins]);

  const fetchDigmCoins = async () => {
    if (!evmAddress) return;
    
    setIsLoading(true);
    try {
      // Mock data since backend is not running
      const mockCoins = [
        {
          tokenId: '1',
          tier: 'gold' as const,
          contributionPoints: 15000,
          mintType: 'contribution' as const
        },
        {
          tokenId: '2',
          tier: 'silver' as const,
          contributionPoints: 8000,
          mintType: 'curve' as const
        }
      ];
      setDigmCoins(mockCoins);
    } catch (error) {
      console.error('Failed to fetch DI₲M coins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPrice = async () => {
    try {
      // Mock data since backend is not running
      const mockPrice = (Math.random() * 100 + 50).toFixed(2);
      setCurrentPrice(mockPrice);
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
                  : 'No hosting permissions - acquire a DI₲M coin to start hosting'
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

        {/* DIGM Economy Overview */}
        <div className="card mt-8">
          <h2 className="text-xl font-bold mb-4">DIGM Economy Overview</h2>

          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
            {/* Token Ecosystem */}
            <div>
              <h3 className="font-semibold text-white mb-2">Tokens</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2" />
                  <span className="font-medium text-white mr-1">XFG</span>
                  – Primary payment token (album purchases, Elderfier staking)
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-cyan-500 mr-2" />
                  <span className="font-medium text-white mr-1">PARA</span>
                  – Listener ↔ artist reward token (streaming & tips)
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 mr-2" />
                  <span className="font-medium text-white mr-1">CURA</span>
                  – Curation & governance token (playlist staking, DAO voting)
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                  <span className="font-medium text-white mr-1">DI₲M</span>
                  – Hosting permission NFT (Bronze / Silver / Gold tiers)
                </li>
              </ul>
            </div>

            {/* Market Participants */}
            <div>
              <h3 className="font-semibold text-white mb-2">Participants</h3>
              <ul className="space-y-2">
                <li>🎤 <span className="font-medium text-white">Artists</span> earn XFG & PARA, stake CURA for visibility.</li>
                <li>🎧 <span className="font-medium text-white">Listeners</span> spend XFG, earn PARA, tip PARA.</li>
                <li>🛰️ <span className="font-medium text-white">Elderfiers</span> stake XFG, earn XFG & PARA for seeding.</li>
                <li>🏷️ <span className="font-medium text-white">Labels</span> stake CURA to promote catalogs, share XFG sales.</li>
                <li>📜 <span className="font-medium text-white">Curators</span> stake/earn CURA for playlists; receive PARA tips.</li>
              </ul>
            </div>
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
                <p className="text-slate-300 mb-2">Current DI₲M Coin Price: {currentPrice} HEAT</p>
                <button className="btn-primary">
                  Mint DI₲M Coin
                </button>
              </div>
              <p className="text-sm text-slate-400 text-center">
                Or earn one through contributions to the DIGM ecosystem
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DI₲M Coin Collection */}
      {evmAddress && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Your DI₲M Coins</h3>
            <button
              onClick={fetchDigmCoins}
              disabled={isLoading}
              className="btn-secondary text-sm"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {digmCoins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No DI₲M coins found</p>
              <p className="text-sm text-slate-500 mt-2">
                Mint a DI₲M coin or earn one through contributions to get hosting permissions
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {digmCoins.map((coin) => (
                <div
                  key={coin.tokenId}
                  className="bg-slate-700 border border-slate-600 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">
                      DI₲M #{coin.tokenId}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getTierColor(coin.tier)}`}>
                      {coin.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>Type: {coin.mintType === 'curve' ? 'Bonding Curve' : 'Contribution'}</p>
                    {coin.contributionPoints && (
                      <p>Points: {coin.contributionPoints.toLocaleString()}</p>
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
              <p className="font-medium">Acquire a DI₲M Coin</p>
              <p className="text-slate-400">Mint via bonding curve or earn through contributions</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold">2.</span>
            <div>
              <p className="font-medium">Get Hosting Rights</p>
              <p className="text-slate-400">DI₲M coin tier determines your hosting capabilities</p>
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

      {/* DI₲M Colored Coin Explainer */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">What is the DI₲M Colored Coin?</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start space-x-3">
            <span className="text-green-400 font-bold">★</span>
            <div>
              <p className="font-medium">On-chain upload key</p>
              <p className="text-slate-400">Holding a <span className="font-semibold">DI₲M</span> coin (color-id 1) is the only way to publish albums on the DIGM platform. Each coin grants <span className="font-semibold">10 upload slots</span>.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-400 font-bold">★</span>
            <div>
              <p className="font-medium">Album signature</p>
              <p className="text-slate-400">When you release an album the wallet signs a <code>0x0A</code> transaction-extra with the DI₲M coin&#39;s private key. This proves on-chain that <em>you</em> are the rightful artist.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-400 font-bold">★</span>
            <div>
              <p className="font-medium">Immutable but updatable</p>
              <p className="text-slate-400">Albums can be updated (new cover, description) using a free 0x0A **update** txn, but they can never be deleted. Buyers keep permanent access.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-400 font-bold">★</span>
            <div>
              <p className="font-medium">Color-aware wallet</p>
              <p className="text-slate-400">Your wallet shows DI₲M outputs separately from regular XFG so you never accidentally spend your upload rights.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostingPermissions; 