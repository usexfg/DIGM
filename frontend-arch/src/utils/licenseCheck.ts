import { FuegoRPCClient } from './fuegoRPC';
import { cryptoVerifySignature } from './cryptoUtils';

export interface LicenseOwnership {
  albumId: string;
  ownerKey: string;
  purchaseAmount: number;
  timestamp: number;
  txHash: string;
  verified: boolean;
  artistKey: string;
}

export interface TransactionExtraAlbumLicense {
  albumId: string;
  buyerKey: string;
  purchaseAmount: number;
  timestamp: number;
  artistKey: string;
  artistSig: string;
  version: number;
}

interface CacheEntry {
  licenses: LicenseOwnership[];
  timestamp: number;
}

export class AlbumLicenseChecker {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL = 300000; // 5 minutes
  private fuegoRPC: FuegoRPCClient;
  private lastScanBlock = 0;

  constructor(rpcClient: FuegoRPCClient) {
    this.fuegoRPC = rpcClient;
  }

  /**
   * Check if a user has a valid license for a specific album
   */
  async hasLicense(userPublicKey: string, albumId: string): Promise<boolean> {
    const licenses = await this.getUserLicenses(userPublicKey);
    return licenses.some(license => 
      license.albumId === albumId && license.verified
    );
  }

  /**
   * Get all valid licenses for a user
   */
  async getUserLicenses(userPublicKey: string): Promise<LicenseOwnership[]> {
    // Check cache first
    const cachedLicenses = this.getCachedLicenses(userPublicKey);
    if (cachedLicenses !== null) {
      return cachedLicenses;
    }

    // Scan blockchain for 0x0B transactions
    const licenses = await this.scanBlockchainForLicenses(userPublicKey);
    
    // Cache results
    this.setCachedLicenses(userPublicKey, licenses);
    
    return licenses;
  }

  /**
   * Refresh licenses for a user (force re-scan)
   */
  async refreshUserLicenses(userPublicKey: string): Promise<LicenseOwnership[]> {
    // Clear cache for this user
    this.cache.delete(userPublicKey);
    
    // Perform fresh scan
    return await this.getUserLicenses(userPublicKey);
  }

  /**
   * Scan for new licenses since last check (incremental)
   */
  async scanNewLicenses(userPublicKey: string): Promise<LicenseOwnership[]> {
    const currentBlock = await this.fuegoRPC.getCurrentBlockHeight();
    
    if (this.lastScanBlock === 0) {
      // First scan - go back reasonable amount
      this.lastScanBlock = Math.max(0, currentBlock - 10000);
    }

    const newTransactions = await this.fuegoRPC.getTransactionsByExtraType(
      0x0B, 
      this.lastScanBlock, 
      currentBlock
    );

    this.lastScanBlock = currentBlock;
    
    return this.filterAndVerifyLicenses(newTransactions, userPublicKey);
  }

  private getCachedLicenses(userKey: string): LicenseOwnership[] | null {
    const entry = this.cache.get(userKey);
    if (!entry || Date.now() - entry.timestamp > this.cacheTTL) {
      return null;
    }
    return entry.licenses;
  }

  private setCachedLicenses(userKey: string, licenses: LicenseOwnership[]): void {
    this.cache.set(userKey, {
      licenses,
      timestamp: Date.now()
    });
  }

  private async scanBlockchainForLicenses(userPublicKey: string): Promise<LicenseOwnership[]> {
    try {
      // Query Fuego RPC for transactions with extra data type 0x0B
      const transactions = await this.fuegoRPC.getTransactionsByExtraType(0x0B);
      
      return this.filterAndVerifyLicenses(transactions, userPublicKey);
    } catch (error) {
      console.error('Error scanning blockchain for licenses:', error);
      return [];
    }
  }

  private async filterAndVerifyLicenses(
    transactions: any[], 
    userPublicKey: string
  ): Promise<LicenseOwnership[]> {
    const licenses: LicenseOwnership[] = [];

    for (const tx of transactions) {
      try {
        const licenseData = this.parseAlbumLicense(tx.extra);
        
        // Only include licenses for this user
        if (licenseData.buyerKey === userPublicKey) {
          // Verify artist signature
          const isValid = await this.verifyArtistSignature(licenseData);
          
          licenses.push({
            albumId: licenseData.albumId,
            ownerKey: licenseData.buyerKey,
            purchaseAmount: licenseData.purchaseAmount,
            timestamp: licenseData.timestamp,
            txHash: tx.hash,
            verified: isValid,
            artistKey: licenseData.artistKey
          });
        }
      } catch (error) {
        console.warn('Failed to parse license from transaction:', tx.hash, error);
      }
    }

    // Sort by timestamp (newest first)
    return licenses.sort((a, b) => b.timestamp - a.timestamp);
  }

