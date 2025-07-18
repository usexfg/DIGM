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
    
    // Rabet API integration with better error handling
    try {
      // Check if already connected - try multiple possible methods
      let isConnected = false;
      if (typeof rabetApi.isConnected === 'function') {
        isConnected = await rabetApi.isConnected();
      } else if (typeof rabetApi.connected === 'boolean') {
        isConnected = rabetApi.connected;
      } else if (typeof rabetApi.getConnectionStatus === 'function') {
        isConnected = await rabetApi.getConnectionStatus();
      }
      console.log('Already connected:', isConnected);
      
      if (!isConnected) {
        console.log('Connecting to Rabet wallet...');
        // Try different connection methods
        if (typeof rabetApi.connect === 'function') {
          await rabetApi.connect();
        } else if (typeof rabetApi.requestConnection === 'function') {
          await rabetApi.requestConnection();
        } else if (typeof rabetApi.enable === 'function') {
          await rabetApi.enable();
        }
        console.log('Connected to Rabet wallet');
      }

      // Get public key - try multiple possible methods
      console.log('Getting public key...');
      let publicKey = null;
      
      if (typeof rabetApi.getPublicKey === 'function') {
        publicKey = await rabetApi.getPublicKey();
      } else if (typeof rabetApi.getAccountId === 'function') {
        publicKey = await rabetApi.getAccountId();
      } else if (typeof rabetApi.getAddress === 'function') {
        publicKey = await rabetApi.getAddress();
      } else if (typeof rabetApi.publicKey === 'string') {
        publicKey = rabetApi.publicKey;
      } else if (typeof rabetApi.accountId === 'string') {
        publicKey = rabetApi.accountId;
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
        message: error.message,
        stack: error.stack,
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
