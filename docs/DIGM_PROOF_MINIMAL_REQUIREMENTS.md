# DIGM Proof Minimal Requirements Analysis

## Absolute Minimum Requirements

### Question: What is the absolute minimum for proof-of-device-mic recording?

**Answer**: Only **2 cryptographic elements** are absolutely required:
1. **Audio Hash** (SHA-256 digest)
2. **Signature** (Hardware-signed proof)

Everything else is **metadata for context or verification** but not cryptographically required.

---

## Current Proof Bundle Structure

```json
{
  "sha256": "...",           // ✅ ABSOLUTELY REQUIRED
  "signature": "...",        // ✅ ABSOLUTELY REQUIRED
  "pubKey": "...",           // ⚠️ Required for verification only
  "nonce": "...",            // 🔄 Optional (prevents replay)
  "timestamp": "...",        // 🔄 Optional (provides context)
  "device": {...}           // 🔄 Optional (provides context)
}
```

---

## Cryptographic Requirements (Absolute Minimum)

### Required: Audio Hash (SHA-256)

**Why**: Proves content integrity
```swift
let digest = SHA256.hash(data: audioData)
```

**Purpose**:
- Verifies audio hasn't been tampered with
- Proves what was actually recorded
- Cryptographic binding between audio and proof

**Can we reduce?**: ❌ **No** - This is the core proof data

---

### Required: Hardware Signature

**Why**: Proves it came from device's Secure Enclave
```swift
let signature = try SecureEnclaveKeyManager.shared.sign(data: digest)
```

