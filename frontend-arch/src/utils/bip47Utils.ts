import { WalletInterface } from './walletInterface';
import { cryptoHash, cryptoGenerateKeys } from './cryptoUtils';

/**
 * BIP47-style payment code utilities for private artist payments
 * This implements a simplified version of BIP47 reusable payment codes
 * adapted for the Fuego blockchain and XFG payments.
 */

export interface PaymentCode {
  version: number;
  features: number;
  publicKey: string;
  chainCode: string;
  encoded: string;
}

export interface DerivedPaymentAddress {
  address: string;
  index: number;
  sharedSecret: string;
}

/**
 * Parse a BIP47-style payment code
 */
export function parsePaymentCode(encoded: string): PaymentCode {
  // Payment code format: PC<version><features><pubkey><chaincode>
  // Example: PC01000102a1b2c3... (simplified for demo)
  
  if (!encoded.startsWith('PC') || encoded.length < 66) {
    throw new Error('Invalid payment code format');
  }

  const version = parseInt(encoded.substring(2, 4), 16);
  const features = parseInt(encoded.substring(4, 6), 16);
  const publicKey = encoded.substring(6, 70); // 32 bytes = 64 hex chars
  const chainCode = encoded.substring(70, 134); // 32 bytes = 64 hex chars

  return {
    version,
    features,
    publicKey,
    chainCode,
    encoded
  };
}

/**
 * Create a BIP47-style payment code from artist keys
 */
export function createPaymentCode(
  artistPublicKey: string,
  chainCode: string,
  version: number = 1,
  features: number = 0
): PaymentCode {
  const encoded = `PC${version.toString(16).padStart(2, '0')}${features.toString(16).padStart(2, '0')}${artistPublicKey}${chainCode}`;
  
  return {
    version,
    features,
    publicKey: artistPublicKey,
    chainCode,
    encoded
  };
}

/**
 * Derive a unique payment address using BIP47-style derivation
 */
export async function derivePaymentAddress(
  artistPaymentCode: string,
  buyerWallet: WalletInterface,
  addressIndex: number = 0
): Promise<string> {
  try {
    const paymentCode = parsePaymentCode(artistPaymentCode);
    const buyerPrivateKey = await buyerWallet.getPrivateKey();
    const buyerPublicKey = await buyerWallet.getPublicKey();

    // Create shared secret using ECDH
    const sharedSecret = await generateSharedSecret(
      buyerPrivateKey,
      paymentCode.publicKey
    );

    // Derive address-specific secret
    const addressSecret = await deriveAddressSecret(
      sharedSecret,
      paymentCode.chainCode,
      addressIndex
    );

    // Generate unique payment address
    const paymentAddress = await generatePaymentAddress(
      paymentCode.publicKey,
      addressSecret,
      addressIndex
    );

    return paymentAddress;

  } catch (error) {
    throw new Error(`Failed to derive payment address: ${error}`);
  }
}

/**
 * Extract artist public key from payment code
 */
export function extractArtistKey(artistPaymentCode: string): string {
  const paymentCode = parsePaymentCode(artistPaymentCode);
  return paymentCode.publicKey;
}

/**
 * Generate shared secret using ECDH
 */
async function generateSharedSecret(
  buyerPrivateKey: string,
  artistPublicKey: string
): Promise<string> {
  // In a real implementation, this would use proper ECDH
  // For now, create a deterministic shared secret
  const combined = buyerPrivateKey + artistPublicKey;
  return await cryptoHash(combined, 'sha256');
}

/**
 * Derive address-specific secret from shared secret and chain code
 */
async function deriveAddressSecret(
  sharedSecret: string,
  chainCode: string,
  addressIndex: number
): Promise<string> {
  const indexBytes = addressIndex.toString(16).padStart(8, '0');
  const input = sharedSecret + chainCode + indexBytes;
  return await cryptoHash(input, 'sha256');
}

/**
 * Generate unique payment address from artist key and address secret
 */
async function generatePaymentAddress(
  artistPublicKey: string,
  addressSecret: string,
  addressIndex: number
): Promise<string> {
  // Combine artist public key with derived secret to create unique address
  const combined = artistPublicKey + addressSecret + addressIndex.toString(16);
  const hash = await cryptoHash(combined, 'sha256');
  
  // Convert to Fuego address format
  return formatFuegoAddress(hash);
}

