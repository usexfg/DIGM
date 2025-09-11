  const connectStellarWallet = async () => {
    try {
      console.log('Attempting to connect Stellar wallet (Rabbit)...');
      
      // Try to detect Rabbit wallet
      let rabbitApi = window.rabbit || window.rabbitApi;
      
      if (!rabbitApi) {
        console.log('Rabbit wallet not detected, trying alternative methods...');
        
        // Try to trigger Rabbit injection
        try {
          // Method 1: Try postMessage to trigger Rabbit
          window.postMessage({ type: 'RABBIT_GET_PUBLIC_KEY' }, '*');
          console.log('Sent postMessage to trigger Rabbit wallet');
          
          // Method 2: Try to access Rabbit directly
          if (window.rabbit) {
            console.log('Rabbit API found after direct access');
            rabbitApi = window.rabbit;
          } else if (window.rabbitApi) {
            console.log('Rabbit API found after direct access');
            rabbitApi = window.rabbitApi;
          }
          
          // Method 3: Check for any wallet-related properties
          const allProps = Object.keys(window);
          const walletProps = allProps.filter(key => 
            key.toLowerCase().includes('rabbit') || 
            key.toLowerCase().includes('stellar') ||
            key.toLowerCase().includes('wallet')
          );
          console.log('Wallet-related properties:', walletProps);
          
        } catch (e) {
          console.log('Error checking for Rabbit wallet:', e);
        }
        
        // Wait a bit and check again
        if (!rabbitApi) {
          console.log('Waiting for Rabbit wallet to inject...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          rabbitApi = window.rabbit || window.rabbitApi;
        }
      }
      
      if (!rabbitApi) {
        console.error('Rabbit wallet not detected. Please ensure Rabbit wallet is installed and enabled.');
        alert('Rabbit wallet not detected. Please:\n\n1. Install Rabbit wallet from https://rabbitwallet.io/\n2. Make sure Rabbit is enabled in your browser extensions\n3. Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)\n4. Check if Rabbit has permission to access this site');
        return;
      }

      console.log('Rabbit wallet detected! Attempting to connect...');
      
      // Try to connect to Rabbit wallet
      try {
        // Check if already connected
        const isConnected = await rabbitApi.isConnected?.() || false;
        console.log('Already connected:', isConnected);
        
        if (!isConnected) {
          console.log('Connecting to Rabbit wallet...');
          await rabbitApi.connect?.();
          console.log('Connected to Rabbit wallet');
        }

        // Get public key
        console.log('Getting public key...');
        const publicKey = await rabbitApi.getPublicKey?.() || await rabbitApi.getAccountId?.();
        console.log('Public key received:', publicKey);
        
        if (!publicKey) {
          throw new Error('Failed to get public key from Rabbit wallet');
        }
        
        setStellarPublicKey(publicKey);
        setStellarAddress(publicKey); // Stellar addresses are the public key
        
      } catch (error) {
        console.error('Failed to connect to Rabbit wallet:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Failed to connect Stellar wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Failed to connect Stellar wallet: ' + errorMessage);
    }
  };
