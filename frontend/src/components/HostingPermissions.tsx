import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Enhanced Economy Overview Component with Visualizations
interface EconomyVisualizationProps {
  title?: string;
  showMindMap?: boolean;
  className?: string;
}

const EconomyVisualization: React.FC<EconomyVisualizationProps> = ({
  title = "DIGM Economy Overview",
  showMindMap = true,
  className = ""
}) => {
  // Token distribution data
  const tokenDistributionData = [
    { name: 'XFG', value: 35, color: '#ff6b35', description: 'Primary payment token for album purchases and Elderfier staking' },
    { name: 'PARA', value: 20, color: '#06b6d4', description: 'Listener ↔ artist reward token for streaming and tips' },
    { name: 'CURA', value: 20, color: '#8b5cf6', description: 'Curation token minted by burning PARA for curator rewards' },
    { name: 'DI₲M', value: 10, color: '#eab308', description: 'Hosting permission NFT with Bronze/Silver/Gold tiers' },
    { name: 'FABLE', value: 15, color: '#10b981', description: 'Stable coin from time-lock receipt for price-stable album purchases' }
  ];

  // Participant activity data
  const participantFlowData = [
    { participant: 'Artists', earnings: 85, contributions: 90 },
    { participant: 'Listeners', earnings: 60, contributions: 70 },
    { participant: 'Elderfiers', earnings: 75, contributions: 95 },
    { participant: 'Labels', earnings: 80, contributions: 85 },
    { participant: 'Curators', earnings: 70, contributions: 60 }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`${label}`}</p>
          <p className="text-slate-300 text-sm">{payload[0].payload.description}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`card ${className}`}>
      <h2 className="text-xl font-bold mb-6">🎯 {title}</h2>

      {/* Visual Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Token Distribution Pie Chart */}
        <div className="card bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">🪙</span>
            Token Ecosystem Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {tokenDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1e293b" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {tokenDistributionData.map((token, index) => (
              <div key={index} className="flex items-center text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: token.color }}
                />
                <span className="text-slate-300">
                  <span className="font-medium text-white">{token.name}</span> ({token.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Participant Activity Chart */}
        <div className="card bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Participant Activity Levels
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={participantFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="participant" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="earnings" fill="#06b6d4" name="Earnings %" />
                <Bar dataKey="contributions" fill="#8b5cf6" name="Contributions %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-cyan-500 rounded mr-2"></div>
              <span className="text-slate-300">Earnings %</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-indigo-500 rounded mr-2"></div>
              <span className="text-slate-300">Contributions %</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Mind Map - Participant Relationships */}
      {showMindMap && (
        <div className="card bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">🧠</span>
            Ecosystem Interaction Mind Map
          </h3>

          {/* Central Platform Node */}
          <div className="relative mb-8">
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full w-20 h-20 flex items-center justify-center shadow-lg border-4 border-slate-700">
                <span className="text-white font-bold text-lg">🎵</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <h4 className="font-semibold text-white">DIGM Platform</h4>
              <p className="text-slate-400 text-sm">Central hub connecting all participants</p>
            </div>
          </div>

          {/* Participant Nodes */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              { name: 'Artists', icon: '🎤', color: 'from-orange-600 to-red-600', flows: ['85% to Listeners', '60% to Elderfiers'] },
              { name: 'Listeners', icon: '🎧', color: 'from-cyan-600 to-blue-600', flows: ['75% back to Artists'] },
              { name: 'Elderfiers', icon: '🛰️', color: 'from-green-600 to-emerald-600', flows: ['70% to Artists'] },
              { name: 'Labels', icon: '🏷️', color: 'from-pink-600 to-purple-600', flows: ['65% to Artists'] },
              { name: 'Curators', icon: '📜', color: 'from-indigo-600 to-violet-600', flows: ['80% to Artists'] }
            ].map((participant, index) => (
              <div key={index} className="text-center group">
                <div className={`bg-gradient-to-br ${participant.color} rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-slate-700 mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                  <span className="text-white text-lg">{participant.icon}</span>
                </div>
                <h5 className="font-medium text-white text-sm">{participant.name}</h5>
                <p className="text-slate-400 text-xs">Role & Interactions</p>
                <div className="mt-2 space-y-1">
                  {participant.flows.map((flow, flowIndex) => (
                    <div key={flowIndex} className="bg-slate-700 rounded px-2 py-1 text-xs">
                      <span className="text-green-400">→</span> {flow}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Connection Visualization */}
          <div className="relative h-32 bg-slate-700/30 rounded-lg p-4 mb-4">
            <div className="absolute inset-0">
              <svg className="w-full h-full" viewBox="0 0 100 32">
                {/* Flow lines between participants */}
                <path d="M 15 16 Q 25 8 35 16" stroke="#ff6b35" strokeWidth="2" fill="none" opacity="0.7" />
                <path d="M 15 16 Q 25 24 35 16" stroke="#06b6d4" strokeWidth="2" fill="none" opacity="0.7" />
                <path d="M 15 16 Q 25 8 45 16" stroke="#8b5cf6" strokeWidth="2" fill="none" opacity="0.7" />
                <path d="M 35 16 Q 25 8 15 16" stroke="#10b981" strokeWidth="2" fill="none" opacity="0.7" />
                <path d="M 45 16 Q 35 24 15 16" stroke="#059669" strokeWidth="2" fill="none" opacity="0.7" />
                <path d="M 55 16 Q 45 8 15 16" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.7" />
                <path d="M 75 16 Q 65 24 15 16" stroke="#6366f1" strokeWidth="2" fill="none" opacity="0.7" />
              </svg>
            </div>

            {/* Flow Indicators */}
            <div className="absolute top-2 left-4 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Revenue Flow</span>
              </div>
            </div>
            <div className="absolute bottom-2 right-4 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span>Interaction Strength</span>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Token Flow Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {tokenDistributionData.map((token, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: token.color }}>
                  {token.value}%
                </div>
                <div className="text-slate-300">{token.name}</div>
                <div className="text-slate-400 text-xs">{token.description.split(' ').slice(0, 2).join(' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
        <EconomyVisualization title="DIGM Economy Overview" showMindMap={true} className="mt-8" />

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