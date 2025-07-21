import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface PremiumAccessProps {
  onClose?: () => void;
  isModal?: boolean;
}

const PremiumAccess: React.FC<PremiumAccessProps> = ({ onClose, isModal = false }) => {
  const { evmAddress, stellarAddress } = useWallet();
  const [heatBalance, setHeatBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showMintModal, setShowMintModal] = useState(false);


  useEffect(() => {
    checkPremiumStatus();
  }, [evmAddress, stellarAddress]);

  const checkPremiumStatus = async () => {
    setIsChecking(true);
    try {
      // Mock balance check - in real implementation this would query the blockchain
      const mockHeatBalance = Math.random() * 10000; // Random balance between 0-10000 HEAT for demo
      
      setHeatBalance(mockHeatBalance);
      
      // Premium status: user has premium if they hold >= 8000 HEAT
      const premium = mockHeatBalance >= 8000;
      
      setHasPremium(premium);
      
      // Store premium status in localStorage for persistence
      localStorage.setItem('digm-premium', premium.toString());
      localStorage.setItem('digm-heat-balance', mockHeatBalance.toString());
      
    } catch (error) {
      console.error('Failed to check premium status:', error);
      setHasPremium(false);
    } finally {
      setIsChecking(false);
    }
  };

  const refreshBalance = async () => {
    setIsLoading(true);
    await checkPremiumStatus();
    setIsLoading(false);
  };

  const getPremiumFeatures = () => [
    {
      title: '🎵 Unlimited Streaming',
      description: 'Stream any track without restrictions',
      icon: '🎧'
    },
    {
      title: '🎧 Premium Audio Quality',
      description: 'Access to high-fidelity audio streams',
      icon: '🎵'
    },
    {
      title: 'PARA Artist / Listener Rewards',
      description: 'Earn PARA tokens for listening to music',
      icon: <img src="/assets/para.png" alt="PARA" className="inline-block w-6 h-6 rounded-full align-middle" />
    },
    {
      title: ' Remember owning purchased audio?',
      description: 'We do too, DIGM it! Welcome back to ownership of digital tracks AND physical albums (using Fuego L1\'s simple private messaging with artist/seller for shipping details) that you purchase on DIGM.',

      icon: '💿'
    },
    {
      title: '💎 Exclusive Content',
      description: 'Artists decide their own exclusivity to premium content and/or pre-release using HEAT, PARA, or XF₲ paywalls; plus limit only to other DIGM holders, or even create & use your own NFTs on COLD L3* (roadmap).',
      icon: '👩‍🎤'
    },
    {
      title: '🌊 Freedom isnt free - the cost is responsibility',
      description: 'DIGM is a decentralized platform- there is no "customer support" because the platform has no "customers". We\'re a community of artists/musicians, music lovers, and developers who all help one another. Vive la révolution! ',
      icon: '🧞‍♀️'
    }
  ];

  if (isModal && !onClose) {
    return null;
  }

  const content = (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="text-6xl gradient-text-queen" style={{ fontSize: 'xxx-large' }}>♛</div>
        <h1 className="text-4xl font-bold gradient-text">Premium Access</h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Unlock premium features by holding 8,000 HEAT tokens
        </p>
      </div>

      {/* Token Balances & Premium Status */}
      <div className="glass p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Your HEAT Balance</h2>
            <p className="text-gray-400 text-sm">Hold 8,000 HEAT tokens for premium access</p>
          </div>
          <button
            onClick={refreshBalance}
            disabled={isLoading}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Premium Status Banner */}
        {!isChecking && (
          <div className={`glass p-4 rounded-xl mb-6 border ${
            hasPremium ? 'border-green-500/40 bg-green-900/20' : 'border-red-500/40 bg-red-900/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{hasPremium ? '♛' : '🔒'}</span>

                <div>
                  <h3 className={`font-semibold ${hasPremium ? 'gradient-text-green' : 'text-red-400'}`}>
                    {hasPremium ? 'Premium Access Active' : 'Premium Access Required'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {hasPremium 
                      ? 'You qualify with HEAT tokens'
                      : 'Hold 8,000 HEAT tokens to unlock premium features'
                    }
                  </p>
                </div>
              </div>
              <div className={`text-sm px-3 py-1 rounded-full ${
                hasPremium ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
              }`}>
                {hasPremium ? '✅ ACTIVE' : '❌ LOCKED'}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-4">
              <img src="/assets/heatlogo.png" alt="HEAT Logo" className="w-12 h-12 object-contain" />

              <div>
                <h3 className="text-white font-semibold text-lg">HEAT Balance</h3>
                <p className="text-gray-400 text-sm">COLD L3 Token</p>
              </div>
            </div>
            
            {isChecking ? (
              <div className="text-center py-8">
                <div className="text-2xl text-fuchsia-400">Checking balance...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold gradient-text mb-2">{heatBalance.toLocaleString()} HEAT</div>
                  <div className={`text-sm px-3 py-1 rounded-full inline-block ${
                    heatBalance >= 8000 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-red-600/20 text-red-400'
                  }`}>
                    {heatBalance >= 8000 ? '✅ HEAT Premium' : '❌ Need 8,000 HEAT'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Required: 8,000 HEAT</div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        heatBalance >= 8000 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((heatBalance / 8000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass p-6 rounded-xl">
            <h3 className="text-white font-semibold text-lg mb-4">How to Get Premium Access</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-yellow-400 font-semibold mb-2">HEAT Tokens</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400">•</span>
                    <span className="text-gray-300">Get HEAT by burning equivalent amount of XFG atomic units (heat)</span>

                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400">•</span>
                    <span className="text-gray-300">Use COLD L3 wallet</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400">•</span>
                    <span className="text-gray-300">Hold 8,000+ HEAT tokens</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-300">
                💡 <strong>Note:</strong> XFG coin premium access is available in the desktop DIGM app with integrated Fuego Network wallet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Features */}
      <div className="glass p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Premium Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getPremiumFeatures().map((feature, index) => (
            <div key={index} className={`glass p-6 rounded-xl transition-all duration-300 ${
              hasPremium ? 'border-fuchsia-500/40' : 'border-gray-600/40'
            } border`}>
              <div className="text-3xl mb-3 flex items-center justify-center">
                {typeof feature.icon === 'object' ? (
                  feature.icon
                ) : (
                  <span>{feature.icon}</span>
                )}
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">
                {feature.description.includes('PARA tokens') ? (
                  <>
                    {feature.description.replace('PARA tokens', '')}
                    <img 
                      src="/assets/para.png" 
                      alt="PARA" 
                      className="inline-block w-4 h-4 rounded-full mx-1"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    tokens
                  </>
                ) : (
                  feature.description
                )}
              </p>
              {!hasPremium && (
                <div className="mt-3">
                  <span className="text-xs text-red-400">🔒 Requires Premium</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Token Information */}
      <div className="glass p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">About HEAT Tokens</h2>
          <p className="text-gray-400">Mint or buy HEAT tokens to unlock premium access on DIGM</p>
        </div>
        
        <div className="glass p-6 rounded-xl border border-yellow-500/20 max-w-2xl mx-auto">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/assets/heatlogo.png" alt="HEAT Logo" className="w-10 h-10 object-contain rounded-full bg-black" />

            </div>
            <h3 className="text-white font-semibold text-lg">HEAT Token</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Networks:</span>
              <span className="text-white">COLD L3 (Arbitrum), Solana</span>

            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Asset Type:</span>
              <span className="text-white">Proof Of XFG Burn Token</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Premium Requirement:</span>
              <span className="text-white">8,000 HEAT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Use Case:</span>
              <span className="text-white">Premium Access, COLD-L3 Gas</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-900/20 rounded-lg">
          <h3 className="text-white font-semibold mb-2">Benefits of Premium Access</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">✓</span>
                <span className="text-gray-300">Unlock streaming features</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">✓</span>
                <span className="text-gray-300">Earn <img src="/assets/para.png" alt="PARA" className="inline-block w-4 h-4 rounded-full" /> while 🎧 listening</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">✓</span>
                <span className="text-gray-300">Access exclusive content</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">✓</span>
                <span className="text-gray-300">Privacy & Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">✓</span>
                <span className="text-gray-300">True Ownership</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">✓</span>
                <span className="text-gray-300">High-quality audio</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!hasPremium && (
        <div className="glass p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-4">Ready to Go Premium?</h3>
          <p className="text-gray-400 mb-6">

            Mint or buy HEAT tokens to unlock premium features on DIGM
          </p>
          <div className="max-w-md mx-auto">
            <div className="glass p-6 rounded-xl border border-yellow-500/20">
              <h4 className="text-yellow-400 font-semibold mb-2">HEAT Minting</h4>
              <p className="text-gray-400 text-sm mb-4">Mint 8,000+ HEAT tokens</p>

              <button className="btn-secondary w-full">
                🔥 Acquire and hold HEAT 
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mint HEAT Modal */}
      {showMintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl p-8 max-w-lg w-full relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
              onClick={() => setShowMintModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold gradient-text mb-4 text-center">Mint HEAT with XFG</h2>
            <ol className="list-decimal list-inside text-gray-200 space-y-2 mb-4">
              <li>
                <strong>Send a deposit burn transaction</strong> from your XFG wallet to the official burn address:
                <div className="bg-gray-800 rounded p-2 my-2 text-yellow-300 font-mono text-sm select-all">
                  XFG_BURN_ADDRESS_HERE
                </div>
                (Replace with the actual burn address)
              </li>
              <li>
                <strong>Generate a burn CLI proofer</strong> using the Fuego CLI tool:
                <div className="bg-gray-800 rounded p-2 my-2 text-green-300 font-mono text-sm select-all">
                  fuego-cli prove-burn --txid &lt;your_txid&gt;
                </div>
                This will output a proof string.
              </li>
              <li>
                <strong>Paste your burn proof below</strong> and submit it for verification:
              </li>
            </ol>
            <textarea
              className="w-full p-2 rounded bg-gray-900 text-white border border-gray-700 mb-4"
              rows={4}
              placeholder="Paste your burn proof here..."
            />
            <button className="btn-primary w-full" disabled>
              Submit Proof (Coming Soon)
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Your proof will be verified and HEAT tokens minted to your wallet.
            </p>
          </div>
        </div>
      )}


      {hasPremium && (
        <div className="card-success text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-bold gradient-text-green mb-2">Premium Active!</h3>
          <p className="text-gray-400 mb-4">
            You have access to all premium features. Enjoy unlimited streaming and exclusive content!
          </p>
          <div className="flex justify-center">
            <button className="btn-success">
              🎵 Start 🎧 Listening
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <h3 className="gradient-text text-2xl font-bold">Premium Access</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default PremiumAccess; 