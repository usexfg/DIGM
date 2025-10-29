# 0x0B Listener Rights Implementation

## Overview

The 0x0B transaction type implements **album license verification** for DIGM platform, enabling verifiable album purchases without requiring smart contracts. This system creates on-chain proof of album ownership through transaction metadata.

## Architecture

### Transaction Extra Type 0x0B

**Type ID**: `TX_EXTRA_ALBUM_LICENSE` = 0x0B

### Data Structure

```cpp
struct TransactionExtraAlbumLicense {
  std::string albumId;             // Album identifier
  Crypto::PublicKey buyerKey;      // Public key of the buyer
  uint64_t purchaseAmount;         // XFG amount paid
  uint64_t timestamp;              // Unix timestamp of purchase
  Crypto::PublicKey artistKey;     // Artist's public key
  Crypto::Signature artistSig;    // Artist's signature over license data
  uint32_t version;                // Version of the license protocol
};
```

## Implementation Components

### 1. RPC API Endpoints

#### `create_album_license`

**Request**:
```json
{
  "albumId": "string",
  "buyerKey": "hex_public_key",
  "purchaseAmount": 10000000,
  "timestamp": 1704067200000,
  "artistKey": "hex_public_key",
  "artistSig": "hex_signature",
  "version": 1
}
```

**Response**:
```json
{
  "txHash": "transaction_hash",
  "status": "OK",
  "extra": "hex_encoded_extra_data"
}
```

#### `get_album_licenses`

**Request**:
```json
{
  "buyerKey": "hex_public_key",
  "albumId": "optional_album_id"
}
```

**Response**:
```json
{
  "licenseTxHashes": ["tx1", "tx2", ...],
  "status": "OK"
}
```

### 2. Frontend Integration

#### License Checker

Located in: `frontend-arch/src/utils/licenseCheck.ts`

```typescript
class AlbumLicenseChecker {
  async hasLicense(userPublicKey: string, albumId: string): Promise<boolean>
  async getUserLicenses(userPublicKey: string): Promise<LicenseOwnership[]>
  async getLicenseDetails(userPublicKey: string, albumId: string): Promise<LicenseOwnership | null>
  async getUserAccessInfo(userPublicKey: string, albumId: string): Promise<AccessInfo>
}
```

#### Purchase Flow

Located in: `frontend-arch/src/utils/albumPurchase.ts`

```typescript
class AlbumPurchaseManager {
  async purchaseAlbum(
    albumId: string,
    priceAtomic: number,
    userPublicKey: string,
    artistPublicKey: string
  ): Promise<AlbumPurchaseResult>
}
```

### 3. Blockchain Integration

#### Fuego RPC Bridge

Located in: `src/main/fuego-bridge.ts`

```typescript
class FuegoBridge {
  async createAlbumLicense(licensePayload: Record<string, any>): Promise<string>
  async getAlbumLicenses(buyerKey: string, albumId?: string): Promise<string[]>
}
```

## License Verification Flow

### 1. Purchase Creation

```typescript
// User purchases album with XFG
const purchaseResult = await albumPurchaseManager.purchaseAlbum(
  albumId,
  priceAtomic,
  buyerPublicKey,
  artistPublicKey
);

// Creates 0x0B transaction with license metadata
const txHash = await fuegoBridge.createAlbumLicense({
  albumId,
  buyerKey: buyerPublicKey,
  purchaseAmount: priceAtomic,
  timestamp: Date.now(),
  artistKey: artistPublicKey,
  artistSig: artistSignature,
  version: 1
});
```

### 2. License Verification

```typescript
// Check if user has license
const hasLicense = await licenseChecker.hasLicense(
  userPublicKey,
  albumId
);

if (hasLicense) {
  // Grant access to full album streaming and downloads
  await streamFullAlbum(albumId);
} else {
  // Show purchase prompt
  showPurchasePrompt(albumId);
}
```

### 3. Blockchain Scanning

The license checker scans the blockchain for 0x0B transactions:

```typescript
// Scan for 0x0B transactions
const transactions = await fuegoRPC.getTransactionsByExtraType(0x0B);

// Parse each transaction's extra data
for (const tx of transactions) {
  const license = parseAlbumLicenseFromHex(tx.extra);
  
  if (license.buyerKey === userPublicKey && 
      license.albumId === albumId) {
    return {
      valid: true,
      txHash: tx.hash,
      purchaseAmount: license.purchaseAmount,
      timestamp: license.timestamp
    };
  }
}
```

## Security Features

### 1. Artist Signature Verification

Each license includes a signature from the artist's public key over the license data:

```typescript
const signData = `${albumId}:${buyerKey}:${purchaseAmount}:${timestamp}:${version}`;
const artistSignature = crypto.sign(signData, artistPrivateKey);

// Verification
const isValid = crypto.verify(
  artistSignature,
  signData,
  artistPublicKey
);
```

### 2. Non-Retroactive Pricing

