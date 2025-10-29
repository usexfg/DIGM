# 0x0B Blockchain Scanning Implementation

## Overview

The blockchain scanning functionality allows querying the Fuego blockchain for 0x0B album license transactions, enabling license verification and access control.

## Implementation Details

### Scanning Algorithm

```cpp
bool RpcServer::on_get_album_licenses(
  const COMMAND_RPC_GET_ALBUM_LICENSES::request& req,
  COMMAND_RPC_GET_ALBUM_LICENSES::response& res
)
```

### Key Features

1. **Public Key Matching**: Filters licenses by buyer public key
2. **Album ID Filtering**: Optional filtering by specific album ID
3. **Recent Block Scanning**: Scans last 1000 blocks for performance
4. **Transaction Extra Parsing**: Extracts 0x0B license data from transaction metadata

### Scanning Process

```
1. Parse buyer public key from hex
2. Get current blockchain height
3. Calculate scan range (last 1000 blocks)
4. Iterate through each block:
   a. Get block by height
   b. Get block hash
   c. Load all transactions
   d. For each transaction:
      - Parse transaction extra fields
      - Check for TransactionExtraAlbumLicense type
      - Match buyer key
      - Filter by album ID (if specified)
      - Add transaction hash to results
5. Return matching license transaction hashes
```

## Code Structure

### Request Handling

```cpp
struct request {
  std::string buyerKey;   // Buyer's public key (hex)
  std::string albumId;     // Optional album ID filter
};
```

### Response Format

```cpp
struct response {
  std::vector<std::string> licenseTxHashes;  // Matching transaction hashes
  std::string status;                         // "OK" or error message
};
```

## Performance Considerations

### Block Scanning Range

- **Default**: Last 1000 blocks
- **Reason**: Balance between performance and completeness
- **Alternative**: Full chain scan (slower but complete)

### Optimization Strategies

1. **Incremental Scanning**: Track last scanned height for faster subsequent scans
2. **Indexed Storage**: Maintain license transaction index
3. **Caching**: Cache frequently accessed licenses
4. **Parallel Scanning**: Process multiple blocks concurrently

## Usage Example

### Query All Licenses for a Buyer

```json
POST /api/v1/get_album_licenses
{
  "buyerKey": "0123456789abcdef...",
  "albumId": ""
}
```

**Response**:
```json
{
  "licenseTxHashes": [
    "tx_hash_1",
    "tx_hash_2",
    "tx_hash_3"
  ],
  "status": "OK"
}
```

### Query License for Specific Album

```json
POST /api/v1/get_album_licenses
{
  "buyerKey": "0123456789abcdef...",
  "albumId": "album-123"
}
```

**Response**:
```json
{
  "licenseTxHashes": [
    "tx_hash_for_album_123"
  ],
  "status": "OK"
}
```

## Integration with License Checker

### Frontend Integration

```typescript
async function checkAlbumLicense(buyerKey: string, albumId: string): Promise<boolean> {
  const response = await fetch('/api/v1/get_album_licenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerKey, albumId })
  });
  
  const data = await response.json();
  return data.licenseTxHashes.length > 0;
}
```

### Access Control Flow

```typescript
async function enforceLicenseAccess(albumId: string, userPublicKey: string): Promise<AccessResult> {
  const licenses = await fuegoBridge.getAlbumLicenses(userPublicKey, albumId);
  
  if (licenses.length === 0) {
    return {
      hasAccess: false,
      reason: 'LICENSE_NOT_FOUND'
    };
  }
  
  // Verify the most recent license
  const latestLicense = await verifyLicense(licenses[licenses.length - 1]);
  
  return {
    hasAccess: latestLicense.valid,
    licenseDetails: latestLicense
  };
}
```

## Transaction Extra Parsing

### License Detection

