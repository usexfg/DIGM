import React from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletConnector: React.FC = () => {
  const {
    evmAddress,
    stellarAddress,
    connectEvmWallet,
    connectStellarWallet,
    disconnectEvmWallet,
    disconnectStellarWallet,
  } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center space-x-4">
      {/* EVM Wallet */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm text-gray-300">EVM</span>
        </div>
        {evmAddress ? (
          <div className="flex items-center space-x-2">
            <div className="glass px-3 py-1 rounded-full">
              <span className="text-sm text-green-400 font-medium">{formatAddress(evmAddress)}</span>
            </div>
            <button
              onClick={disconnectEvmWallet}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={connectEvmWallet}
            className="btn-primary text-sm"
          >
            Connect
          </button>
        )}
      </div>

      {/* Stellar Wallet */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-fuchsia-400 rounded-full"></div>
          <span className="text-sm text-gray-300">Stellar</span>
        </div>
        {stellarAddress ? (
          <div className="flex items-center space-x-2">
            <div className="glass px-3 py-1 rounded-full">
              <span className="text-sm text-fuchsia-400 font-medium">{formatAddress(stellarAddress)}</span>
            </div>
            <button
              onClick={disconnectStellarWallet}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={connectStellarWallet}
              className="btn-primary text-sm"
            >
              Connect
            </button>
            <button
              onClick={() => {
                console.log('Manual LOBSTR check...');
                console.log('window.lobstrApi:', typeof window.lobstrApi);
                console.log('window.lobstr:', typeof window.lobstr);
                console.log('All window properties:', Object.keys(window).filter(key => 
                  key.toLowerCase().includes('lobstr') || 
                  key.toLowerCase().includes('stellar')
                ));
              }}
              className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
              title="Debug LOBSTR"
            >
              Debug
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnector; 