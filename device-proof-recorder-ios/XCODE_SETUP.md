# DIGM 🅞rigins - Xcode Setup Guide

## Quick Start

### 1. Create Xcode Project

1. Open Xcode
2. File → New → Project
3. Choose "App" under iOS
4. Fill in:
   - Product Name: `DIGM 🅞rigins`
   - Interface: SwiftUI
   - Language: Swift
   - Organization Identifier: `org.usexfg`
5. Save to: `digm-platform/device-proof-recorder-ios/`

### 2. Add Source Files

Copy these files into your Xcode project:
- `DigmRecorderApp.swift` → Project Root
- `DigmOriginsView.swift` → Project Root
- `DigmOriginsRecorder.swift` → Project Root
- `Recorder.swift` → Project Root
- `SecureEnclaveKey.swift` → Project Root
- `RecorderViewModel.swift` → Project Root (base file)
- `Info.plist` → Project Root

### 3. Configure Capabilities

#### a) Secure Enclave Access

1. Select your target in Xcode
2. Go to "Signing & Capabilities"
3. Click "+ Capability"
4. Add "Secure Enclave" (if available)
   - Note: This is automatically available on iOS 13+

#### b) Microphone Access

Already configured in `Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>DIGM 🅞rigins needs microphone access...</string>
```

### 4. Build Settings

#### Minimum iOS Version

1. Select your target
2. Go to "General"
3. Set "iOS Deployment Target" to `15.0`
   - Required for SwiftUI and Secure Enclave features

#### Code Signing

1. Go to "Signing & Capabilities"
2. Select your team
3. Enable "Automatically manage signing"
4. Xcode will handle signing

### 5. Project Structure

Your Xcode project should look like:

```
DIGMOrigins/
├── DIGMOrigins/
│   ├── DigmRecorderApp.swift       # @main
│   ├── DigmOriginsView.swift
│   ├── DigmOriginsRecorder.swift
│   ├── Recorder.swift
│   ├── SecureEnclaveKey.swift
│   └── RecorderViewModel.swift     # Base file (update as needed)
├── DIGMOrigins.xcodeproj
└── Info.plist
```

## Build & Run

### First Build

1. Connect physical iOS device (Secure Enclave not available in simulator)
2. Select your device in Xcode
3. Click the Play button (⌘R)
4. Grant microphone permissions when prompted
5. App should launch

### Testing

1. **Recording Test**
   - Tap "Record" button
   - Speak for a few seconds
   - Tap "Stop"
   - Verify proof file created

2. **Playback Test**
   - Tap play on a recording
   - Verify audio plays correctly

3. **Sharing Test**
   - Tap share icon
   - Verify audio and proof files can be shared

## Troubleshooting

### "Secure Enclave Not Available"

**Problem**: Running on simulator  
**Solution**: Use physical device. Secure Enclave is hardware-only.

### "No microphone input"

**Problem**: Microphone permissions not granted  
**Solution**: 
1. Settings → DIGM Voice Memo → Microphone
2. Enable "Allow Microphone Access"

### "External Microphone Detected"

**Problem**: External microphone plugged in  
**Solution**: 
1. Unplug external microphone
2. Close and reopen app
3. Try recording again

### Build Errors

**Problem**: Missing imports or dependencies  
**Solution**:
1. Clean build folder (⌘⇧K)
2. Build again (⌘B)
3. Check for Swift version compatibility

## Running the App

### Development

```bash
# In Xcode
⌘R  # Build and Run
```

### On Device

1. Connect iPhone/iPad via USB
2. Trust computer on device
3. Select device in Xcode
4. Click Run
5. App installs on device

### Distribution

For TestFlight/App Store distribution:
1. Product → Archive
2. Window → Organizer
3. Distribute App
4. Follow prompts

## Next Steps

### After Successful Build

1. Test recording on real device
2. Verify proof file generation
3. Check Secure Enclave signing
4. Test playback
5. Test sharing

### Integration with DIGM Platform

Once working:
1. Test upload flow to platform
2. Implement verification
3. Add blockchain integration
4. Launch beta

## Project File Locations

Make sure your files are in the correct locations:

```bash
device-proof-recorder-ios/
├── DigmRecorderApp.swift       # App entry point
├── DigmOriginsView.swift         # Main UI
├── DigmOriginsRecorder.swift    # Recording logic
├── Recorder.swift              # Audio capture
├── SecureEnclaveKey.swift     # Hardware keys
├── RecorderViewModel.swift    # State (update as needed)
├── Info.plist                 # Configuration
└── XCODE_SETUP.md            # This file
```

## Documentation

See also:
- `README.md` - User documentation
- `docs/DIGM_PROOF_RECORDER_ARCHITECTURE.md` - Architecture
- `docs/DIGM_PLATFORM_DEVICE_AUDIO.md` - Platform integration
- `docs/MVP_MOBILE_APP_SUMMARY.md` - App summary

## Support

For issues:
1. Check Xcode console for errors
2. Verify device has Secure Enclave (iPhone 5s+)
3. Ensure iOS 15.0+ is installed
4. Check microphone permissions

## Ready to Build!

Your DIGM 🅞rigins app is ready to build and test.

**Status**: ✅ All source files complete  
**Next**: Build in Xcode and test on physical device

