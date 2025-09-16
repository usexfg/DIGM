/**
 * DIGM Pricing Engine
 * Artist-Controlled Pricing with USD Target Support
 * 
 * Features:
 * - Artists choose between fixed XFG or USD-target pricing
 * - XFG remains the only platform payment method
 * - Real-time price updates based on market conditions
 * - Price stability mechanisms to prevent extreme volatility
 */

export interface PricingStrategy {
  type: 'fixed_xfg' | 'usd_target';
  basePriceUSD?: number;        // Required for USD target
  fixedPriceAtomic?: number;    // Required for fixed XFG
  volatilityTolerance: number;  // 0.1 = 10% max change per update
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  minPriceAtomic: number;       // Minimum XFG price
  maxPriceAtomic: number;       // Maximum XFG price
  lastUpdated: number;
  priceHistory: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  priceAtomic: number;
  priceUSD: number;
  xfgPriceUSD: number;
  volatility: number;
  updateReason: 'market_update' | 'manual_adjustment' | 'stability_correction';
}

export interface AlbumPricing {
  albumId: string;
  artistId: string;
  strategy: PricingStrategy;
  currentPriceAtomic: number;
  currentPriceUSD: number;
  priceStability: 'stable' | 'volatile' | 'extreme';
  nextUpdateTime: number;
  canUpdate: boolean;
  lastUpdated: number;
}

export interface XFGPriceData {
  priceUSD: number;
  timestamp: number;
  source: string;
  volatility24h: number;
  marketCap: number;
}

class DIGMPricingEngine {
  private xfgPriceCache: Map<string, XFGPriceData> = new Map();
  private albumPricing: Map<string, AlbumPricing> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private readonly XFG_ATOMIC_UNITS = 10000000; // 1 XFG = 10M atomic units

  constructor() {
    this.startPriceMonitoring();
  }

  /**
   * Initialize album pricing with artist's chosen strategy
   */
  async initializeAlbumPricing(
    albumId: string,
    artistId: string,
    strategy: PricingStrategy
  ): Promise<AlbumPricing> {
    const xfgPrice = await this.getCurrentXFGPrice();
    let currentPriceAtomic: number;
    let currentPriceUSD: number;

    if (strategy.type === 'fixed_xfg') {
      currentPriceAtomic = strategy.fixedPriceAtomic!;
      currentPriceUSD = (currentPriceAtomic / this.XFG_ATOMIC_UNITS) * xfgPrice.priceUSD;
    } else {
      // USD target pricing
      currentPriceAtomic = Math.round(
        (strategy.basePriceUSD! / xfgPrice.priceUSD) * this.XFG_ATOMIC_UNITS
      );
      currentPriceUSD = strategy.basePriceUSD!;
    }

    const albumPricing: AlbumPricing = {
      albumId,
      artistId,
      strategy,
      currentPriceAtomic,
      currentPriceUSD,
      priceStability: this.calculatePriceStability(strategy),
      nextUpdateTime: this.calculateNextUpdateTime(strategy),
      canUpdate: true,
      lastUpdated: Date.now()
    };

    this.albumPricing.set(albumId, albumPricing);
    return albumPricing;
  }

  /**
   * Get current album price in XFG atomic units
   */
  async getAlbumPrice(albumId: string): Promise<number> {
    const pricing = this.albumPricing.get(albumId);
    if (!pricing) {
      throw new Error(`No pricing found for album ${albumId}`);
    }

    // Check if price needs updating
    if (this.shouldUpdatePrice(pricing)) {
      await this.updateAlbumPrice(albumId);
    }

    return pricing.currentPriceAtomic;
  }

