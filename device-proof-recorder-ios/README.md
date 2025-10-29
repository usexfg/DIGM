# DIGM ◉rigins - iOS

Secure audio recording app with hardware-backed cryptographic proof using the device's built-in microphone and Secure Enclave.

**Tagline**: "Authentic audio, cryptographically proven"

## Features

- **Built-in Microphone Only**: Enforces recording from device's internal microphone only
- **Hardware-Signed Proof**: Uses Secure Enclave for cryptographic signing
- **Real-Time Hashing**: SHA-256 hash generated during recording
- **Proof Bundle**: Audio file + JSON metadata with signatures
- **External Mic Detection**: Blocks recording if external microphones are detected

## Requirements

- iOS 15.0+
- Physical iOS device with Secure Enclave (not available in simulator)
- Microphone permissions

## Setup

1. Open the `device-proof-recorder-ios` folder in Xcode
2. Build and run on a physical iOS device
3. Grant microphone permissions when prompted

## Usage

1. **Start Recording**: Tap the green "Start Recording" button
2. **Record Audio**: Speak into the device's built-in microphone
3. **Stop Recording**: Tap the red "Stop Recording" button
4. **Share Proof**: Tap "Share Proof Bundle" to export the audio + JSON proof file

## Proof Bundle Structure

### Audio File
- Format: WAV (PCM, 48kHz, 16-bit, mono)
- Location: Temporary directory
- Filename: `{UUID}.wav`

### Proof JSON
```json
{
  "sha256": "base64_encoded_audio_hash",
  "signature": "base64_encoded_secure_enclave_signature",
  "pubKey": "base64_encoded_public_key",
  "nonce": "unique_proof_identifier",
  "timestamp": "2024-01-15T10:30:00Z",
  "device": {
    "model": "iPhone 14 Pro",
    "platform": "iOS",
    "version": "17.2"
  }
}
```

## Security Features

### 1. Built-in Microphone Enforcement
- Detects external microphones via USB, Bluetooth, or wired headsets
- Blocks recording if external devices are detected
- Shows alert to unplug external devices

### 2. Secure Enclave Integration
- Private keys never leave secure hardware
- Hardware-backed signatures
- Device-specific attestation

### 3. Cryptographic Proof
- SHA-256 hash of entire audio recording
- ECDSA signature with Secure Enclave key
- Tamper-proof proof of authenticity

## Architecture

```
┌─────────────────────┐
│  ContentView.swift  │  # SwiftUI interface
├─────────────────────┤
│  Recorder.swift     │  # Audio capture + hashing
├─────────────────────┤
│SecureEnclaveKey.swift│  # Hardware key management
├─────────────────────┤
│RecorderViewModel.swift│ # State management
└─────────────────────┘
```

## Recording Flow

```
1. Check permissions
   ↓
2. Force built-in microphone
   ↓
3. Check for external microphones (reject if found)
   ↓
4. Start recording + real-time hashing
   ↓
5. User stops recording
   ↓
6. Generate SHA-256 hash
   ↓
7. Sign hash with Secure Enclave key
   ↓
8. Create proof bundle
   ↓
9. Export audio + JSON
```

## Building

```bash
# Open in Xcode
open device-proof-recorder-ios/ContentView.swift

# Or from command line
xcodebuild -project device-proof-recorder-ios.xcodeproj \
           -scheme ContentView \
           -sdk iphoneos \
           -configuration Release
```

## Testing

Requires physical iOS device with Secure Enclave:

1. **Recording Test**: Record 30 seconds of audio, verify proof bundle
2. **External Mic Test**: Plug in external microphone, verify detection
3. **Signature Test**: Verify signature with public key
4. **Hash Test**: Verify audio hash matches proof

## Limitations

- Requires iOS 15.0+ (Secure Enclave features)
- Physical device required (simulators don't have Secure Enclave)
- Internet connection required for sharing (optional)
- Maximum recording time: Limited by device storage

## Troubleshooting

### "External Microphone Detected"
- Unplug all external microphones, USB audio devices, or Bluetooth headsets
- Close and reopen the app
- Retry recording

### "Permission Denied"
- Go to Settings > DIGM Proof Recorder > Microphone
- Enable microphone access
- Retry recording

### "Secure Enclave Not Available"
- Ensure you're running on a physical device (not simulator)
- Check device supports Secure Enclave (iPhone 5s+)

## License

Part of the DIGM platform - see LICENSE file in parent directory.

