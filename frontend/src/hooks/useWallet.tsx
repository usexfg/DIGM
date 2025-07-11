import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  // EVM Wallet
  evmAddress: string | null;
  evmProvider: ethers.BrowserProvider | null;
  connectEvmWallet: () => Promise<void>;
  disconnectEvmWallet: () => void;
  
  // Stellar Wallet
  stellarAddress: string | null;
  stellarPublicKey: string | null;
  connectStellarWallet: () => Promise<void>;
  disconnectStellarWallet: () => void;
  
  // General
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [evmProvider, setEvmProvider] = useState<ethers.BrowserProvider | null>(null);
  const [stellarAddress, setStellarAddress] = useState<string | null>(null);
  const [stellarPublicKey, setStellarPublicKey] = useState<string | null>(null);

  const connectEvmWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or another Ethereum wallet');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setEvmAddress(accounts[0]);
        setEvmProvider(provider);
      }
    } catch (error) {
      console.error('Failed to connect EVM wallet:', error);
      alert('Failed to connect wallet');
    }
  };

  const disconnectEvmWallet = () => {
    setEvmAddress(null);
    setEvmProvider(null);
  };

  const connectStellarWallet = async () => {
    try {
      // Check if Freighter is available
      if (typeof window.freighterApi === 'undefined') {
        alert('Please install Freighter wallet for Stellar');
        return;
      }

      const isConnected = await window.freighterApi.isConnected();
      if (!isConnected) {
        await window.freighterApi.connect();
      }

      const publicKey = await window.freighterApi.getPublicKey();
      setStellarPublicKey(publicKey);
      setStellarAddress(publicKey); // Stellar addresses are the public key
    } catch (error) {
      console.error('Failed to connect Stellar wallet:', error);
      alert('Failed to connect Stellar wallet');
    }
  };

  const disconnectStellarWallet = () => {
    setStellarAddress(null);
    setStellarPublicKey(null);
  };

  const isConnected = !!(evmAddress || stellarAddress);

  // Auto-connect on page load if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setEvmAddress(accounts[0].address);
            setEvmProvider(provider);
          }
        } catch (error) {
          console.error('Failed to auto-connect EVM wallet:', error);
        }
      }

      if (typeof window.freighterApi !== 'undefined') {
        try {
          const isConnected = await window.freighterApi.isConnected();
          if (isConnected) {
            const publicKey = await window.freighterApi.getPublicKey();
            setStellarPublicKey(publicKey);
            setStellarAddress(publicKey);
          }
        } catch (error) {
          console.error('Failed to auto-connect Stellar wallet:', error);
        }
      }
    };

    checkConnection();
  }, []);

  const value: WalletContextType = {
    evmAddress,
    evmProvider,
    connectEvmWallet,
    disconnectEvmWallet,
    stellarAddress,
    stellarPublicKey,
    connectStellarWallet,
    disconnectStellarWallet,
    isConnected,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Extend Window interface for Freighter
declare global {
  interface Window {
    ethereum?: any;
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      connect: () => Promise<void>;
      getPublicKey: () => Promise<string>;
      signTransaction: (transaction: any) => Promise<any>;
    };
  }
} 