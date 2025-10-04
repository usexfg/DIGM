import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart } from 'recharts';

interface TokenData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  supply: string;
  marketCap: string;
  description: string;
  [key: string]: any; // Add index signature for Recharts compatibility
}

interface ParticipantData {
  type: string;
  count: number;
  revenue: number;
  color: string;
  role: string;
  incentives: string[];
  [key: string]: any; // Add index signature for Recharts compatibility
}

interface EconomicFlow {
  from: string;
  to: string;
  amount: number;
  token: string;
  description: string;
}

const EconomyOverview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'flows' | 'analytics'>('overview');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  // Token ecosystem data
  const tokenData: TokenData[] = [
    {
      name: 'XFG (Fuego)',
      value: 45,
      color: '#FF6B6B',
      percentage: 45,
      supply: '18.4M',
      marketCap: '$2.3M',
      description: 'Primary payment token for album purchases and Elderfier staking'
    },
    {
      name: 'PARA (Stellar)',
      value: 30,
      color: '#4ECDC4',
      percentage: 30,
      supply: 'Inflationary',
      marketCap: '$850K',
      description: 'Listener/artist reward token earned through Paradio engagement'
    },
    {
      name: 'CURA (Fuego)',
      value: 15,
      color: '#45B7D1',
      percentage: 15,
      supply: '100M',
      marketCap: '$1.2M',
      description: 'Curation & governance token for playlist creation and DAO voting'
    },
    {
      name: 'Fable (Fuego Stable)',
      value: 10,
      color: '#96CEB4',
      percentage: 10,
      supply: 'Variable',
      marketCap: '$500K',
      description: 'Fuego-based stable asset for price-stable album purchases'
    }
  ];

  // Market participants data
  const participantsData: ParticipantData[] = [
    {
      type: 'Artists',
      count: 1250,
      revenue: 45000,
      color: '#FF6B6B',
      role: 'Content Creators',
      incentives: ['100% revenue retention', 'PARA streaming rewards', 'Direct fan connection']
    },
    {
      type: 'Listeners',
      count: 8500,
      revenue: 0,
      color: '#4ECDC4',
      role: 'Music Consumers',
      incentives: ['PARA earning for listening', 'Direct artist support', 'Premium features access']
    },
    {
      type: 'Elderfiers',
      count: 180,
      revenue: 12000,
      color: '#45B7D1',
      role: 'Network Infrastructure',
      incentives: ['XFG service fees', 'PARA seeding rewards', 'Governance rights']
    },
    {
      type: 'Curators',
      count: 320,
      revenue: 8500,
      color: '#96CEB4',
      role: 'Content Discovery',
      incentives: ['CURA staking rewards', 'PARA playlist bonuses', 'Algorithm influence']
    },
  ];

  // Economic flow data
  const economicFlows: EconomicFlow[] = [
    {
      from: 'Listeners',
      to: 'Artists',
      amount: 25000,
      token: 'XFG',
      description: 'Album purchases'
    },
    {
      from: 'Protocol',
      to: 'Listeners',
      amount: 15000,
      token: 'PARA',
      description: 'Listening rewards'
    },
    {
      from: 'Listeners',
      to: 'Artists',
      amount: 8000,
      token: 'PARA',
      description: 'Tips and donations'
    },
    {
      from: 'Artists',
      to: 'Elderfiers',
      amount: 5000,
      token: 'XFG',
      description: 'Decryption services'
    },
    {
      from: 'Protocol',
      to: 'Curators',
      amount: 3000,
      token: 'PARA',
      description: 'Playlist streaming bonuses'
    },
    {
      from: 'Users',
      to: 'Protocol',
      amount: 2000,
      token: 'PARA',
      description: 'CURA minting fees'
    },
    {
      from: 'Artists',
      to: 'Listeners',
      amount: 1500,
      token: 'Fable',
      description: 'Stable album purchases'
    }
  ];

  // Analytics data for charts
  const analyticsData = [
    { month: 'Jan', xfgVolume: 12000, paraEarned: 8500, fableVolume: 2500, albumsSold: 45, activeUsers: 3200 },
    { month: 'Feb', xfgVolume: 18500, paraEarned: 12200, fableVolume: 3800, albumsSold: 68, activeUsers: 4200 },
    { month: 'Mar', xfgVolume: 22100, paraEarned: 15800, fableVolume: 4200, albumsSold: 89, activeUsers: 5100 },
    { month: 'Apr', xfgVolume: 28900, paraEarned: 19800, fableVolume: 5200, albumsSold: 112, activeUsers: 6200 },
    { month: 'May', xfgVolume: 35200, paraEarned: 24100, fableVolume: 6800, albumsSold: 135, activeUsers: 7300 },
    { month: 'Jun', xfgVolume: 41800, paraEarned: 28900, fableVolume: 8200, albumsSold: 158, activeUsers: 8500 }
  ];


  const renderTokenOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Distribution Pie Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Token Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }: any) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Token Details */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Token Details</h3>
          <div className="space-y-4">
            {tokenData.map((token, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-fuchsia-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: token.color }}></div>
                  <div>
                    <div className="font-semibold text-white">{token.name}</div>
                    <div className="text-sm text-gray-400">{token.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{token.supply}</div>
                  <div className="text-sm text-gray-400">{token.marketCap}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Cap Overview */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Market Capitalization</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tokenData.map((token, index) => (
            <div key={index} className="text-center p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
              <div className="text-2xl font-bold text-white">{token.marketCap}</div>
              <div className="text-sm text-gray-400">{token.name}</div>
              <div className="text-xs text-fuchsia-300 mt-1">{token.percentage}% of ecosystem</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderParticipantsMindMap = () => (
    <div className="space-y-6">
      {/* Participants Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Market Participants</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={participantsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="type" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #D946EF',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#D946EF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Revenue Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={participantsData.filter(p => p.revenue > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, revenue }: any) => `${type}: $${(revenue as number).toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {participantsData.filter(p => p.revenue > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Participant Details */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Participant Ecosystem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participantsData.map((participant, index) => (
            <div key={index} className="p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: participant.color }}></div>
                <div>
                  <div className="font-bold text-white">{participant.type}</div>
                  <div className="text-sm text-gray-400">{participant.role}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Count:</span>
                  <span className="text-white font-semibold">{participant.count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Revenue:</span>
                  <span className="text-white font-semibold">${participant.revenue.toLocaleString()}</span>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-gray-400 mb-1">Key Incentives:</div>
                  <div className="space-y-1">
                    {participant.incentives.map((incentive, i) => (
                      <div key={i} className="text-xs text-fuchsia-300">• {incentive}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEconomicFlows = () => (
    <div className="space-y-6">
      {/* Flow Visualization */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Economic Flow Map</h3>
        <div className="relative">
          {/* Central Hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full flex items-center justify-center z-10">
            <span className="text-white font-bold text-sm">DIGM</span>
          </div>

          {/* Flow Connections */}
          <div className="grid grid-cols-3 gap-8 h-96">
            {/* Artists */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">Artists</span>
              </div>
              <div className="text-center">
                <div className="text-sm text-white font-semibold">Revenue Sources</div>
                <div className="text-xs text-gray-400">Album Sales: $25K</div>
                <div className="text-xs text-gray-400">PARA Tips: $8K</div>
                <div className="text-xs text-gray-400">Streaming: $12K</div>
              </div>
            </div>

            {/* Listeners */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">Listeners</span>
              </div>
              <div className="text-center">
                <div className="text-sm text-white font-semibold">Earnings</div>
                <div className="text-xs text-gray-400">PARA Rewards: $15K</div>
                <div className="text-xs text-gray-400">Premium Access</div>
                <div className="text-xs text-gray-400">Direct Support</div>
              </div>
            </div>

            {/* Infrastructure */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">Elderfiers</span>
              </div>
              <div className="text-center">
                <div className="text-sm text-white font-semibold">Services</div>
                <div className="text-xs text-gray-400">Decryption: $5K</div>
                <div className="text-xs text-gray-400">Seeding: $7K</div>
                <div className="text-xs text-gray-400">Governance</div>
              </div>
            </div>
          </div>

          {/* Flow Arrows */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Artists to Center */}
            <div className="absolute top-1/2 left-1/4 w-1/4 h-0.5 bg-gradient-to-r from-red-500 to-fuchsia-500 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/4 w-0 h-0 border-l-4 border-l-fuchsia-500 border-t-2 border-t-transparent border-b-2 border-b-transparent transform -translate-y-1/2 translate-x-1/4"></div>
            
            {/* Listeners to Center */}
            <div className="absolute top-1/2 left-1/2 w-1/4 h-0.5 bg-gradient-to-r from-teal-500 to-fuchsia-500 transform -translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-0 h-0 border-l-4 border-l-fuchsia-500 border-t-2 border-t-transparent border-b-2 border-b-transparent transform -translate-y-1/2 translate-x-1/4"></div>
            
            {/* Infrastructure to Center */}
            <div className="absolute top-1/2 right-1/4 w-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-fuchsia-500 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 right-1/4 w-0 h-0 border-l-4 border-l-fuchsia-500 border-t-2 border-t-transparent border-b-2 border-b-transparent transform -translate-y-1/2 translate-x-1/4"></div>
          </div>
        </div>
      </div>

      {/* Flow Data Table */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Transaction Flows</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-fuchsia-500/20">
                <th className="text-left py-3 px-4 text-white">From</th>
                <th className="text-left py-3 px-4 text-white">To</th>
                <th className="text-left py-3 px-4 text-white">Amount</th>
                <th className="text-left py-3 px-4 text-white">Token</th>
                <th className="text-left py-3 px-4 text-white">Description</th>
              </tr>
            </thead>
            <tbody>
              {economicFlows.map((flow, index) => (
                <tr key={index} className="border-b border-gray-700/30">
                  <td className="py-3 px-4 text-gray-300">{flow.from}</td>
                  <td className="py-3 px-4 text-gray-300">{flow.to}</td>
                  <td className="py-3 px-4 text-white font-semibold">${flow.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-fuchsia-500/20 text-fuchsia-300">
                      {flow.token}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{flow.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Growth Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Volume Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #D946EF',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="xfgVolume" stackId="1" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.6} />
                <Area type="monotone" dataKey="paraEarned" stackId="1" stroke="#4ECDC4" fill="#4ECDC4" fillOpacity={0.6} />
                <Area type="monotone" dataKey="fableVolume" stackId="1" stroke="#96CEB4" fill="#96CEB4" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">User Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #D946EF',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="activeUsers" stroke="#45B7D1" strokeWidth={3} />
                <Line type="monotone" dataKey="albumsSold" stroke="#96CEB4" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
            <div className="text-2xl font-bold text-white">$65.5K</div>
            <div className="text-sm text-gray-400">Total Volume</div>
            <div className="text-xs text-green-400 mt-1">+24% this month</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
            <div className="text-2xl font-bold text-white">8.5K</div>
            <div className="text-sm text-gray-400">Active Users</div>
            <div className="text-xs text-green-400 mt-1">+18% this month</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
            <div className="text-2xl font-bold text-white">158</div>
            <div className="text-sm text-gray-400">Albums Sold</div>
            <div className="text-xs text-green-400 mt-1">+12% this month</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
            <div className="text-2xl font-bold text-white">$28.9K</div>
            <div className="text-sm text-gray-400">PARA Distributed</div>
            <div className="text-xs text-green-400 mt-1">+22% this month</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-black/20 border border-fuchsia-500/20">
            <div className="text-2xl font-bold text-white">$8.2K</div>
            <div className="text-sm text-gray-400">Fable Volume</div>
            <div className="text-xs text-green-400 mt-1">+19% this month</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Economy Overview</h1>
          <p className="text-gray-400 text-lg">Real-time insights into the DIGM token ecosystem and participant interactions</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            {(['24h', '7d', '30d', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  timeframe === period
                    ? 'bg-fuchsia-600 text-white'
                    : 'bg-black/40 text-gray-300 hover:bg-black/60 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-black/40 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Token Overview', icon: '💰' },
            { id: 'participants', label: 'Participants', icon: '👥' },
            { id: 'flows', label: 'Economic Flows', icon: '🔄' },
            { id: 'analytics', label: 'Analytics', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-fuchsia-600 text-white'
                  : 'text-gray-300 hover:bg-black/60 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && renderTokenOverview()}
          {activeTab === 'participants' && renderParticipantsMindMap()}
          {activeTab === 'flows' && renderEconomicFlows()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>
    </div>
  );
};

export default EconomyOverview;
