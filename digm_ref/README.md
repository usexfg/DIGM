# DIGM Audio Format - Rust Reference Implementation

Reference implementation of the .digm audio container format with cryptographic proof of origin.

## Features

- **Streaming Writer**: Efficiently encodes large audio files without full buffering
- **Cryptographic Signing**: ECDSA signatures over audio content
- **File Hash Verification**: SHA-256 hash of entire file for tamper detection
- **C FFI**: Can be integrated with C/C++ applications
- **Hardware Signature Support**: Ready for Secure Enclave/Keystore integration

## Format Specification

### Structure
```
[DIGM Magic: 4 bytes]
[Version: 1 byte]
[Reserved: 3 bytes]
[Header JSON length: 4 bytes (LE)]
[Header JSON: variable]
[Audio length: 8 bytes (LE)]
[Audio data: variable]
[Signature length: 4 bytes (LE)]
[Signature data: variable]
[Public key length: 4 bytes (LE)]
[Public key data: variable]
[TSA length: 4 bytes (LE)]
[TSA data: variable]
[Sensor JSON length: 4 bytes (LE)]
[Sensor JSON: variable]
[File hash: 32 bytes]
```

## Building

```bash
cargo build --release
```

## Usage

### Encode Audio File

```bash
cargo run --release --bin digm-encode -- input.raw output.digm --sample-rate 48000 --channels 1
```

### Inspect .digm File

```bash
cargo run --release --bin digm-info -- output.digm
```

### C FFI Usage

See `include/digm.h` for C API and `src/ffi.rs` for implementation.

```c
#include "digm.h"

// Encode with signature and public key
int result = digm_encode_from_raw(
    "input.raw",
    "output.digm",
    signature_bytes,
    signature_len,
    public_key_bytes,
    public_key_len
);

// Verify complete file
int verify_result = digm_verify_full("output.digm");
// 0 = OK, 1 = read error, 2 = signature failed, 3 = file hash failed
```

## Integration with Hardware Signatures

### iOS Secure Enclave

```swift
// After recording, compute SHA-256 digest
let digest = SHA256.hash(data: audioData)

// Sign with Secure Enclave
let sig = try secureEnclaveKey.sign(data: digest)
let signature = sig.derRepresentation

// Get public key
let publicKey = secureEnclaveKey.publicKey.rawRepresentation

// Pass to Rust FFI or encode via server
```

### Android Keystore

```kotlin
// After recording, compute digest
val digest = MessageDigest.getInstance("SHA-256").digest(audioData)

// Sign with Android Keystore
val signature = Signature.getInstance("SHA256withECDSA")
signature.initSign(privateKey)
signature.update(digest)
val sigBytes = signature.sign()  // DER format

// Get public key
val publicKey = keyEntry.certificate.publicKey.encoded

// Pass to Rust FFI or encode via server
```

## Testing

```bash
cargo test
```

This runs the roundtrip test which creates synthetic audio, signs it, and verifies.

## License

Part of the DIGM platform - see LICENSE file in parent directory.