  /**
   * Update album price based on market conditions
   */
  private async updateAlbumPrice(albumId: string): Promise<void> {
    const pricing = this.albumPricing.get(albumId);
    if (!pricing || !pricing.canUpdate) return;

    const xfgPrice = await this.getCurrentXFGPrice();
    const oldPriceAtomic = pricing.currentPriceAtomic;
    let newPriceAtomic: number;

    if (pricing.strategy.type === 'fixed_xfg') {
      // Fixed XFG pricing - no automatic updates
      return;
    } else {
      // USD target pricing - update based on XFG price
      newPriceAtomic = Math.round(
        (pricing.strategy.basePriceUSD! / xfgPrice.priceUSD) * this.XFG_ATOMIC_UNITS
      );
    }

    // Apply volatility protection
    newPriceAtomic = this.applyVolatilityProtection(
      oldPriceAtomic,
      newPriceAtomic,
      pricing.strategy.volatilityTolerance
    );

    // Apply price bands
    newPriceAtomic = Math.max(
      pricing.strategy.minPriceAtomic,
      Math.min(pricing.strategy.maxPriceAtomic, newPriceAtomic)
    );

    // Update pricing
    pricing.currentPriceAtomic = newPriceAtomic;
    pricing.currentPriceUSD = (newPriceAtomic / this.XFG_ATOMIC_UNITS) * xfgPrice.priceUSD;
    pricing.lastUpdated = Date.now();
    pricing.nextUpdateTime = this.calculateNextUpdateTime(pricing.strategy);

    // Record price history
    this.recordPriceHistory(albumId, {
      timestamp: Date.now(),
      priceAtomic: newPriceAtomic,
      priceUSD: pricing.currentPriceUSD,
      xfgPriceUSD: xfgPrice.priceUSD,
      volatility: xfgPrice.volatility24h,
      updateReason: 'market_update'
    });

    console.log(`Updated price for album ${albumId}: ${newPriceAtomic} atomic units (${pricing.currentPriceUSD.toFixed(2)} USD)`);
  }

  /**
   * Apply volatility protection to prevent extreme price changes
   */
  private applyVolatilityProtection(
    oldPrice: number,
    newPrice: number,
    tolerance: number
  ): number {
    const maxChange = oldPrice * tolerance;
    const difference = newPrice - oldPrice;

    if (Math.abs(difference) <= maxChange) {
      return newPrice;
    } else {
      return oldPrice + (difference > 0 ? maxChange : -maxChange);
    }
  }

  /**
   * Check if price should be updated based on strategy
   */
  private shouldUpdatePrice(pricing: AlbumPricing): boolean {
    if (pricing.strategy.type === 'fixed_xfg') return false;
    if (!pricing.canUpdate) return false;
    if (Date.now() < pricing.nextUpdateTime) return false;

    return true;
  }

  /**
   * Calculate next update time based on strategy
   */
  private calculateNextUpdateTime(strategy: PricingStrategy): number {
    const now = Date.now();
    const intervals = {
      'hourly': 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000,
      'weekly': 7 * 24 * 60 * 60 * 1000
    };

    return now + intervals[strategy.updateFrequency];
  }

  /**
   * Calculate price stability based on strategy
   */
  private calculatePriceStability(strategy: PricingStrategy): 'stable' | 'volatile' | 'extreme' {
    if (strategy.type === 'fixed_xfg') return 'stable';
    
    const tolerance = strategy.volatilityTolerance;
    if (tolerance <= 0.05) return 'stable';
    if (tolerance <= 0.15) return 'volatile';
    return 'extreme';
  }

  /**
   * Get current XFG price from multiple sources
   */
  async getCurrentXFGPrice(): Promise<XFGPriceData> {
    // Check cache first
    const cached = this.xfgPriceCache.get('current');
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached;
    }

    try {
      // Fetch from multiple sources for reliability
      const sources = [
        this.fetchFromCoinGecko(),
        this.fetchFromBinance(),
        this.fetchFromKraken()
      ];

      const prices = await Promise.allSettled(sources);
      const validPrices = prices
        .filter((result): result is PromiseFulfilledResult<XFGPriceData> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      if (validPrices.length === 0) {
        throw new Error('No valid price sources available');
      }

      // Use median price to avoid manipulation
      const medianPrice = this.calculateMedian(validPrices.map(p => p.priceUSD));
      const selectedPrice = validPrices.find(p => p.priceUSD === medianPrice)!;

      const priceData: XFGPriceData = {
        priceUSD: medianPrice,
        timestamp: Date.now(),
        source: selectedPrice.source,
        volatility24h: selectedPrice.volatility24h,
        marketCap: selectedPrice.marketCap
      };

      this.xfgPriceCache.set('current', priceData);
      return priceData;

    } catch (error) {
      console.error('Failed to fetch XFG price:', error);
      
      // Return cached price if available
      const cached = this.xfgPriceCache.get('current');
      if (cached) {
        return cached;
      }

      // Fallback to default price
      return {
        priceUSD: 0.0001, // Default fallback
        timestamp: Date.now(),
        source: 'fallback',
        volatility24h: 0,
        marketCap: 0
      };
    }
  }

