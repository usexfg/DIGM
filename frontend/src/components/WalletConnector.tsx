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
      <div className="flex items-center space-x-2">
        <span className="text-sm text-slate-300">EVM:</span>
        {evmAddress ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-green-400">{formatAddress(evmAddress)}</span>
            <button
              onClick={disconnectEvmWallet}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Disconnect
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
      <div className="flex items-center space-x-2">
        <span className="text-sm text-slate-300">Stellar:</span>
        {stellarAddress ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-green-400">{formatAddress(stellarAddress)}</span>
            <button
              onClick={disconnectStellarWallet}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectStellarWallet}
            className="btn-primary text-sm"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
};

export default WalletConnector; 