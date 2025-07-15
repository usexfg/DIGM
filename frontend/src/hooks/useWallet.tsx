import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

// Type declaration for Chrome extension API
declare global {
  interface Window {
    chrome?: any;
    ethereum?: any;
    lobstr?: any;
    rabet?: any;
    lobstrApi?: any;
    rabetApi?: any;
  }
}

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
      console.log('Attempting to connect Stellar wallet (Rabet)...');
      
      // Try to detect Rabet wallet
      let rabetApi = window.rabet || window.rabetApi;
      
      if (!rabetApi) {
        console.log('Rabet wallet not detected, trying alternative methods...');
        
        // Try to trigger Rabet injection
        try {
          // Method 1: Try postMessage to trigger Rabet
          window.postMessage({ type: 'RABET_GET_PUBLIC_KEY' }, '*');
          console.log('Sent postMessage to trigger Rabet wallet');
          
          // Method 2: Try to access Rabet directly
          if (window.rabet) {
            console.log('Rabet API found after direct access');
            rabetApi = window.rabet;
          } else if (window.rabetApi) {
            console.log('Rabet API found after direct access');
            rabetApi = window.rabetApi;
          }
          
          // Method 3: Check for any wallet-related properties
          const allProps = Object.keys(window);
          const walletProps = allProps.filter(key => 
            key.toLowerCase().includes('rabet') || 
            key.toLowerCase().includes('stellar') ||
            key.toLowerCase().includes('wallet')
          );
          console.log('Wallet-related properties:', walletProps);
          
        } catch (e) {
          console.log('Error checking for Rabet wallet:', e);
        }
        
        // Wait a bit and check again
        if (!rabetApi) {
          console.log('Waiting for Rabet wallet to inject...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          rabetApi = window.rabet || window.rabetApi;
        }
      }
      
      if (!rabetApi) {
        console.error('Rabet wallet not detected. Please ensure Rabet wallet is installed and enabled.');
        alert('Rabet wallet not detected. Please:\n\n1. Install Rabet wallet from https://rabet.io/\n2. Make sure Rabet is enabled in your browser extensions\n3. Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)\n4. Check if Rabet has permission to access this site');
        return;
      }

      console.log('Rabet wallet detected! Attempting to connect...');
      console.log('Rabet API object:', rabetApi);
      console.log('Available methods:', Object.keys(rabetApi));
      
      // Rabet API integration
      try {
        // Check if already connected/unlocked
        let isUnlocked = false;
        if (typeof rabetApi.isUnlocked === 'function') {
          isUnlocked = await rabetApi.isUnlocked();
        } else if (typeof rabetApi.unlocked === 'boolean') {
          isUnlocked = rabetApi.unlocked;
        }
        console.log('Already unlocked:', isUnlocked);
        
        if (!isUnlocked) {
          console.log('Connecting to Rabet wallet...');
          // Try different connection methods
          if (typeof rabetApi.connect === 'function') {
            await rabetApi.connect();
          } else if (typeof rabetApi.unlock === 'function') {
            await rabetApi.unlock();
          } else if (typeof rabetApi.enable === 'function') {
            await rabetApi.enable();
          }
          console.log('Connected to Rabet wallet');
        }

        // Get public key using Rabet's actual API methods
        console.log('Getting public key...');
        let publicKey = null;
        
        // Method 1: Try to get public key through a simple sign request
        try {
          console.log('Attempting to get public key through sign request...');
          
          // Create a simple operation to get the public key
          const dummyOperation = {
            type: 'allowTrust',
            trustor: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            asset: 'PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U-1',
            authorize: true
          };
          
          // Try to sign this operation to get the public key
          const signResult = await rabetApi.sign([dummyOperation]);
          console.log('Sign result:', signResult);
          
          if (signResult && signResult.publicKey) {
            publicKey = signResult.publicKey;
          } else if (signResult && signResult.accountId) {
            publicKey = signResult.accountId;
          }
        } catch (error) {
          console.log('Failed to get public key through sign:', error);
        }
        
        // Method 2: Try to get network info
        if (!publicKey && typeof rabetApi.getNetwork === 'function') {
          try {
            const network = await rabetApi.getNetwork();
            console.log('Network info:', network);
            
            // Check if network object contains public key
            if (network && network.publicKey) {
              publicKey = network.publicKey;
            } else if (network && network.accountId) {
              publicKey = network.accountId;
            }
          } catch (error) {
            console.log('Failed to get network info:', error);
          }
        }
        
        // Method 3: Check if public key is available as a property
        if (!publicKey) {
          if (rabetApi.publicKey) {
            publicKey = rabetApi.publicKey;
          } else if (rabetApi.accountId) {
            publicKey = rabetApi.accountId;
          } else if (rabetApi.address) {
            publicKey = rabetApi.address;
          }
        }
        
        // Method 4: Try to get public key through a payment operation
        if (!publicKey) {
          try {
            console.log('Attempting to get public key through payment operation...');
            
            const paymentOperation = {
              type: 'payment',
              destination: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
              asset: 'XLM',
              amount: '0.0000001'
            };
            
            const paymentResult = await rabetApi.sign([paymentOperation]);
            console.log('Payment sign result:', paymentResult);
            
            if (paymentResult && paymentResult.publicKey) {
              publicKey = paymentResult.publicKey;
            } else if (paymentResult && paymentResult.accountId) {
              publicKey = paymentResult.accountId;
            }
          } catch (error) {
            console.log('Failed to get public key through payment:', error);
          }
        }
        
        console.log('Public key received:', publicKey);
        
        if (!publicKey) {
          throw new Error('Failed to get public key from Rabet wallet. Available methods: ' + Object.keys(rabetApi).join(', '));
        }
        
        setStellarPublicKey(publicKey);
        setStellarAddress(publicKey); // Stellar addresses are the public key
        
      } catch (error) {
        console.error('Failed to connect to Rabet wallet:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          rabetApi: rabetApi,
          availableMethods: Object.keys(rabetApi || {})
        });
        
        throw error;
      }
      
    } catch (error) {
      console.error('Failed to connect Stellar wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Failed to connect Stellar wallet: ' + errorMessage);
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

      // Try to detect Rabet for auto-connect
      const rabetApi = window.rabet || window.rabetApi;
      if (rabetApi) {
        try {
          console.log('Auto-connecting Stellar wallet (Rabet)...');
          // Check if wallet is unlocked/connected
          const isUnlocked = await rabetApi.isUnlocked?.() || false;
          console.log('Stellar wallet auto-connect status:', isUnlocked);
          if (isUnlocked) {
            // Try to get public key through network info
            let publicKey = null;
            if (typeof rabetApi.getNetwork === 'function') {
              try {
                const network = await rabetApi.getNetwork();
                if (network && network.publicKey) {
                  publicKey = network.publicKey;
                } else if (network && network.accountId) {
                  publicKey = network.accountId;
                }
              } catch (error) {
                console.log('Failed to get network info for auto-connect:', error);
              }
            }
            
            // Fallback to direct properties
            if (!publicKey) {
              publicKey = rabetApi.publicKey || rabetApi.accountId || rabetApi.address;
            }
            
            if (publicKey) {
              console.log('Auto-connected Stellar public key:', publicKey);
              setStellarPublicKey(publicKey);
              setStellarAddress(publicKey);
            }
          }
        } catch (error) {
          console.error('Failed to auto-connect Rabet wallet:', error);
        }
      } else {
        console.log('Rabet API not available for auto-connect');
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