License validity is based on the **purchase amount** at the time of transaction:

```cpp
// License is valid if:
license.purchaseAmount >= album.priceAtPurchaseTime

// Price increases do NOT invalidate existing licenses
```

### 3. Blockchain Immutability

All licenses are permanently recorded on the Fuego blockchain, making them:
- **Verifiable**: Anyone can verify ownership
- **Immutable**: Cannot be revoked or altered
- **Transparent**: All licenses publicly auditable

## Usage Examples

### Streaming Access Control

```typescript
async function streamTrack(trackId: string, userPublicKey: string) {
  const album = await getAlbumByTrackId(trackId);
  
  if (album.isPaidContent) {
    const hasLicense = await licenseChecker.hasLicense(
      userPublicKey,
      album.albumId
    );
    
    if (!hasLicense) {
      return { error: 'PURCHASE_REQUIRED' };
    }
  }
  
  return await streamTrackContent(trackId);
}
```

### Download Access Control

```typescript
async function downloadAlbum(albumId: string, userPublicKey: string) {
  const hasLicense = await licenseChecker.hasLicense(
    userPublicKey,
    albumId
  );
  
  if (!hasLicense) {
    throw new Error('Album purchase required for download');
  }
  
  // Generate one-time download link with temporary access key
  const downloadToken = generateDownloadToken(albumId, userPublicKey);
  return { downloadUrl: `/api/download-album/${albumId}?token=${downloadToken}` };
}
```

### Premium Access Integration

```typescript
async function checkAccess(userPublicKey: string, albumId: string) {
  const licenseChecker = new AlbumLicenseChecker(rpcClient);
  
  // Check license ownership
  const hasLicense = await licenseChecker.hasLicense(userPublicKey, albumId);
  
  // Check premium access
  const userBalance = await fuegoRPC.getBalance(userPublicKey);
  const hasPremium = userBalance >= 1000000; // 0.1 XFG
  
  return {
    hasLicense,
    hasPremium,
    canAccess: hasLicense || hasPremium
  };
}
```

## Integration Points

### 1. Elderfier Audio Service

Elderfiers verify licenses before serving encrypted audio:

```typescript
async function serveEncryptedTrack(trackId: string, userPublicKey: string, licenseTxHash: string) {
  // Verify license on blockchain
  const isValid = await validateAlbumLicense(
    trackId,
    userPublicKey,
    licenseTxHash
  );
  
  if (!isValid) {
    throw new Error('Invalid license');
  }
  
  // Stream encrypted audio
  return await streamEncryptedTrack(trackId);
}
```

### 2. P2P Network Integration

The AudioShareNetwork enforces license verification:

```typescript
class AudioShareNetwork {
  async verifyContentDistributionRights(file: AudioFileShare): Promise<boolean> {
    if (!file.isPaidContent) return true;
    
    if (!file.albumId) return false;
    
    // Check if user has license for paid content
    return await this.licenseChecker.hasLicense(
      this.userId,
      file.albumId
    );
  }
}
```

### 3. Artist Dashboard

Artists can view their album license sales:

```typescript
async function getAlbumLicenseSales(artistPublicKey: string, albumId: string) {
  const licenses = await getAlbumLicenses('', albumId);
  
  return licenses
    .filter(l => l.artistKey === artistPublicKey)
    .map(l => ({
      txHash: l.txHash,
      purchaseAmount: l.purchaseAmount,
      timestamp: l.timestamp,
      buyerKey: l.buyerKey
    }));
}
```

## Transaction Flow

```
┌─────────────────┐
│  User Purchases │
│     Album        │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Create XFG Tx   │
│   with 0x0B      │
│ License Extra   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Broadcast to    │
│ Fuego Network   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Block Included  │
│  License Live    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  User Can Now   │
│  Stream Album   │
└─────────────────┘
```

## Status

### Implemented
- ✅ Transaction Extra Type 0x0B structure (C++)
- ✅ RPC command definitions
- ✅ Frontend license checker
- ✅ Album purchase manager
- ✅ Fuego RPC bridge integration
- ✅ License verification logic
- ✅ Artist signature verification

### In Progress
- 🔄 Actual blockchain transaction creation
- 🔄 Blockchain scanning for 0x0B transactions
- 🔄 Integration with Elderfier service
- 🔄 Download access control

### Planned
- ⏳ License transfer functionality
- ⏳ License expiry mechanisms
- ⏳ License resale marketplace
- ⏳ Gift license functionality

## References

- **Transaction Extra Types**: `fuego-core/src/CryptoNoteCore/TransactionExtra.h`
- **License Checker**: `frontend-arch/src/utils/licenseCheck.ts`
- **Purchase Manager**: `frontend-arch/src/utils/albumPurchase.ts`
- **RPC Server**: `fuego-core/src/Rpc/RpcServer.cpp`
- **Implementation Guide**: `fuego-core/docs/ALBUM_LICENSE_IMPLEMENTATION.md`

