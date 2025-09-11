const connectStellarWallet = async () => {
  try {
    console.log('Attempting to connect Stellar wallet (LOBSTR or Rabet)...');
    
    // Try to detect multiple wallet options
    let walletApi = null;
    let walletType = null;
    
    // Check for LOBSTR first
    if (window.lobstr || window.lobstrApi) {
      walletApi = window.lobstr || window.lobstrApi;
      walletType = 'LOBSTR';
      console.log('LOBSTR wallet detected');
    }
    // Check for Rabet if LOBSTR not found
    else if (window.rabet || window.rabetApi) {
      walletApi = window.rabet || window.rabetApi;
      walletType = 'Rabet';
      console.log('Rabet wallet detected');
    }
    
    if (!walletApi) {
      console.log('No wallet detected immediately, trying to trigger injection...');
      
      // Try to trigger wallet injection
      try {
        // Method 1: Try postMessage to trigger wallets
        window.postMessage({ type: 'LOBSTR_GET_PUBLIC_KEY' }, '*');
        window.postMessage({ type: 'RABET_GET_PUBLIC_KEY' }, '*');
        console.log('Sent postMessage to trigger wallet injection');
        
        // Method 2: Try to access wallets directly
        if (window.lobstr || window.lobstrApi) {
          walletApi = window.lobstr || window.lobstrApi;
          walletType = 'LOBSTR';
          console.log('LOBSTR API found after direct access');
        } else if (window.rabet || window.rabetApi) {
          walletApi = window.rabet || window.rabetApi;
          walletType = 'Rabet';
          console.log('Rabet API found after direct access');
        }
        
        // Method 3: Check for any wallet-related properties
        const allProps = Object.keys(window);
        const walletProps = allProps.filter(key => 
          key.toLowerCase().includes('lobstr') || 
          key.toLowerCase().includes('rabet') ||
          key.toLowerCase().includes('stellar') ||
          key.toLowerCase().includes('wallet') ||
          key.toLowerCase().includes('signer')
        );
        console.log('Wallet-related properties:', walletProps);
        
      } catch (e) {
        console.log('Error checking for wallets:', e);
      }
      
      // Wait a bit and check again
      if (!walletApi) {
        console.log('Waiting for wallet to inject...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (window.lobstr || window.lobstrApi) {
          walletApi = window.lobstr || window.lobstrApi;
          walletType = 'LOBSTR';
        } else if (window.rabet || window.rabetApi) {
          walletApi = window.rabet || window.rabetApi;
          walletType = 'Rabet';
        }
      }
    }
    
    if (!walletApi) {
      console.error('No Stellar wallet detected. Please ensure LOBSTR or Rabet is installed and enabled.');
      alert('No Stellar wallet detected. Please:\n\n1. Install LOBSTR Signer Extension from https://lobstr.co/signer-extension/\n   OR\n2. Install Rabet wallet from https://rabet.io/\n\n3. Make sure the wallet is enabled in your browser extensions\n4. Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)\n5. Check if the wallet has permission to access this site');
      return;
    }

    console.log(`${walletType} wallet detected! Attempting to connect...`);
    console.log('Wallet API object:', walletApi);
    console.log('Available methods:', Object.keys(walletApi));
    
    // Wallet API integration with better error handling
    try {
      // Check if already connected - try multiple possible methods
      let isConnected = false;
      if (typeof walletApi.isConnected === 'function') {
        isConnected = await walletApi.isConnected();
      } else if (typeof walletApi.connected === 'boolean') {
        isConnected = walletApi.connected;
      } else if (typeof walletApi.getConnectionStatus === 'function') {
        isConnected = await walletApi.getConnectionStatus();
      }
      console.log('Already connected:', isConnected);
      
      if (!isConnected) {
        console.log(`Connecting to ${walletType} wallet...`);
        // Try different connection methods
        if (typeof walletApi.connect === 'function') {
          await walletApi.connect();
        } else if (typeof walletApi.requestConnection === 'function') {
          await walletApi.requestConnection();
        } else if (typeof walletApi.enable === 'function') {
          await walletApi.enable();
        }
        console.log(`Connected to ${walletType} wallet`);
      }

      // Get public key - try multiple possible methods
      console.log('Getting public key...');
      let publicKey = null;
      
      if (typeof walletApi.getPublicKey === 'function') {
        publicKey = await walletApi.getPublicKey();
      } else if (typeof walletApi.getAccountId === 'function') {
        publicKey = await walletApi.getAccountId();
      } else if (typeof walletApi.getAddress === 'function') {
        publicKey = await walletApi.getAddress();
      } else if (typeof walletApi.publicKey === 'string') {
        publicKey = walletApi.publicKey;
      } else if (typeof walletApi.accountId === 'string') {
        publicKey = walletApi.accountId;
      }
      
      console.log('Public key received:', publicKey);
      
      if (!publicKey) {
        throw new Error(`Failed to get public key from ${walletType} wallet. Available methods: ` + Object.keys(walletApi).join(', '));
      }
      
      setStellarPublicKey(publicKey);
      setStellarAddress(publicKey); // Stellar addresses are the public key
      
    } catch (error) {
      console.error(`Failed to connect to ${walletType} wallet:`, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        walletApi: walletApi,
        availableMethods: Object.keys(walletApi || {})
      });
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to connect Stellar wallet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert('Failed to connect Stellar wallet: ' + errorMessage);
  }
};
