import { useState, useEffect } from 'react';

interface WalletBalance {
  xfg: number;
  digm: number;
  para: number;
}

function WalletView() {
  const [balance, setBalance] = useState<WalletBalance>({ xfg: 0, digm: 0, para: 0 });
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock wallet data for now
    setTimeout(() => {
      setBalance({ xfg: 1.25, digm: 100, para: 15420 });
      setAddress('XfG7h4k2m9p1q8r3s5t6v7w8x9y0z1a2b3c4d5e6');
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Fuego Wallet</h2>

        {/* Wallet Address */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Wallet Address</h3>
          <div className="flex items-center space-x-3">
            <code className="flex-1 bg-gray-900 px-3 py-2 rounded text-sm font-mono">
              {address}
            </code>
            <button className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">
              Copy
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* XFG Balance */}
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">XFG</h3>
              <span className="text-yellow-100 text-sm">Fuego</span>
            </div>
            <p className="text-2xl font-bold text-white">{balance.xfg.toFixed(8)}</p>
            <p className="text-yellow-100 text-sm">≈ $0.00 USD</p>
          </div>

          {/* DIGM Balance */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">DIGM</h3>
              <span className="text-purple-100 text-sm">Hosting Rights</span>
            </div>
            <p className="text-2xl font-bold text-white">{balance.digm}</p>
            <p className="text-purple-100 text-sm">Max: 100,000</p>
          </div>

          {/* PARA Balance */}
          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">PARA</h3>
              <span className="text-green-100 text-sm">Rewards</span>
            </div>
            <p className="text-2xl font-bold text-white">{balance.para.toLocaleString()}</p>
            <p className="text-green-100 text-sm">pico-PARA</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-medium">
            Send XFG
          </button>
          <button className="bg-green-600 hover:bg-green-700 p-4 rounded-lg font-medium">
            Claim PARA Rewards
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
              <div>
                <p className="font-medium">Album Purchase</p>
                <p className="text-sm text-gray-400">Epic Soundscapes Vol. 1</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-red-400">-0.005 XFG</p>
                <p className="text-sm text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
              <div>
                <p className="font-medium">PARA Reward</p>
                <p className="text-sm text-gray-400">Paradio listening</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-400">+2,500 PARA</p>
                <p className="text-sm text-gray-400">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletView; 