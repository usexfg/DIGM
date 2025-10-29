# DIGM Reference Implementation - Build Instructions

## Prerequisites

### Install Rust

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installation
rustc --version
cargo --version
```

### Install Dependencies (Optional)

For testing with .digm files, you may want:
- `ffmpeg` for audio format conversion
- `sox` for audio processing

## Building

### Build Library

```bash
cd digm_ref
cargo build --release
```

This creates:
- `target/release/libdigm_ref.a` - Static library
- `target/release/libdigm_ref.so` - Dynamic library (Linux)
- `target/release/libdigm_ref.dylib` - Dynamic library (macOS)
- `target/release/digsm_ref.dll` - Dynamic library (Windows)

### Build CLI Tools

```bash
cargo build --release --bin digm-encode
cargo build --release --bin digm-info
```

Or build everything:

```bash
cargo build --release
```

## Running Tests

```bash
cargo test
```

The `roundtrip` test creates synthetic audio, encodes it to .digm format, then verifies the signature and file hash.

## Creating Test Audio

### Python Script

Create `generate_test_audio.py`:

```python
import math
import struct

sr = 48000  # Sample rate
duration = 1.0  # 1 second
frames = int(sr * duration)
freq = 1000  # 1 kHz sine wave

with open("input.raw", "wb") as f:
    for i in range(frames):
        phase = 2 * math.pi * freq * (i / sr)
        sample = 0.5 * math.sin(phase)
        s16 = int(sample * 32767)
        f.write(struct.pack("<h", s16))  # Little-endian signed 16-bit

print(f"Generated {frames} samples ({duration}s) to input.raw")
```

Run it:

```bash
python3 generate_test_audio.py
```

### Generate with SoX (Alternative)

```bash
sox -r 48000 -c 1 -b 16 input.raw -n synth 1 sine 1000
```

### Generate with ffmpeg (Alternative)

```bash
ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" -acodec pcm_s16le -ar 48000 -ac 1 input.raw
```

## Using CLI Tools

### Encode Audio to .digm

```bash
# Encode with defaults (48kHz, mono)
cargo run --release --bin digm-encode -- input.raw output.digm

# Custom sample rate
cargo run --release --bin digm-encode -- input.raw output.digm --sample-rate 44100

# Custom channels
cargo run --release --bin digm-encode -- input.raw output.digm --channels 2
```

### Inspect .digm File

```bash
cargo run --release --bin digm-info -- output.digm
```

Output:
```
DIGM File Info:
  Header: Header { sample_rate: 48000, channels: 1, ... }
  Audio bytes: 9600
  Signature bytes: 72
  Public key bytes: 91

Verification:
  ✅ Audio signature: OK
  ✅ File hash: OK
```

## Using C FFI

### C Header

The header is at `include/digm.h`:

```c
#ifndef DIGM_H
#define DIGM_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

int digm_encode_from_raw(
    const char* input_path,
    const char* out_path,
    const uint8_t* signature,
    size_t sig_len,
    const uint8_t* public_key,
    size_t public_key_len
);

int digm_verify_full(const char* path);

#ifdef __cplusplus
}
#endif

#endif // DIGM_H
```

### Example C Usage

```c
#include "digm.h"
#include <stdio.h>

int main() {
    const char* in = "input.raw";
    const char* out = "output.digm";
    
    // Load signature and public key from files
    uint8_t sig[256];
    uint8_t pub[512];
    size_t sig_len, pub_len;
    
    // ... load from files ...
    
    int result = digm_encode_from_raw(
        in, out,
        sig, sig_len,
        pub, pub_len
    );
    
    if (result == 0) {
        printf("Encoded successfully\n");
        
        int verify = digm_verify_full(out);
        if (verify == 0) {
            printf("Verification OK\n");
        } else {
            printf("Verification failed: %d\n", verify);
        }
    } else {
        printf("Encoding failed: %d\n", result);
    }
    
    return result;
}
```

Compile (after building libdigm_ref):

```bash
gcc -o test test.c -Ltarget/release -ldigk_ref -lpthread -ldl
```

## Integration with Mobile Apps

### iOS Integration

1. Build Rust library as static library
2. Add to Xcode project
3. Link with Swift via bridging header
4. Call Rust functions from Swift

Example Swift:

```swift
import Foundation

func encodeDigm(audioPath: String, outputPath: String, sig: [UInt8], pubKey: [UInt8]) -> Int32 {
    audioPath.withCString { inPtr in
        outputPath.withCString { outPtr in
            sig.withUnsafeBytes { sigPtr in
                pubKey.withUnsafeBytes { pubPtr in
                    digm_encode_from_raw(
                        inPtr, outPtr,
                        sigPtr.baseAddress!, sigPtr.count,
                        pubPtr.baseAddress!, pubPtr.count
                    )
                }
            }
        }
    }
}
```

### Android Integration (via JNI)

1. Build Rust library
2. Create JNI wrapper
3. Load native library in Android
4. Call from Kotlin/Java

## Performance

### Encoding Speed

- **Small files (<1MB)**: Instant
- **Medium files (1-10MB)**: <100ms
- **Large files (10-100MB)**: 1-10 seconds
- **Speed**: ~100MB/s

### Memory Usage

- **Writer**: Constant (16KB buffer)
- **Reader**: O(audio_size)
- **Verifier**: O(audio_size)

## Troubleshooting

### "not a DIGM file"

The file you're trying to read isn't a valid .digm file. Check:
- File actually exists
- File wasn't corrupted
- File was created by this library

### "signature verify failed"

The signature doesn't match the audio content. Possible causes:
- Audio was modified after signing
- Wrong public key used for verification
- Signature corrupted

### "file hash mismatch"

The file integrity check failed. Possible causes:
- File was modified after creation
- File transfer corruption
- Disk error during write

## Next Steps

1. Test with real audio files
2. Integrate with iOS app
3. Integrate with Android app
4. Add to DIGM platform

## License

Part of the DIGM platform - see LICENSE file in parent directory.