**Purpose**:
- Proves signature came from hardware (not software-generated)
- Links proof to specific device
- Non-repudiation (device can't deny signing)

**Can we reduce?**: ❌ **No** - This proves device origin

---

## Optional Metadata (Can Be Reduced)

### 1. Public Key

**Current**: Included in every proof bundle  
**Purpose**: Verify signature  
**Reducible?**: ✅ **Yes** - Can be derived/registered separately

**Optimization**:
```
Option A: Register device public keys in centralized database
Option B: Include only once per device (not per recording)
Option C: Omit entirely if verifier already has key
```

**Reduced Format**:
```json
{
  "sha256": "...",
  "signature": "..."
  // pubKey omitted - verifier looks it up
}
```

---

### 2. Timestamp

**Current**: Included in every proof bundle  
**Purpose**: When recording occurred  
**Reducible?**: ✅ **Yes** - Can be embedded in signature or omitted

**Options**:
```
Option A: Include timestamp in signature payload
Option B: Infer from blockchain/certificate timestamp
Option C: Omit entirely (verifier doesn't need when it was recorded)
```

**Reduced Format**:
```json
{
  "sha256": "...",
  "signature": "..."  // timestamp can be in signature payload
}
```

---

### 3. Nonce

**Current**: Included in every proof bundle  
**Purpose**: Prevent replay attacks  
**Reducible?**: ✅ **Yes** - Can be replaced with simpler approach

**Options**:
```
Option A: Use audio hash as natural nonce (can't replay)
Option B: Include timestamp in signature (prevents replay)
Option C: Use sequence number per device
Option D: Omit if audio content itself prevents replay
```

**Analysis**: Audio hash already serves as nonce - same audio = same hash  
**Recommendation**: ✅ **Remove nonce** - redundant

---

### 4. Device Metadata

**Current**: Model, platform, version  
**Purpose**: Contextual information  
**Reducible?**: ✅ **Yes** - Purely optional metadata

**Options**:
```
Option A: Omit entirely
Option B: Include once in device registration
Option C: Include only if needed for verification
```

**Recommendation**: ✅ **Remove from proof bundle** - move to separate metadata file

---

## Minimal Proof Structure

### Current (Full)
```json
{
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "signature": "304402207f8e4c7d3e5a8b9f2...",
  "pubKey": "3059301306072a8648ce3d020106082a8648ce3d030107034200...",
  "nonce": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-15T10:30:00Z",
  "device": {
    "model": "iPhone 14 Pro",
    "platform": "iOS",
    "version": "17.2"
  }
}
```

**Size**: ~450 bytes JSON

---

### Minimal (Required Only)
```json
{
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "sig": "304402207f8e4c7d3e5a8b9f2..."
}
```

**Size**: ~160 bytes JSON  
**Reduction**: 64% smaller

---

### Optimized (Balanced)

```json
{
  "h": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "s": "304402207f8e4c7d3e5a8b9f2...",
  "k": "device_public_key_id"  // Reference, not full key
}
```

**Size**: ~120 bytes JSON  
**Reduction**: 73% smaller

---

## Recommendations by Use Case

### 1. Proof-of-Recording (Minimal)

**Use Case**: Just prove audio was recorded on this device

**Required**:
- ✅ Audio hash
- ✅ Signature

**Omit**: Everything else

```json
{
  "h": "sha256_hash",
  "s": "signature"
}
```

---

### 2. Timestamped Proof (Light)

**Use Case**: Prove recording + when it happened

**Required**:
- ✅ Audio hash
- ✅ Signature
- ✅ Timestamp in signature payload

```json
{
  "h": "sha256_hash",
  "s": "signature_including_timestamp"
}
```

**Implementation**: Include timestamp in data being signed
```swift
let dataToSign = digest + timestamp  // Concatenate for signing
let signature = sign(dataToSign)
```

---

### 3. Full Context Proof (Current)

**Use Case**: Complete audit trail with all metadata

**Required**: Everything (current implementation)

---

## Hash Redundancy Analysis

### Current: SHA-256

**Can we use a smaller hash?**: ⚠️ Possible but not recommended

**Options**:
```
SHA-256: 32 bytes  ✅ Current (secure)
SHA-224: 28 bytes  🔄 Possible (less secure)
SHA-512/256: 32 bytes  🔄 Possible (same security, different algo)
Blake3: 32 bytes  🔄 Possible (faster)
```

**Recommendation**: Keep SHA-256 (industry standard, secure, sufficient)

---

### Hash Timing

**Current**: Hash generated during recording (real-time)

**Can we hash after?**: ✅ Yes, but loses continuous integrity

**Trade-offs**:
```
Real-time hashing:     ✅ Proves integrity during capture
                      ⚠️ Slightly more CPU usage
Post-recording hash:   ✅ Simpler implementation
                      ❌ Can't detect tampering during recording
```

**Recommendation**: Keep real-time hashing for integrity guarantee

---

## Timestamp Reduction Strategies

### Current: ISO8601 String

```
"timestamp": "2024-01-15T10:30:00Z"
```

**Size**: ~20 bytes  
**Alternative**: Unix timestamp (8 bytes)

```json
{
  "t": 1705314600  // Unix timestamp (seconds since epoch)
}
```

**Reduction**: 60% smaller

---

### Minimal Timestamp

```json
{
  "t": "240115103000"  // 12 bytes: YYMMDDHHMMSS
}
```

**Reduction**: 40% smaller than ISO8601

---

### Omit Timestamp Entirely

**When acceptable**:
- If blockchain timestamp provides it
- If server provides timestamp
- If timestamp not needed for verification

**Minimal Proof**:
```json
{
  "h": "hash",
  "s": "signature"
  // No timestamp - verifier looks up from blockchain
}
```

---

## Practical Implementation: Minimal Proof

### Code Changes

**Before** (Current):
```swift
let proof: [String: Any] = [
    "sha256": digest.base64EncodedString(),
    "signature": signature.base64EncodedString(),
    "pubKey": pubKey.base64EncodedString(),
    "nonce": nonce,
    "timestamp": ISO8601DateFormatter().string(from: Date()),
    "device": [/* ... */]
]
```

**After** (Minimal):
```swift
let proof: [String: Any] = [
    "h": digest.base64EncodedString(),  // Abbreviated key
    "s": signature.base64EncodedString()  // No other data
]
```

**Size Reduction**: 73% smaller JSON

---

## Proof Verification: What's Actually Needed

### Minimal Verification

**Input**: Proof bundle  
**Process**:
```swift
func verifyProof(_ proof: ProofBundle) -> Bool {
    // 1. Get audio file
    let audioData = try Data(contentsOf: proof.audioURL)
    
    // 2. Hash audio
    let audioHash = SHA256.hash(data: audioData)
    
    // 3. Compare with proof hash
    guard audioHash.hexString == proof.sha256 else {
        return false  // Audio tampered
    }
    
    // 4. Verify signature
    let publicKey = /* get from device registry */
    let isValid = try verifySignature(
        signature: proof.signature,
        data: audioHash,
        publicKey: publicKey
    )
    
    return isValid
}
```

**Required Data**: 
- ✅ Audio hash
- ✅ Signature
- ⚠️ Public key (from registry, not in proof)

---

## Design Patterns

### Pattern 1: Proof-Only Approach

**Proof Bundle Contains**:
- Audio file
- Minimal proof (hash + signature)

**Separate Registry**:
- Device public keys
- Device metadata
- Recording metadata (if needed)

**Example**:
```
recording_123.wav      # Audio file
recording_123.proof    # {"h":"...", "s":"..."}
```

---

### Pattern 2: Self-Contained Proof

**Proof Bundle Contains**:
- Audio file
- Full proof (hash, signature, metadata)

**No External Registry Needed**

**Example**:
```
recording_123.wav      # Audio file
recording_123.proof    # Full JSON with all metadata
```

---

### Pattern 3: Hybrid Approach

**Proof Bundle Contains**:
- Audio file
- Essential proof (hash, signature)
- References to registry entries

**Registry Contains**:
- Full metadata
- Public keys
- Device info

**Example**:
```
recording_123.wav
recording_123.proof    # {"h":"...", "s":"...", "k":"device_id"}
```

---

## Absolute Minimum Requirements Summary

### Required (Cryptographically)

1. **Audio Hash** (SHA-256) - 32 bytes
2. **Signature** (Hardware-signed) - ~72 bytes

**Total**: ~104 bytes

### Optional (Context/Convenience)

3. **Public Key** - Can be in registry
4. **Timestamp** - Can be in signature payload
5. **Nonce** - Redundant with hash
6. **Device Info** - Can be in registry

---

## Recommended Implementation

### Minimal Valid Proof Format

```json
{
  "h": "base64_sha256_hash",
  "s": "base64_signature"
}
```

**Benefits**:
- ✅ Smallest possible proof
- ✅ All verification data present
- ✅ Fast to generate and verify
- ✅ Works without external registry

**Limitations**:
- ⚠️ No timestamp in proof (can be in separate metadata)
- ⚠️ No device info in proof (can be in registry)
- ⚠️ Requires public key lookup

---

## Comparison: Current vs Minimal

| Element | Current | Minimal | Required? |
|---------|---------|---------|-----------|
| SHA-256 hash | ✅ | ✅ | ✅ YES |
| Signature | ✅ | ✅ | ✅ YES |
| Public key | ✅ | ❌ | ⚠️ For verification |
| Nonce | ✅ | ❌ | ❌ No |
| Timestamp | ✅ | ❌ | 🔄 Optional |
| Device info | ✅ | ❌ | ❌ No |

**Size**: Current ~450 bytes → Minimal ~104 bytes (77% reduction)

---

## Conclusion

**Absolute Minimum**: 2 elements (hash + signature)  
**Recommended**: 2 elements + optional timestamp in signature  
**Current**: 6 elements (over-engineered for minimal use case)

**Recommendation**: Implement minimal proof for efficiency, offer full proof as opt-in for detailed auditing.

