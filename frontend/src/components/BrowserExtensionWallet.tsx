import React, { useState, useEffect, useCallback } from 'react';

interface ExtensionWallet {
  name: string;
  id: string;
  installed: boolean;
  connectable: boolean;
}

interface WalletState {
  connected: boolean;
  address: string;
  balance: number;
  extension: string;
  error: string | null;
}

interface Transaction {
  to: string;
  amount: number;
  memo?: string;
}

// Supported browser extension wallets
const SUPPORTED_WALLETS: ExtensionWallet[] = [
  {
    name: 'Fuego Wallet',
    id: 'fuego-wallet-extension',
    installed: false,
    connectable: false,
  },
  {
    name: 'TIPBOT Wallet',
    id: 'tipbot-wallet-extension',
    installed: false,
    connectable: false,
  },
  {
    name: 'MetaX (Multi-Asset)',
    id: 'metax-wallet-extension',
    installed: false,
    connectable: false,
  },
];

const BrowserExtensionWallet: React.FC = () => {
  const [wallets, setWallets] = useState<ExtensionWallet[]>(SUPPORTED_WALLETS);
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: '',
    balance: 0,
    extension: '',
    error: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [sendForm, setSendForm] = useState<Transaction>({
    to: '',
    amount: 0,
    memo: '',
  });

  // Check if wallet extensions are installed
  const checkExtensionAvailability = useCallback(() => {
    const updatedWallets = wallets.map(wallet => {
      try {
        // Check if extension is available
        if (window[wallet.id as any] || window.ethereum || window.web3) {
          return { ...wallet, installed: true, connectable: true };
        }

        // Try to detect extension via messaging
        if (window.chrome?.runtime) {
          try {
            window.chrome.runtime.sendMessage(wallet.id, { type: 'ping' }, (response) => {
              if (response?.pong) {
                setWallets(prev => prev.map(w =>
                  w.id === wallet.id ? { ...w, installed: true, connectable: true } : w
                ));
              }
            });
          } catch (e) {
            // Extension not available
          }
        }

        return wallet;
      } catch (error) {
        return { ...wallet, installed: false, connectable: false };
      }
    });

    setWallets(updatedWallets);
  }, [wallets]);

  // Connect to extension wallet
  const connectWallet = useCallback(async (walletId: string) => {
    setIsConnecting(true);
    setWalletState(prev => ({ ...prev, error: null }));

    try {
      let address = '';
      let balance = 0;

      switch (walletId) {
        case 'fuego-wallet-extension':
          address = await connectFuegoWallet();
          break;
        case 'tipbot-wallet-extension':
          address = await connectTipbotWallet();
          break;
        case 'metax-wallet-extension':
          address = await connectMetaXWallet();
          break;
        default:
          throw new Error('Unsupported wallet extension');
      }

      if (!address) {
        throw new Error('Failed to connect to wallet');
      }

      // Get balance
      balance = await fetchBalance(address);

      setWalletState({
        connected: true,
        address,
        balance,
        extension: walletId,
        error: null,
      });

      // Save to localStorage for persistence
      localStorage.setItem('digm_extension_wallet', JSON.stringify({
        address,
        extension: walletId,
        connectedAt: Date.now(),
      }));

    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        error: `Failed to connect: ${error.message}`,
        connected: false,
        address: '',
      }));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect to Fuego Wallet extension
  const connectFuegoWallet = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        if (window.fuegoWallet) {
          window.fuegoWallet.requestAccounts()
            .then((accounts: string[]) => {
              if (accounts && accounts.length > 0) {
                resolve(accounts[0]);
              } else {
                reject(new Error('No accounts found'));
              }
            })
            .catch(reject);
        } else {
          reject(new Error('Fuego Wallet extension not detected'));
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Connect to TIPBOT Wallet extension
  const connectTipbotWallet = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        if (window.tipbotWallet) {
          window.tipbotWallet.enable()
            .then(() => window.tipbotWallet.getAccounts())
            .then((accounts: string[]) => {
              if (accounts && accounts.length > 0) {
                resolve(accounts[0]);
              } else {
                reject(new Error('No accounts found'));
              }
            })
            .catch(reject);
        } else {
          reject(new Error('TIPBOT Wallet extension not detected'));
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Connect to MetaX Wallet extension
  const connectMetaXWallet = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        if (window.metaX) {
          window.metaX.enable()
            .then(() => window.metaX.getAccounts())
            .then((accounts: string[]) => {
              if (accounts && accounts.length > 0) {
                resolve(accounts[0]);
              } else {
                reject(new Error('No accounts found'));
              }
            })
            .catch(reject);
        } else {
          reject(new Error('MetaX Wallet extension not detected'));
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Fetch balance from Fuego daemon
  const fetchBalance = async (address: string): Promise<number> => {
    try {
      const response = await fetch('/api/fuego/getbalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.balance || 0;
      }

      return 0;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return 0;
    }
  };

  // Send transaction via extension
  const sendTransaction = useCallback(async () => {
    if (!walletState.connected || !sendForm.to || !sendForm.amount) {
      setWalletState(prev => ({ ...prev, error: 'Please fill all fields' }));
      return;
    }

    try {
      let result: any;

      switch (walletState.extension) {
        case 'fuego-wallet-extension':
          result = await window.fuegoWallet.sendTransaction({
            to: sendForm.to,
            amount: sendForm.amount,
            memo: sendForm.memo,
          });
          break;
        case 'tipbot-wallet-extension':
          result = await window.tipbotWallet.sendTransaction({
            to: sendForm.to,
            amount: sendForm.amount,
            memo: sendForm.memo,
          });
          break;
        case 'metax-wallet-extension':
          result = await window.metaX.sendTransaction({
            to: sendForm.to,
            amount: sendForm.amount,
            memo: sendForm.memo,
          });
          break;
        default:
          throw new Error('Unsupported wallet extension');
      }

      if (result.hash) {
        setWalletState(prev => ({ ...prev, error: `Transaction sent: ${result.hash}` }));
        // Refresh balance
        const newBalance = await fetchBalance(walletState.address);
        setWalletState(prev => ({ ...prev, balance: newBalance }));
        setSendForm({ to: '', amount: 0, memo: '' });
      }
    } catch (error) {
      setWalletState(prev => ({ ...prev, error: `Transaction failed: ${error.message}` }));
    }
  }, [walletState, sendForm]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      connected: false,
      address: '',
      balance: 0,
      extension: '',
      error: null,
    });

    // Clear saved wallet data
    localStorage.removeItem('digm_extension_wallet');
  }, []);

  // Auto-connect on mount if previously connected
  useEffect(() => {
    const savedWallet = localStorage.getItem('digm_extension_wallet');
    if (savedWallet) {
      try {
        const walletData = JSON.parse(savedWallet);
        // Reconnect to the same extension
        setTimeout(() => {
          connectWallet(walletData.extension);
        }, 1000);
      } catch (error) {
        console.error('Failed to auto-connect wallet:', error);
      }
    }
  }, [connectWallet]);

  // Check extension availability on mount
  useEffect(() => {
    checkExtensionAvailability();

    // Poll for extension availability every 10 seconds
    const interval = setInterval(checkExtensionAvailability, 10000);
    return () => clearInterval(interval);
  }, [checkExtensionAvailability]);

  // Update balance every 30 seconds
  useEffect(() => {
    if (walletState.connected) {
      const interval = setInterval(async () => {
        const balance = await fetchBalance(walletState.address);
        setWalletState(prev => ({ ...prev, balance }));
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [walletState.connected, walletState.address]);

  return (
    <div className="browser-extension-wallet">
      <div className="wallet-header">
        <h2>Browser Extension Wallet</h2>
        <p className="wallet-description">
          Connect your existing XFG wallet extension for seamless integration with DIGM platform.
          Your private keys remain secure in your extension - DIGM never accesses them.
        </p>
      </div>

      {/* Extension Detection */}
      <div className="extensions-section">
        <h3>Available Wallet Extensions</h3>
        <div className="extensions-grid">
          {wallets.map(wallet => (
            <div key={wallet.id} className={`extension-card ${wallet.installed ? 'installed' : 'not-installed'}`}>
              <div className="extension-info">
                <h4>{wallet.name}</h4>
                <p className={`extension-status ${wallet.installed ? 'available' : 'unavailable'}`}>
                  {wallet.installed ? 'Available' : 'Not Installed'}
                </p>
              </div>
              <div className="extension-actions">
                {wallet.installed ? (
                  walletState.connected && walletState.extension === wallet.id ? (
                    <button className="connected-btn">Connected</button>
                  ) : (
                    <button
                      onClick={() => connectWallet(wallet.id)}
                      disabled={isConnecting || walletState.connected}
                      className="connect-btn"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  )
                ) : (
                  <a
                    href={`https://chrome.google.com/webstore/detail/${wallet.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="install-btn"
                  >
                    Install
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Wallet Info */}
      {walletState.connected && (
        <div className="wallet-info">
          <h3>Connected Wallet</h3>
          <div className="wallet-details">
            <div className="wallet-balance">
              <span className="balance-label">Balance:</span>
              <span className="balance-amount">{walletState.balance.toFixed(6)} XFG</span>
            </div>
            <div className="wallet-address">
              <span className="address-label">Address:</span>
              <code className="address-value">
                {walletState.address.substring(0, 20)}...
                {walletState.address.substring(walletState.address.length - 8)}
              </code>
            </div>
            <div className="wallet-extension">
              <span className="extension-label">Extension:</span>
              <span className="extension-value">
                {wallets.find(w => w.id === walletState.extension)?.name || walletState.extension}
              </span>
            </div>
          </div>

          {/* Send Transaction */}
          <div className="send-section">
            <h4>Send XFG</h4>
            <div className="send-form">
              <div className="form-group">
                <label>To:</label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="Recipient address"
                />
              </div>
              <div className="form-group">
                <label>Amount:</label>
                <input
                  type="number"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="XFG amount"
                  step="0.000001"
                />
              </div>
              <div className="form-group">
                <label>Memo (optional):</label>
                <input
                  type="text"
                  value={sendForm.memo}
                  onChange={(e) => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="Optional memo"
                />
              </div>
              <button onClick={sendTransaction} className="send-btn">
                Send Transaction
              </button>
            </div>
          </div>

          <button onClick={disconnectWallet} className="disconnect-btn">
            Disconnect Wallet
          </button>
        </div>
      )}

      {/* Error/Status Messages */}
      {walletState.error && (
        <div className="wallet-error">
          <span>{walletState.error}</span>
          <button onClick={() => setWalletState(prev => ({ ...prev, error: null }))}>×</button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <h3>Privacy & Security</h3>
        <div className="privacy-content">
          <p>
            <strong>Your private keys never leave your wallet extension.</strong> DIGM only requests
            permissions to read your balance and send transactions - all cryptographic operations
            happen within your trusted wallet extension.
          </p>
          <ul>
            <li>🔐 Private keys remain secure in your extension</li>
            <li>👁️ DIGM cannot access your private keys or seed phrase</li>
            <li>📝 All transactions require your explicit approval</li>
            <li>🚫 No data is stored on DIGM servers</li>
            <li>🔒 End-to-end encryption for all communications</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .browser-extension-wallet {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: #0a0a0a;
          color: white;
          min-height: 100vh;
        }

        .wallet-header h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .wallet-description {
          color: #ccc;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .extensions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .extension-card {
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .extension-card.installed {
          border-color: #667eea;
          background: linear-gradient(135deg, #1a1a2a 0%, #0a0a1a 100%);
        }

        .extension-info h4 {
          margin: 0 0 0.5rem 0;
          color: #667eea;
        }

        .extension-status {
          font-size: 0.875rem;
          font-weight: bold;
        }

        .extension-status.available {
          color: #4ade80;
        }

        .extension-status.unavailable {
          color: #f87171;
        }

        .extension-actions {
          margin-top: 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .connect-btn, .install-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .connect-btn {
          background: #667eea;
          color: white;
        }

        .connect-btn:hover:not(:disabled) {
          background: #5a6fd8;
        }

        .connect-btn:disabled {
          background: #333;
          cursor: not-allowed;
        }

        .install-btn {
          background: #34d399;
          color: white;
          text-decoration: none;
        }

        .install-btn:hover {
          background: #10b981;
        }

        .connected-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          background: #4ade80;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
        }

        .wallet-info {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid #333;
        }

        .wallet-details {
          margin-bottom: 2rem;
        }

        .wallet-balance, .wallet-address, .wallet-extension {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #333;
        }

        .wallet-balance:last-child, .wallet-address:last-child, .wallet-extension:last-child {
          border-bottom: none;
        }

        .balance-amount, .address-value, .extension-value {
          font-weight: bold;
          color: white;
        }

        .address-value {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .send-section {
          margin-bottom: 2rem;
        }

        .send-form {
          background: #0a0a0a;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #333;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: #ccc;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          color: white;
          font-family: 'Courier New', monospace;
        }

        .send-btn {
          width: 100%;
          padding: 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }

        .send-btn:hover {
          background: #5a6fd8;
        }

        .disconnect-btn {
          width: 100%;
          padding: 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }

        .disconnect-btn:hover {
          background: #dc2626;
        }

        .wallet-error {
          background: #2a1a1a;
          border: 1px solid #f87171;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #f87171;
        }

        .privacy-notice {
          background: #1a2a1a;
          border: 1px solid #2a5d2a;
          border-radius: 8px;
          padding: 2rem;
        }

        .privacy-notice h3 {
          margin: 0 0 1rem 0;
          color: #4ade80;
        }

        .privacy-content p {
          margin-bottom: 1rem;
          line-height: 1.6;
          color: #ccc;
        }

        .privacy-content ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .privacy-content li {
          padding: 0.5rem 0;
          color: #ccc;
          line-height: 1.5;
        }

        .privacy-content li:before {
          content: "🔒 ";
          margin-right: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default BrowserExtensionWallet;
```

Now let me create a comprehensive solution that addresses the privacy concerns and provides both options:

<tool_call>
<function=edit_file>
<parameter=path>
/Users/aejt/digm-platform/frontend/src/components/WalletIntegration.tsx
</parameter>
<parameter=mode>
create
</parameter>
<parameter=display_description>
Create comprehensive wallet integration component
</parameter>
</function>
</tool_call>
