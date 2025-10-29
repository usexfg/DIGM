# DIGM Audio Format - Complete Implementation

## Overview

The **DIGM audio container format (.digm)** is a cryptographically-signed audio container that provides proof-of-origin using hardware-backed signatures. This document describes the complete reference implementation in Rust.

## Format Specification

### File Structure

```
[DIGM Magic: 4 bytes]
[Version: 1 byte]
[Reserved: 3 bytes]
[Header JSON length: 4 bytes LE]
[Header JSON: variable]
[Audio length: 8 bytes LE]
[Audio data: variable]
[Signature length: 4 bytes LE]
[Signature: variable (DER-encoded ECDSA)]
[Public key length: 4 bytes LE]
[Public key: variable (DER/PEM)]
[TSA length: 4 bytes LE]
[TSA data: variable]
[Sensor JSON length: 4 bytes LE]
[Sensor JSON: variable]
[File hash: 32 bytes (SHA-256)]
```

### Header Format

```json
{
  "sample_rate": 48000,
  "channels": 1,
  "bit_depth": 16,
  "encoding": "pcm16le",
  "duration_ms": null,
  "nonce": "uuid-v4",
  "created_iso8601": "2024-01-15T10:30:00Z",
  "app": "digm-ios/1.0",
  "device_model": "iPhone 14 Pro",
  "canonicalization": "pcm16le,48kHz,mono"
}
```

## Implementation Architecture

### Rust Library Structure

```
digm_ref/
├── Cargo.toml           # Rust project configuration
├── src/
│   ├── lib.rs           # Library entry point
│   ├── format.rs        # Header struct & constants
│   ├── writer_stream.rs # Streaming writer (no full buffering)
│   ├── reader.rs        # File reader
│   ├── verify.rs        # Verification logic
│   └── ffi.rs           # C FFI bindings
├── include/
│   └── digm.h           # C header file
├── src/bin/
│   ├── digm-encode.rs   # CLI encoder
│   └── digm-info.rs     # CLI inspector
└── tests/
    └── roundtrip.rs     # Unit tests
```

## Key Features

### 1. Streaming Writer

**File**: `src/writer_stream.rs`

Features:
- Reads audio in chunks (16KB buffer)
- Computes SHA-256 digest during write
- No full-file buffering required
- Patches audio length after writing
- Computes final file hash

```rust
pub fn write_digm_stream<R: Read>(
    audio_reader: R,
    out_path: &Path,
    header: &Header,
    signature: &[u8],
    public_key: &[u8],
    tsa: Option<&[u8]>,
    sensor_json: Option<&[u8]>,
) -> Result<()>
```

### 2. File Reader

**File**: `src/reader.rs`

Features:
- Reads complete .digm file
- Parses all fields
- Returns structured `DigmFile` struct
- Validates magic bytes

```rust
pub struct DigmFile {
    pub header: Header,
    pub audio: Vec<u8>,
    pub signature: Vec<u8>,
    pub public_key: Vec<u8>,
    pub tsa: Vec<u8>,
    pub sensor_json: Vec<u8>,
    pub file_hash: [u8;32],
}
```

### 3. Verification

**File**: `src/verify.rs`

Features:
- Verifies ECDSA signature over audio hash
- Verifies file hash for tamper detection
- Supports DER and PEM public keys
- Detailed error reporting

```rust
pub fn verify_audio_signature(d: &DigmFile) -> Result<()>
pub fn verify_file_hash(path: &Path) -> Result<()>
```

### 4. C FFI

**File**: `src/ffi.rs` & `include/digm.h`

Exposes two functions:

```c
// Encode raw PCM to .digm with signature
int digm_encode_from_raw(
    const char* input_path,
    const char* out_path,
    const uint8_t* signature,
    size_t sig_len,
    const uint8_t* public_key,
    size_t public_key_len
);

// Verify .digm file
int digm_verify_full(const char* path);
// Returns: 0=OK, 1=read error, 2=signature failed, 3=file hash failed
```

## Security Model

### Signature Flow

```
1. Record audio (PCM16LE, 48kHz, mono)
   ↓
2. Compute SHA-256(audio_bytes)
   ↓
3. Sign hash with device private key (Secure Enclave/Keystore)
   ↓
4. Encode to .digm format with signature + public key
   ↓
5. Append SHA-256(entire_file_except_last_32_bytes)
```

### Verification Flow

```
1. Read .digm file
   ↓
2. Extract audio, signature, public key
   ↓
3. Verify audio signature:
   - Compute SHA-256(audio)
   - Verify ECDSA signature with public key
   ↓
4. Sep verify file hash:
   - Compute SHA-256(file_content[:-32])
   - Compare with last 32 bytes
```

## Integration with Hardware Signatures

### iOS Integration

```swift
// In iOS app after recording
let audioData = // ... PCM audio bytes

// Compute digest
let digest = SHA256.hash(data: audioData)

// Sign with Secure Enclave
let sig = try secureEnclaveKey.sign(data: digest)
let signature = sig.derRepresentation  // DER-encoded bytes

// Get public key
let publicKey = secureEnclaveKey.publicKey.rawRepresentation

// Pass to Rust (via FFI or server)
// In Rust:
write_digm_stream(
    audio_file,
    "output.digm",
    &header,
    signature_bytes,
    public_key_bytes,
    None,  // No TSA
    None   // No sensor data
)
```

### Android Integration