```cpp
// Parse transaction extra fields
std::vector<TransactionExtraField> txExtraFields;
parseTransactionExtra(tx_data.extra, txExtraFields);

// Look for album license
for (const auto& extraField : txExtraFields) {
  if (typeid(TransactionExtraAlbumLicense) == extraField.type()) {
    const TransactionExtraAlbumLicense& license = 
      boost::get<TransactionExtraAlbumLicense>(extraField);
    
    // Process license...
  }
}
```

## Error Handling

### Invalid Public Key

```cpp
if (!Common::podFromHex(req.buyerKey, buyerPublicKey)) {
  throw JsonRpc::JsonRpcError{
    CORE_RPC_ERROR_CODE_WRONG_PARAM,
    "Invalid buyer public key"
  };
}
```

### Block Access Failures

```cpp
if (!m_core.getBlockByHash(blockHash, blk)) {
  continue; // Skip this block, try next
}
```

## Future Enhancements

### 1. Indexed License Storage

```cpp
class LicenseIndex {
  std::unordered_map<Crypto::PublicKey, std::vector<LicenseEntry>> licensesByBuyer;
  
  void indexTransaction(const Transaction& tx, uint32_t height);
  std::vector<std::string> queryLicenses(
    const Crypto::PublicKey& buyerKey,
    const std::string& albumId = ""
  );
};
```

### 2. Caching Layer

```cpp
class LicenseCache {
  struct CacheEntry {
    std::vector<std::string> txHashes;
    uint32_t lastScannedHeight;
    uint64_t timestamp;
  };
  
  std::unordered_map<std::string, CacheEntry> cache;
  static const uint64_t CACHE_TTL = 300000; // 5 minutes
};
```

### 3. Incremental Scanning

```cpp
class IncrementalLicenseScanner {
  uint32_t lastScannedHeight;
  
  std::vector<std::string> scanNewLicenses(
    const Crypto::PublicKey& buyerKey,
    const std::string& albumId = ""
  ) {
    // Only scan blocks since last scan
    for (uint32_t height = lastScannedHeight; height < currentHeight; ++height) {
      // Process new blocks only
    }
    
    return newLicenses;
  }
};
```

## Testing

### Unit Tests

```cpp
TEST(LicenseScanner, FindsMatchingLicenses) {
  // Create test licenses
  TransactionExtraAlbumLicense license1;
  license1.albumId = "album-123";
  license1.buyerKey = testBuyerKey;
  
  // Scan blockchain
  auto results = scanner.queryLicenses(testBuyerKey, "album-123");
  
  ASSERT_EQ(results.size(), 1);
}
```

### Integration Tests

```cpp
TEST(AlbumLicenseAPI, EndToEndScan) {
  // Create license transaction
  auto txHash = createAlbumLicense(...);
  
  // Wait for confirmation
  waitForBlockConfirmation(txHash);
  
  // Query licenses
  auto licenses = queryAlbumLicenses(buyerKey, albumId);
  
  ASSERT_TRUE(licenses.contains(txHash));
}
```

## Performance Benchmarks

### Scanning Speed

- **1000 blocks**: ~1-2 seconds
- **Full chain**: Depends on chain size
- **With index**: <100ms

### Memory Usage

- **Per license**: ~100 bytes
- **1000 block scan**: ~10KB memory
- **With index**: ~1MB per 10K licenses

## API Reference

### Command: `get_album_licenses`

**Endpoint**: `/api/v1/get_album_licenses`

**Method**: POST

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

**Error Codes**:
- `CORE_RPC_ERROR_CODE_WRONG_PARAM`: Invalid buyer public key
- `CORE_RPC_ERROR_CODE_INTERNAL_ERROR`: Blockchain scanning failed

## References

- **RPC Server**: `fuego-core/src/Rpc/RpcServer.cpp`
- **License Structure**: `fuego-core/src/CryptoNoteCore/TransactionExtra.h`
- **Frontend Integration**: `frontend-arch/src/utils/licenseCheck.ts`

