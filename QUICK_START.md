# DIGM Platform - Quick Start Guide

## DIGM ◉rigins (Mobile App) & DIGM Platform (Web)

### Branding

- **DIGM ◉rigins**: Mobile app for device-recorded audio with cryptographic proof
- **DIGM Platform**: Full web platform for browsing, purchasing, and streaming device-recorded albums

---

## What Was Built

### 1. DIGM ◉rigins (iOS Mobile App)

**Location**: `device-proof-recorder-ios/`

**Purpose**: Simple voice memo app that creates cryptographically-proven recordings from device microphones.

**Key Features**:
- One-tap recording (like voice memo)
- Secure Enclave cryptographic signatures
- Built-in microphone enforcement only
- .digm proof file generation
- Local storage and playback
- Share recordings with proof

**Status**: ✅ Ready to build in Xcode

### 2. DIGM Platform (Web/Desktop)

**Location**: `frontend/`, `frontend-arch/`

**Purpose**: Complete audio marketplace for browsing, purchasing, and streaming device-recorded albums.

**Key Features**:
- Browse verified device-recorded albums
- Purchase albums with XFG cryptocurrency
- Stream licensed content
- Download for offline play
- Verify cryptographic proofs
- View device attestation details

**Status**: ✅ Existing platform (enhanced with device audio requirements)

### 3. .digm Audio Format

**Location**: `digm_ref/`

**Purpose**: Cryptographic container format for device-proven audio.

**Key Features**:
- Streaming writer/reader
- ECDSA signature verification
- SHA-256 file hash verification
- C FFI for integration
- CLI tools for testing

**Status**: ✅ Ready to build with Rust

---

## Getting Started

### Option 1: Build DIGM ◉rigins (Mobile)

**Prerequisites**:
- macOS with Xcode installed
- Physical iOS device (iPhone 5s+ for Secure Enclave)

**Steps**:
```bash
# Navigate to iOS app
cd device-proof-recorder-ios

# Open in Xcode
open DIGMVoiceMemo.xcodeproj  # (Create project first)

# Build and run on device
# See device-proof-recorder-ios/XCODE_SETUP.md
```

### Option 2: Build .digm Format Library

**Prerequisites**:
- Rust toolchain (rustup)

**Steps**:
```bash
# Navigate to Rust library
cd digm_ref

# Build library
cargo build --release

# Run tests
cargo test

# Build CLI tools
cargo build --release --bin digm-encode
cargo build --release --bin digm-info

# Test encoding
cargo run --release --bin digm-encode -- input.raw output.digm
```

### Option 3: Run DIGM Platform (Web)

**Prerequisites**:
- Node.js 18+
- npm or yarn

**Steps**:
```bash
# Navigate to web platform
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Open in browser
# http://localhost:3000
```

---

## Workflow: Record → Upload → Publish

### Artist Workflow

```
1. Record Album with DIGM ◉rigins
   ├─ Open DIGM ◉rigins app
   ├─ Record track 1 → .wav + .proof.json
   ├─ Record track 2 → .wav + .proof.json
   └─ ... (complete album)

2. Upload to DIGM Platform
   ├─ Open DIGM Platform (web/mobile)
   ├─ Navigate to Upload
   ├─ Select album folder
   ├─ Platform verifies proofs
   └─ Create album listing

3. Publish and Sell
   ├─ Set price in XFG
   ├─ Add cover art and metadata
   ├─ Publish to blockchain (0x0B transaction)
   └─ Album live on marketplace
```

### Listener Workflow

```
1. Browse DIGM Platform
   ├─ View featured albums
   ├─ Search by artist/genre
   └─ Preview 30-second clips

2. Purchase Album
   ├─ Click Purchase
   ├─ Pay with XFG
   └─ Receive 0x0B license

3. Stream and Download
   ├─ Stream full album
   ├─ Download for offline
   └─ Verify proof signatures
```

---

## Brand Identity

### DIGM Origins (Mobile)

**Tagline**: "Authentic audio, cryptographically proven"  
**Purpose**: Record device-only audio with cryptographic proof  
**Icon**: Waveform with checkmark  
**Colors**: Green (recording), Red (stop), Blue (proof verified)

### DIGM Platform (Web)

**Tagline**: "The device-recorded audio marketplace"  
**Purpose**: Browse, purchase, and stream verified device audio  
**Icon**: DIGM logo  
**Colors**: Purple (primary), Green (verified), Gold (premium)

---

## Files Structure

```
digm-platform/
├── device-proof-recibernate-ios/      # DIGM Origins App
│   ├── DigmRecorderApp.swift
│   ├── VoiceMemoView.swift
│   ├── VoiceMemoRecorder.swift
│   └── XCODE_SETUP.md
│
├── digm_ref/                          # .digm Format Library
│   ├── Cargo.toml
│   ├── src/
│   ├── BUILD_INSTRUCTIONS.md
│   └── README.md
│
├── frontend/                          # DIGM Platform (Web)
│   ├── src/
│   ├── package.json
│   └── README.md
│
├── docs/                              # Documentation
│   ├── DIGM_PLATFORM_DEVICE_AUDIO.md
│   ├── DIGM_FORMAT_IMPLEMENTATION.md
│   ├── MVP_MOBILE_APP_SUMMARY.md
│   └── COMPLETE_IMPLEMENTATION_SUMMARY.md
│
└── fuego-core/                        # Blockchain
    └── src/Rpc/
```

---

## Next Steps

### Build DIGM Origins

1. Create Xcode project
2. Add source files
3. Configure capabilities
4. Build on physical device
5. Test recording

### Build .digm Library

1. Install Rust
2. Build library
3. Run tests
4. Test CLI tools
5. Generate test audio

### Integrate with Platform

1. Add upload UI to DIGM Platform
2. Implement proof verification
3. Add blockchain integration
4. Test purchase flow
5. Launch beta

---

## Support

### Documentation

- **iOS App**: `device-proof-recorder-ios/README.md`
- **Rust Library**: `digm_ref/BUILD_INSTRUCTIONS.md`
- **Platform**: `docs/DIGM_PLATFORM_DEVICE_AUDIO.md`
- **Format**: `docs/DIGM_FORMAT_IMPLEMENTATION.md`

### Getting Help

1. Check Xcode console for iOS errors
2. Check Cargo output for Rust errors
3. Review documentation in `docs/`
4. Check build instructions in respective directories

---

## Status

✅ **DIGM Origins**: Ready to build  
✅ **.digm Format**: Ready to build  
✅ **DIGM Platform**: Ready to run  
✅ **Documentation**: Complete

**Ready to begin building your device-first audio ecosystem!**