```kotlin
// In Android app after recording
val audioData: ByteArray = // ... PCM audio bytes

// Compute digest
val digest = MessageDigest.getInstance("SHA-256")
    .digest(audioData)

// Sign with Android Keystore
val signature = Signature.getInstance("SHA256withECDSA")
signature.initSign(privateKey)
signature.update(digest)
val sigBytes = signature.sign()  // DER-encoded

// Get public key
val publicKey = keyEntry.certificate.publicKey.encoded

// Pass to Rust (via JNI FFI or server)
// In Rust:
write_digm_stream(
    audio_file,
    "output.digm",
    &header,
    sigBytes,
    publicKey,
    None,  // No TSA
    None   // No sensor data
)
```

## Usage Examples

### CLI Encoding

```bash
# Create test input (Python)
python3 generate_test_audio.py  # Creates input.raw

# Encode to .digm
cargo run --release --bin digm-encode -- \
    input.raw output.digm \
    --sample-rate 48000 \
    --channels 1
```

### CLI Inspection

```bash
# Inspect .digm file
cargo run --release --bin digm-info -- output.digm

# Output:
# Header: Header { ... }
# Audio bytes: 9600
# Signature bytes: 72
# Public key bytes: 91
# Audio signature: OK
# File hash: OK
```

### C FFI Usage

```c
#include "digm.h"
#include <stdio.h>

int main() {
    // Load signature and public key from files
    uint8_t sig[256];
    uint8_t pub[512];
    size_t sig_len, pub_len;
    
    // ... load from files ...
    
    int result = digm_encode_from_raw(
        "input.raw",
        "output.digm",
        sig, sig_len,
        pub, pub_len
    );
    
    if (result == 0) {
        printf("Encoded successfully\n");
        
        int verify = digm_verify_full("output.digm");
        if (verify == 0) {
            printf("Verification OK\n");
        } else {
            printf("Verification failed: %d\n", verify);
        }
    }
    
    return result;
}
```

## Build Instructions

### Prerequisites

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Build

```bash
cd digm_ref
cargo build --release
```

### Test

```bash
cargo test
```

### Generate Test Audio

```python
# generate_test_audio.py
import math, struct

sr = 48000
duration = 1.0  # 1 second
frames = int(sr * duration)
freq = 1000  # 1kHz sine wave

with open("input.raw", "wb") as f:
    for i in range(frames):
        phase = 2 * math.pi * freq * (i / sr)
        sample = 0.5 * math.sin(phase)
        s16 = int(sample * 32767)
        f.write(struct.pack("<h", s16))

print(f"Generated {frames} samples to input.raw")
```

## Production Integration

### Option 1: Embedded Rust (Recommended)

- Build `digm_ref` as static library
- Link with iOS/Android native apps
- Call Rust functions directly via FFI
- No external dependencies

### Option 2: Server-Side Encoding

- Mobile app computes signature
- Sends audio + signature to server
- Server constructs .digm file
- Returns complete .digm file

### Option 3: C FFI Wrapper

- Build as `libdigm_ref.so` / `.dylib` / `.dll`
- Load dynamically in mobile apps
- Use C FFI interface
- Simple integration

## Integration with DIGM Platform

### Upload Flow

```typescript
async function uploadDigmFile(digmFile: File) {
    // 1. Verify .digm file
    const isValid = await verifyDigmFile(digmFile);
    
    if (!isValid) {
        throw new Error('Invalid .digm file');
    }
    
    // 2. Extract audio and metadata
    const { audio, header, signature, publicKey } = 
        await parseDigmFile(digmFile);
    
    // 3. Upload audio to Elderfier network
    const audioHash = await uploadToEldefier(audio);
    
    // 4. Create 0x0B license transaction
    const txHash = await fuegoBridge.createAlbumLicense({
        albumId: header.albumId,
        buyerKey: publicKey,
        purchaseAmount: header.price,
        timestamp: header.created_iso8601,
        artistKey: artistPublicKey,
        artistSig: signature,
        version: 1
    });
    
    return { txHash, audioHash };
}
```

## Performance Characteristics

### Memory Usage

- **Writer**: Constant (16KB buffer)
- **Reader**: O(audio_size) - loads full file
- **Verification**: O(audio_size) - hashes audio

### Speed

- **Encoding**: ~100MB/s (limited by disk I/O)
- **Verification**: ~200MB/s (two SHA-256 passes)
- **File Size Overhead**: ~200 bytes + signature

### Scalability

- **Streaming Writer**: Handles files of any size
- **No Full Buffering**: Suitable for mobile devices
- **Efficient**: Minimal CPU usage during encoding

## Security Considerations

### 1. Signature Verification

✅ **Verified**: Audio content hasn't been tampered  
✅ **Verified**: Signature from device private key  
⚠️ **Requires**: Public key in trusted registry

### 2. File Hash Verification

✅ **Verified**: Entire file integrity  
✅ **Detects**: Any modification including metadata  
⚠️ **Limitation**: Re-computes hash on every verify

### 3. TSA (Time Stamping Authority)

**Optional**: If `tsa` field populated:
- Timestamp signature for auditability
- Indisputable recording timestamp
- Long-term signature validity

### 4. Sensor Data

**Optional**: If `sensor_json` populated:
- Environmental sensor readings
- GPS location data
- Device orientation
- Temperature, pressure, etc.

## Future Enhancements

### 1. Encryption

- Add AES-256-GCM encryption option
- Encrypt audio payload
- Include encryption key in header (encrypted)

### 2. Compression

- Support FLAC/Opus encoding
- Compress audio before signing
- Maintain cryptographic guarantees

### 3. Streaming

- Support streaming verification
- Verify signature without loading full file
- Progressive audio verification

### 4. Multi-Format

- Support WAV, FLAC, MP3 input
- Automatic format conversion
- Canonical format enforcement

## License

Part of the DIGM platform - see LICENSE file in parent directory.