  private parseAlbumLicense(extraData: string): TransactionExtraAlbumLicense {
    try {
      // Parse hex-encoded extra data to extract 0x0B license
      // This would interface with the C++ parsing logic via WASM or bridge
      return this.parseAlbumLicenseFromHex(extraData);
    } catch (error) {
      throw new Error(`Failed to parse album license: ${error}`);
    }
  }

  private parseAlbumLicenseFromHex(hexData: string): TransactionExtraAlbumLicense {
    // TODO: Implement actual hex parsing logic
    // This would use the C++ TransactionExtraAlbumLicense parsing
    // For now, return mock data structure
    
    // In production, this would call into fuego-bridge.ts
    // which interfaces with the C++ parsing functions
    
    throw new Error('parseAlbumLicenseFromHex not yet implemented - requires fuego-bridge integration');
  }

  private async verifyArtistSignature(license: TransactionExtraAlbumLicense): Promise<boolean> {
    try {
      // Create canonical representation for signature verification
      const dataToVerify = this.serializeLicenseForSigning(license);
      
      // Verify that artistSig is valid signature of license data by artistKey
      return await cryptoVerifySignature(
        license.artistKey, 
        license.artistSig, 
        dataToVerify
      );
    } catch (error) {
      console.error('Error verifying artist signature:', error);
      return false;
    }
  }

  private serializeLicenseForSigning(license: TransactionExtraAlbumLicense): string {
    // Create canonical representation for signature verification
    // Must match the format used by artist when signing
    return `${license.albumId}:${license.buyerKey}:${license.purchaseAmount}:${license.timestamp}:${license.version}`;
  }

  /**
   * Validate license constraints (timestamp, amount, etc.)
   */
  private validateLicense(license: TransactionExtraAlbumLicense): boolean {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 86400 * 365; // 1 year max age
    
    // Check timestamp is reasonable
    if (license.timestamp > now + 300) { // Max 5 minutes in future
      return false;
    }
    
    if (license.timestamp < now - maxAge) { // Max 1 year old
      return false;
    }
    
    // Check purchase amount is positive
    if (license.purchaseAmount <= 0) {
      return false;
    }
    
    // Check version is supported
    if (license.version !== 1) {
      return false;
    }
    
    return true;
  }

  /**
   * Get license details for a specific album purchase
   */
  async getLicenseDetails(userPublicKey: string, albumId: string): Promise<LicenseOwnership | null> {
    const licenses = await this.getUserLicenses(userPublicKey);
    
    // Return most recent valid license for this album
    const albumLicenses = licenses.filter(l => l.albumId === albumId && l.verified);
    
    if (albumLicenses.length === 0) {
      return null;
    }
    
    return albumLicenses[0]; // Most recent due to sorting
  }

  /**
   * Check if user has premium access (0.1 XFG or 1M HEAT balance)
   */
  async hasPremiumAccess(userPublicKey: string): Promise<boolean> {
    try {
      const balance = await this.fuegoRPC.getBalance(userPublicKey);
      
      // Check XFG balance (0.1 XFG = 100,000 atomic units)
      if (balance.xfg >= 100000) {
        return true;
      }
      
      // Check HEAT balance (1M HEAT = 1,000,000 atomic units)
      if (balance.heat >= 1000000) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }

  /**
   * Get comprehensive access info for user
   */
  async getUserAccessInfo(userPublicKey: string, albumId: string) {
    const [hasLicense, isPremium, licenseDetails] = await Promise.all([
      this.hasLicense(userPublicKey, albumId),
      this.hasPremiumAccess(userPublicKey),
      this.getLicenseDetails(userPublicKey, albumId)
    ]);

    return {
      hasLicense,
      isPremium,
      hasAccess: hasLicense || isPremium,
      licenseDetails,
      accessType: hasLicense ? 'license' : isPremium ? 'premium' : 'none'
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.lastScanBlock = 0;
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      lastScanBlock: this.lastScanBlock,
      cacheTTL: this.cacheTTL
    };
  }
}