  /**
   * Fetch XFG price from CoinGecko
   */
  private async fetchFromCoinGecko(): Promise<XFGPriceData> {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=fuego&vs_currencies=usd&include_24hr_change=true&include_market_cap=true');
    const data = await response.json();
    
    return {
      priceUSD: data.fuego.usd,
      timestamp: Date.now(),
      source: 'coingecko',
      volatility24h: Math.abs(data.fuego.usd_24h_change || 0),
      marketCap: data.fuego.usd_market_cap || 0
    };
  }

  /**
   * Fetch XFG price from Binance
   */
  private async fetchFromBinance(): Promise<XFGPriceData> {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=XFGUSDT');
    const data = await response.json();
    
    return {
      priceUSD: parseFloat(data.lastPrice),
      timestamp: Date.now(),
      source: 'binance',
      volatility24h: Math.abs(parseFloat(data.priceChangePercent)),
      marketCap: 0
    };
  }

  /**
   * Fetch XFG price from Kraken
   */
  private async fetchFromKraken(): Promise<XFGPriceData> {
    const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=XFGUSD');
    const data = await response.json();
    const ticker = data.result[Object.keys(data.result)[0]];
    
    return {
      priceUSD: parseFloat(ticker.c[0]),
      timestamp: Date.now(),
      source: 'kraken',
      volatility24h: 0,
      marketCap: 0
    };
  }

  /**
   * Calculate median value from array
   */
  private calculateMedian(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Record price history for analytics
   */
  private recordPriceHistory(albumId: string, pricePoint: PricePoint): void {
    const pricing = this.albumPricing.get(albumId);
    if (!pricing) return;

    pricing.strategy.priceHistory.push(pricePoint);
    
    // Keep only last 100 price points
    if (pricing.strategy.priceHistory.length > 100) {
      pricing.strategy.priceHistory = pricing.strategy.priceHistory.slice(-100);
    }
  }

  /**
   * Start price monitoring service
   */
  private startPriceMonitoring(): void {
    // Update prices every 5 minutes
    this.priceUpdateInterval = setInterval(async () => {
      try {
        await this.updateAllPrices();
      } catch (error) {
        console.error('Price update failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Update all album prices that need updating
   */
  private async updateAllPrices(): Promise<void> {
    const entries = Array.from(this.albumPricing.entries());
    for (const [albumId, pricing] of entries) {
      if (this.shouldUpdatePrice(pricing)) {
        await this.updateAlbumPrice(albumId);
      }
    }
  }

  /**
   * Get pricing information for display
   */
  getPricingInfo(albumId: string): {
    currentPrice: string;
    priceChange: string;
    strategy: string;
    stability: string;
    nextUpdate: string;
  } | null {
    const pricing = this.albumPricing.get(albumId);
    if (!pricing) return null;

    const xfgAmount = pricing.currentPriceAtomic / this.XFG_ATOMIC_UNITS;
    const priceChange = this.calculatePriceChange(pricing);
    const nextUpdate = new Date(pricing.nextUpdateTime).toLocaleString();

    return {
      currentPrice: `${xfgAmount.toFixed(4)} XFG ($${pricing.currentPriceUSD.toFixed(2)})`,
      priceChange: `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
      strategy: pricing.strategy.type === 'fixed_xfg' ? 'Fixed XFG' : 'USD Target',
      stability: pricing.priceStability,
      nextUpdate
    };
  }

  /**
   * Calculate price change percentage
   */
  private calculatePriceChange(pricing: AlbumPricing): number {
    if (pricing.strategy.priceHistory.length < 2) return 0;

    const current = pricing.currentPriceUSD;
    const previous = pricing.strategy.priceHistory[pricing.strategy.priceHistory.length - 2].priceUSD;
    
    return ((current - previous) / previous) * 100;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
  }
}

// Export singleton instance
export const pricingEngine = new DIGMPricingEngine();

export default pricingEngine;
