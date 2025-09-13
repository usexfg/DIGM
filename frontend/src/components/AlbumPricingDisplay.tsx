import React, { useState, useEffect } from 'react';
import { pricingEngine } from '../utils/pricingEngine';

interface AlbumPricingDisplayProps {
  albumId: string;
  album: {
    albumId: string;
    title: string;
    artist: string;
    priceAtomic: number;
    pricingStrategy?: {
      type: 'fixed_xfg' | 'usd_target';
      basePriceUSD?: number;
      volatilityTolerance: number;
      updateFrequency: 'hourly' | 'daily' | 'weekly';
    };
  };
}

const AlbumPricingDisplay: React.FC<AlbumPricingDisplayProps> = ({ albumId, album }) => {
  const [pricingInfo, setPricingInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPricingInfo = async () => {
      try {
        setIsLoading(true);
        const info = pricingEngine.getPricingInfo(albumId);
        setPricingInfo(info);
      } catch (error) {
        console.error('Failed to fetch pricing info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricingInfo();
    
    // Update pricing info every 30 seconds
    const interval = setInterval(fetchPricingInfo, 30000);
    return () => clearInterval(interval);
  }, [albumId]);

  const formatXFGAmount = (atomic: number): string => {
    return (atomic / 10000000).toFixed(4);
  };

  const getStabilityColor = (stability: string): string => {
    switch (stability) {
      case 'stable': return 'text-green-400';
      case 'volatile': return 'text-yellow-400';
      case 'extreme': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStabilityIcon = (stability: string): string => {
    switch (stability) {
      case 'stable': return '✅';
      case 'volatile': return '⚠️';
      case 'extreme': return '🚨';
      default: return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="glass p-6 rounded-xl">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6 rounded-xl border border-purple-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Album Pricing</h3>
        <div className="text-sm text-gray-400">
          {album.pricingStrategy?.type === 'fixed_xfg' ? 'Fixed XFG' : 'USD Target'}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Price */}
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Price</div>
            <div className="text-3xl font-bold text-white">
              {formatXFGAmount(album.priceAtomic)} XFG
            </div>
            {pricingInfo && (
              <div className="text-lg text-gray-300">
                {pricingInfo.currentPrice}
              </div>
            )}
          </div>

          {/* Price Change */}
          {pricingInfo && (
            <div>
              <div className="text-sm text-gray-400 mb-1">24h Change</div>
              <div className={`text-lg font-semibold ${
                pricingInfo.priceChange.startsWith('+') ? 'text-green-400' : 
                pricingInfo.priceChange.startsWith('-') ? 'text-red-400' : 'text-gray-400'
              }`}>
                {pricingInfo.priceChange}
              </div>
            </div>
          )}
        </div>

        {/* Pricing Strategy Info */}
        <div className="space-y-4">
          {/* Strategy Type */}
          <div>
            <div className="text-sm text-gray-400 mb-1">Strategy</div>
            <div className="text-lg font-semibold text-white">
              {album.pricingStrategy?.type === 'fixed_xfg' ? 'Fixed XFG' : 'USD Target'}
            </div>
            {album.pricingStrategy?.type === 'usd_target' && album.pricingStrategy.basePriceUSD && (
              <div className="text-sm text-gray-300">
                Target: ${album.pricingStrategy.basePriceUSD}
              </div>
            )}
          </div>

          {/* Stability */}
          {pricingInfo && (
            <div>
              <div className="text-sm text-gray-400 mb-1">Stability</div>
              <div className={`text-lg font-semibold ${getStabilityColor(pricingInfo.stability)}`}>
                {getStabilityIcon(pricingInfo.stability)} {pricingInfo.stability}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Strategy Details */}
      {album.pricingStrategy && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Strategy Details</h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Volatility Tolerance</div>
              <div className="text-white font-semibold">
                ±{(album.pricingStrategy.volatilityTolerance * 100).toFixed(0)}%
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400 mb-1">Update Frequency</div>
              <div className="text-white font-semibold capitalize">
                {album.pricingStrategy.updateFrequency}
              </div>
            </div>
            
            {pricingInfo && (
              <div>
                <div className="text-sm text-gray-400 mb-1">Next Update</div>
                <div className="text-white font-semibold text-sm">
                  {pricingInfo.nextUpdate}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <button className="btn-primary w-full">
          Purchase Album for {formatXFGAmount(album.priceAtomic)} XFG
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Payment processed in XFG only. Other crypto addresses available for tipping in artist profile.
        </p>
      </div>
    </div>
  );
};

export default AlbumPricingDisplay;