/**
 * Format hash as Fuego address
 */
function formatFuegoAddress(hash: string): string {
  // Fuego addresses start with 'fuego' prefix
  // This is a simplified implementation
  return `fuego${hash.substring(0, 60)}`;
}

/**
 * Validate payment code format
 */
export function isValidPaymentCode(encoded: string): boolean {
  try {
    parsePaymentCode(encoded);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new payment code for an artist
 */
export async function generateArtistPaymentCode(
  artistPrivateKey: string,
  artistPublicKey: string
): Promise<PaymentCode> {
  // Generate chain code from artist private key
  const chainCode = await cryptoHash(artistPrivateKey + 'chain', 'sha256');
  
  return createPaymentCode(artistPublicKey, chainCode);
}

/**
 * Derive multiple addresses for an artist (for address cycling)
 */
export async function deriveMultipleAddresses(
  artistPaymentCode: string,
  buyerWallet: WalletInterface,
  count: number = 5
): Promise<DerivedPaymentAddress[]> {
  const addresses: DerivedPaymentAddress[] = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const address = await derivePaymentAddress(artistPaymentCode, buyerWallet, i);
      const paymentCode = parsePaymentCode(artistPaymentCode);
      const buyerPrivateKey = await buyerWallet.getPrivateKey();
      const sharedSecret = await generateSharedSecret(buyerPrivateKey, paymentCode.publicKey);
      
      addresses.push({
        address,
        index: i,
        sharedSecret
      });
    } catch (error) {
      console.warn(`Failed to derive address at index ${i}:`, error);
    }
  }
  
  return addresses;
}

/**
 * Validate derived address belongs to payment code
 */
export async function validateDerivedAddress(
  address: string,
  artistPaymentCode: string,
  buyerWallet: WalletInterface,
  maxIndex: number = 100
): Promise<{ valid: boolean; index?: number }> {
  for (let i = 0; i < maxIndex; i++) {
    try {
      const derivedAddress = await derivePaymentAddress(artistPaymentCode, buyerWallet, i);
      if (derivedAddress === address) {
        return { valid: true, index: i };
      }
    } catch (error) {
      // Continue checking other indices
    }
  }
  
  return { valid: false };
}

/**
 * Create notification address for artist to monitor payments
 */
export async function createNotificationAddress(
  artistPaymentCode: string,
  buyerPublicKey: string
): Promise<string> {
  const paymentCode = parsePaymentCode(artistPaymentCode);
  const notificationData = paymentCode.publicKey + buyerPublicKey + 'notification';
  const hash = await cryptoHash(notificationData, 'sha256');
  return formatFuegoAddress(hash);
}

/**
 * Payment code utilities for debugging and testing
 */
export class PaymentCodeUtils {
  /**
   * Create a test payment code for development
   */
  static async createTestPaymentCode(): Promise<PaymentCode> {
    const { publicKey, privateKey } = await cryptoGenerateKeys();
    return generateArtistPaymentCode(privateKey, publicKey);
  }

  /**
   * Validate payment code structure
   */
  static validateStructure(encoded: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!encoded.startsWith('PC')) {
      errors.push('Must start with "PC" prefix');
    }

    if (encoded.length < 134) {
      errors.push('Payment code too short');
    }

    if (encoded.length > 134) {
      errors.push('Payment code too long');
    }

    try {
      const code = parsePaymentCode(encoded);
      
      if (code.version < 1 || code.version > 255) {
        errors.push('Invalid version');
      }

      if (code.publicKey.length !== 64) {
        errors.push('Invalid public key length');
      }

      if (code.chainCode.length !== 64) {
        errors.push('Invalid chain code length');
      }

    } catch (error) {
      errors.push(`Parse error: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format payment code for display
   */
  static formatForDisplay(encoded: string): string {
    if (encoded.length <= 20) return encoded;
    return `${encoded.substring(0, 10)}...${encoded.substring(encoded.length - 10)}`;
  }
}

export default {
  parsePaymentCode,
  createPaymentCode,
  derivePaymentAddress,
  extractArtistKey,
  isValidPaymentCode,
  generateArtistPaymentCode,
  deriveMultipleAddresses,
  validateDerivedAddress,
  createNotificationAddress,
  PaymentCodeUtils
};
