import { FuegoRPCClient } from './fuegoRPC';
import { WalletInterface } from './walletInterface';
import { derivePaymentAddress, extractArtistKey } from './bip47Utils';
import { TransactionExtraAlbumLicense } from './licenseCheck';

export interface AlbumPurchaseRequest {
  albumId: string;
  artistPaymentCode: string;  // BIP47-style payment code
  priceXFG: number;           // Price in XFG
  buyerWallet: WalletInterface;
  artistSigningService?: string; // Optional artist signing service URL
}

export interface AlbumPurchaseResult {
  success: boolean;
  txHash?: string;
  error?: string;
  licenseData?: TransactionExtraAlbumLicense;
}

export interface ArtistSigningRequest {
  albumId: string;
  buyerKey: string;
  purchaseAmount: number;
  timestamp: number;
  version: number;
}

export interface ArtistSigningResponse {
  signature: string;
  artistKey: string;
  error?: string;
}

export class AlbumPurchaseManager {
  private fuegoRPC: FuegoRPCClient;
  private defaultSigningService: string | null = null;

  constructor(rpcClient: FuegoRPCClient, defaultSigningService?: string) {
    this.fuegoRPC = rpcClient;
    this.defaultSigningService = defaultSigningService || null;
  }

  /**
   * Purchase an album and create 0x0B license transaction
   */
  async purchaseAlbum(request: AlbumPurchaseRequest): Promise<AlbumPurchaseResult> {
    try {
      const { albumId, artistPaymentCode, priceXFG, buyerWallet } = request;

      // 1. Validate inputs
      if (!albumId || !artistPaymentCode || priceXFG <= 0) {
        return {
          success: false,
          error: 'Invalid purchase parameters'
        };
      }

      // 2. Check buyer wallet balance
      const buyerBalance = await this.fuegoRPC.getBalance(await buyerWallet.getAddress());
      const purchaseAmountAtomic = Math.floor(priceXFG * 1000000); // Convert to atomic units
      
      if (buyerBalance.xfg < purchaseAmountAtomic + 8000) { // Include 0.008 XFG tx fee
        return {
          success: false,
          error: 'Insufficient XFG balance for purchase'
        };
      }

      // 3. Derive unique payment address using BIP47
      const paymentAddress = await derivePaymentAddress(artistPaymentCode, buyerWallet);
      
      // 4. Create license data
      const licenseData: Partial<TransactionExtraAlbumLicense> = {
        albumId,
        buyerKey: await buyerWallet.getPublicKey(),
        purchaseAmount: purchaseAmountAtomic,
        timestamp: Math.floor(Date.now() / 1000),
        artistKey: extractArtistKey(artistPaymentCode),
        version: 1
      };

      // 5. Get artist signature
      const signingResult = await this.requestArtistSignature(licenseData, request.artistSigningService);
      
      if (!signingResult.signature) {
        return {
          success: false,
          error: signingResult.error || 'Failed to get artist signature'
        };
      }

      // 6. Complete license data
      const completeLicenseData: TransactionExtraAlbumLicense = {
        ...licenseData as TransactionExtraAlbumLicense,
        artistSig: signingResult.signature
      };

      // 7. Create transaction with 0x0B extra
      const transaction = await buyerWallet.createTransaction({
        to: paymentAddress,
        amount: priceXFG,
        extraData: {
          type: 0x0B,
          data: completeLicenseData
        }
      });

      // 8. Sign and broadcast transaction
      const txHash = await buyerWallet.sendTransaction(transaction);

      return {
        success: true,
        txHash,
        licenseData: completeLicenseData
      };

    } catch (error) {
      console.error('Album purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown purchase error'
      };
    }
  }

