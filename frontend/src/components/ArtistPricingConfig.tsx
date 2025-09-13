import React, { useState, useEffect } from 'react';
import { pricingEngine, PricingStrategy } from '../utils/pricingEngine';

interface ArtistPricingConfigProps {
  albumId: string;
  artistId: string;
  onSave: (strategy: PricingStrategy) => void;
  onCancel: () => void;
}

const ArtistPricingConfig: React.FC<ArtistPricingConfigProps> = ({
  albumId,
  artistId,
  onSave,
  onCancel
}) => {
  const [strategy, setStrategy] = useState<PricingStrategy>({
    type: 'usd_target',
    basePriceUSD: 9.99,
    volatilityTolerance: 0.1,
    updateFrequency: 'daily',
    minPriceAtomic: 5000000,
    maxPriceAtomic: 20000000,
    lastUpdated: Date.now(),
    priceHistory: []
  });

  const [currentXFGPrice, setCurrentXFGPrice] = useState<number>(0.0001);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

  useEffect(() => {
    // Fetch current XFG price
    const fetchXFGPrice = async () => {
      try {
        const priceData = await pricingEngine.getCurrentXFGPrice();
        setCurrentXFGPrice(priceData.priceUSD);
      } catch (error) {
        console.error('Failed to fetch XFG price:', error);
      }
    };

    fetchXFGPrice();
  }, []);

  useEffect(() => {
    // Calculate current price based on strategy
    if (strategy.type === 'usd_target' && strategy.basePriceUSD) {
      const priceAtomic = Math.round((strategy.basePriceUSD / currentXFGPrice) * 10000000);
      setCalculatedPrice(priceAtomic);
    } else if (strategy.type === 'fixed_xfg' && strategy.fixedPriceAtomic) {
      setCalculatedPrice(strategy.fixedPriceAtomic);
    }
  }, [strategy, currentXFGPrice]);

  const handleStrategyChange = (type: 'fixed_xfg' | 'usd_target') => {
    setStrategy(prev => ({
      ...prev,
      type,
      // Reset relevant fields when switching
      ...(type === 'fixed_xfg' ? {
        fixedPriceAtomic: calculatedPrice || 10000000,
        basePriceUSD: undefined
      } : {
        basePriceUSD: 9.99,
        fixedPriceAtomic: undefined
      })
    }));
  };

  const handleSave = () => {
    onSave(strategy);
  };

  const formatXFGAmount = (atomic: number): string => {
    return (atomic / 10000000).toFixed(4);
  };

  const formatUSD = (atomic: number): string => {
    const xfgAmount = atomic / 10000000;
    const usdAmount = xfgAmount * currentXFGPrice;
    return usdAmount.toFixed(2);
  };

  return (
    <div className="glass p-8 rounded-2xl max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-4">Album Pricing Configuration</h2>
        <p className="text-gray-400">
          Choose how your album price will be managed. XFG is the only payment method supported by the platform.
        </p>
      </div>

      {/* Current XFG Price */}
      <div className="glass p-4 rounded-xl mb-6 border border-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-blue-400 font-semibold">Current XFG Price</h3>
            <p className="text-sm text-gray-400">Real-time market price</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">${currentXFGPrice.toFixed(6)}</div>
            <div className="text-sm text-gray-400">per XFG</div>
          </div>
        </div>
      </div>

      {/* Pricing Strategy Selection */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Pricing Strategy</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* USD Target Pricing */}
            <div 
              className={`glass p-6 rounded-xl border-2 cursor-pointer transition-all ${
                strategy.type === 'usd_target' 
                  ? 'border-green-500/50 bg-green-900/20' 
                  : 'border-gray-600/50 hover:border-gray-500/50'
              }`}
              onClick={() => handleStrategyChange('usd_target')}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  strategy.type === 'usd_target' ? 'bg-green-500 border-green-500' : 'border-gray-400'
                }`}></div>
                <h4 className="text-lg font-semibold text-white">USD Target Pricing</h4>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">
                Set a target USD price. XFG amount will automatically adjust based on market conditions.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Target USD Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999.99"
                    value={strategy.basePriceUSD || ''}
                    onChange={(e) => setStrategy(prev => ({ 
                      ...prev, 
                      basePriceUSD: parseFloat(e.target.value) || 0 
                    }))}
                    className="input-field w-full mt-1"
                    placeholder="9.99"
                  />
                </div>
                
                <div className="text-xs text-gray-400 space-y-1">
                  <p>✅ Price stays stable in USD</p>
                  <p>✅ Automatic market adjustments</p>
                  <p>⚠️ XFG amount varies with market</p>
                </div>
              </div>
            </div>

            {/* Fixed XFG Pricing */}
            <div 
              className={`glass p-6 rounded-xl border-2 cursor-pointer transition-all ${
                strategy.type === 'fixed_xfg' 
                  ? 'border-blue-500/50 bg-blue-900/20' 
                  : 'border-gray-600/50 hover:border-gray-500/50'
              }`}
              onClick={() => handleStrategyChange('fixed_xfg')}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  strategy.type === 'fixed_xfg' ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                }`}></div>
                <h4 className="text-lg font-semibold text-white">Fixed XFG Pricing</h4>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">
                Set a fixed XFG price. USD value will fluctuate with market conditions.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Fixed XFG Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={strategy.fixedPriceAtomic ? formatXFGAmount(strategy.fixedPriceAtomic) : ''}
                    onChange={(e) => setStrategy(prev => ({ 
                      ...prev, 
                      fixedPriceAtomic: Math.round(parseFloat(e.target.value) * 10000000) || 0 
                    }))}
                    className="input-field w-full mt-1"
                    placeholder="1.0000"
                  />
                </div>
                
                <div className="text-xs text-gray-400 space-y-1">
                  <p>✅ Fixed XFG amount</p>
                  <p>✅ Predictable for buyers</p>
                  <p>⚠️ USD value fluctuates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Advanced Settings</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-400">Volatility Tolerance</label>
              <select
                value={strategy.volatilityTolerance}
                onChange={(e) => setStrategy(prev => ({ 
                  ...prev, 
                  volatilityTolerance: parseFloat(e.target.value) 
                }))}
                className="input-field w-full mt-1"
              >
                <option value={0.05}>5% - Very Stable</option>
                <option value={0.1}>10% - Stable</option>
                <option value={0.15}>15% - Moderate</option>
                <option value={0.25}>25% - Volatile</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Maximum price change per update
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400">Update Frequency</label>
              <select
                value={strategy.updateFrequency}
                onChange={(e) => setStrategy(prev => ({ 
                  ...prev, 
                  updateFrequency: e.target.value as 'hourly' | 'daily' | 'weekly'
                }))}
                className="input-field w-full mt-1"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                How often prices can update
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400">Minimum Price (XFG)</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={formatXFGAmount(strategy.minPriceAtomic)}
                onChange={(e) => setStrategy(prev => ({ 
                  ...prev, 
                  minPriceAtomic: Math.round(parseFloat(e.target.value) * 10000000) || 0 
                }))}
                className="input-field w-full mt-1"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Maximum Price (XFG)</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={formatXFGAmount(strategy.maxPriceAtomic)}
                onChange={(e) => setStrategy(prev => ({ 
                  ...prev, 
                  maxPriceAtomic: Math.round(parseFloat(e.target.value) * 10000000) || 0 
                }))}
                className="input-field w-full mt-1"
              />
            </div>
          </div>
        </div>

        {/* Price Preview */}
        <div className="glass p-6 rounded-xl border border-purple-500/20">
          <h3 className="text-xl font-semibold text-purple-400 mb-4">Price Preview</h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-white">
                {formatXFGAmount(calculatedPrice)} XFG
              </div>
              <div className="text-sm text-gray-400">
                ${formatUSD(calculatedPrice)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Strategy</div>
              <div className="text-lg font-semibold text-white">
                {strategy.type === 'usd_target' ? 'USD Target' : 'Fixed XFG'}
              </div>
              <div className="text-sm text-gray-400">
                {strategy.type === 'usd_target' ? `$${strategy.basePriceUSD}` : `${formatXFGAmount(strategy.fixedPriceAtomic || 0)} XFG`}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Stability</div>
              <div className="text-lg font-semibold text-white">
                {strategy.volatilityTolerance <= 0.05 ? 'Very Stable' :
                 strategy.volatilityTolerance <= 0.1 ? 'Stable' :
                 strategy.volatilityTolerance <= 0.15 ? 'Moderate' : 'Volatile'}
              </div>
              <div className="text-sm text-gray-400">
                ±{(strategy.volatilityTolerance * 100).toFixed(0)}% max change
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            className="btn-primary flex-1"
          >
            Save Pricing Strategy
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistPricingConfig;