  /**
   * Request artist signature for license data
   */
  private async requestArtistSignature(
    licenseData: Partial<TransactionExtraAlbumLicense>,
    signingServiceUrl?: string
  ): Promise<ArtistSigningResponse> {
    const serviceUrl = signingServiceUrl || this.defaultSigningService;
    
    if (!serviceUrl) {
      return {
        signature: '',
        artistKey: '',
        error: 'No artist signing service configured'
      };
    }

    try {
      const signingRequest: ArtistSigningRequest = {
        albumId: licenseData.albumId!,
        buyerKey: licenseData.buyerKey!,
        purchaseAmount: licenseData.purchaseAmount!,
        timestamp: licenseData.timestamp!,
        version: licenseData.version!
      };

      const response = await fetch(`${serviceUrl}/sign-license`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(signingRequest),
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Signing service error: ${response.status} ${response.statusText}`);
      }

      const result: ArtistSigningResponse = await response.json();
      
      if (!result.signature || !result.artistKey) {
        throw new Error('Invalid response from signing service');
      }

      return result;

    } catch (error) {
      console.error('Artist signature request failed:', error);
      return {
        signature: '',
        artistKey: '',
        error: error instanceof Error ? error.message : 'Signing service error'
      };
    }
  }

  /**
   * Validate album purchase prerequisites
   */
  async validatePurchaseRequest(request: AlbumPurchaseRequest): Promise<{
    valid: boolean;
    error?: string;
    estimatedFee?: number;
  }> {
    try {
      const { albumId, artistPaymentCode, priceXFG, buyerWallet } = request;

      // Check basic parameters
      if (!albumId || albumId.length === 0) {
        return { valid: false, error: 'Invalid album ID' };
      }

      if (!artistPaymentCode || artistPaymentCode.length === 0) {
        return { valid: false, error: 'Invalid artist payment code' };
      }

      if (priceXFG <= 0 || priceXFG > 1000) { // Reasonable max price
        return { valid: false, error: 'Invalid price' };
      }

      // Check wallet connection
      if (!buyerWallet || !await buyerWallet.isConnected()) {
        return { valid: false, error: 'Wallet not connected' };
      }

      // Check balance
      const buyerBalance = await this.fuegoRPC.getBalance(await buyerWallet.getAddress());
      const purchaseAmountAtomic = Math.floor(priceXFG * 1000000);
      const estimatedFee = 8000; // 0.008 XFG standard fee
      
      if (buyerBalance.xfg < purchaseAmountAtomic + estimatedFee) {
        return { 
          valid: false, 
          error: `Insufficient balance. Need ${((purchaseAmountAtomic + estimatedFee) / 1000000).toFixed(6)} XFG, have ${(buyerBalance.xfg / 1000000).toFixed(6)} XFG` 
        };
      }

      // Test artist payment code derivation
      try {
        await derivePaymentAddress(artistPaymentCode, buyerWallet);
      } catch (error) {
        return { valid: false, error: 'Invalid artist payment code format' };
      }

      return { 
        valid: true, 
        estimatedFee: estimatedFee / 1000000 // Return in XFG units
      };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation error' 
      };
    }
  }

  /**
   * Get purchase quote including fees
   */
  async getPurchaseQuote(priceXFG: number): Promise<{
    basePrice: number;
    networkFee: number;
    totalCost: number;
    currency: string;
  }> {
    const networkFee = 0.008; // Standard XFG transaction fee
    
    return {
      basePrice: priceXFG,
      networkFee,
      totalCost: priceXFG + networkFee,
      currency: 'XFG'
    };
  }

  /**
   * Check if user already owns the album
   */
  async checkExistingOwnership(
    albumId: string, 
    userPublicKey: string
  ): Promise<{
    alreadyOwned: boolean;
    purchaseDate?: number;
    txHash?: string;
  }> {
    try {
      // This would integrate with the license checker
      const { AlbumLicenseChecker } = await import('./licenseCheck');
      const licenseChecker = new AlbumLicenseChecker(this.fuegoRPC);
      
      const licenseDetails = await licenseChecker.getLicenseDetails(userPublicKey, albumId);
      
      if (licenseDetails) {
        return {
          alreadyOwned: true,
          purchaseDate: licenseDetails.timestamp,
          txHash: licenseDetails.txHash
        };
      }

      return { alreadyOwned: false };

    } catch (error) {
      console.error('Error checking existing ownership:', error);
      return { alreadyOwned: false };
    }
  }

  /**
   * Set default artist signing service
   */
  setDefaultSigningService(serviceUrl: string): void {
    this.defaultSigningService = serviceUrl;
  }

  /**
   * Get artist signing service URL for album
   */
  getArtistSigningService(albumId: string): string | null {
    // In production, this might look up artist-specific signing services
    // For now, return the default
    return this.defaultSigningService;
  }
}

/**
 * Utility functions for album purchases
 */
export class AlbumPurchaseUtils {
  /**
   * Format XFG amount for display
   */
  static formatXFG(atomicAmount: number): string {
    return (atomicAmount / 1000000).toFixed(6);
  }

  /**
   * Parse XFG amount from user input
   */
  static parseXFG(xfgString: string): number {
    const parsed = parseFloat(xfgString);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('Invalid XFG amount');
    }
    return Math.floor(parsed * 1000000); // Convert to atomic units
  }

  /**
   * Validate album ID format
   */
  static isValidAlbumId(albumId: string): boolean {
    // Album IDs should be non-empty and reasonable length
    return typeof albumId === 'string' && 
           albumId.length > 0 && 
           albumId.length <= 64 &&
           /^[a-zA-Z0-9_-]+$/.test(albumId);
  }

  /**
   * Generate purchase receipt data
   */
  static generateReceipt(
    result: AlbumPurchaseResult,
    request: AlbumPurchaseRequest
  ) {
    return {
      albumId: request.albumId,
      priceXFG: request.priceXFG,
      txHash: result.txHash,
      timestamp: result.licenseData?.timestamp,
      success: result.success,
      error: result.error,
      purchaseDate: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const albumPurchaseManager = new AlbumPurchaseManager(
  // This would be injected with the actual RPC client
  {} as FuegoRPCClient
);
