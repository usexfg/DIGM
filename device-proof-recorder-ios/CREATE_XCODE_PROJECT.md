# Create Xcode Project for DIGM ◉rigins

## Option 1: Quick Setup Script

Run the setup script:
```bash
cd device-proof-recorder-ios
./create_xcode_project.sh
```

If xcodegen is installed, it will automatically create the project.

## Option 2: Manual Creation in Xcode

### Step 1: Open Xcode

Launch Xcode on your Mac.

### Step 2: Create New Project

1. **File → New → Project**
2. Select **"iOS"** platform
3. Choose **"App"** template
4. Click **"Next"**

### Step 3: Configure Project

Fill in the project details:

```
Product Name: DIGMOrigins
Team: (Select your team)
Organization Identifier: org.digm
Bundle Identifier: org.digm.digmorigins
Interface: SwiftUI
Language: Swift
Storage: None
Tests: Uncheck "Include Tests"
```

Click **"Next"**.

### Step 4: Save Location

Choose location: `digm-platform/device-proof-recorder-ios/`

Make sure "Create Git repository" is **unchecked** (we already have Git).

Click **"Create"**.

### Step 5: Add Source Files

The project is created with `ContentView.swift`. Add our files:

1. **Right-click** on the project in Xcode (DIGMOrigins folder)
2. Select **"Add Files to DIGMOrigins..."**
3. Navigate to `device-proof-recorder-ios/`
4. Select these files:
   - `DigmRecorderApp.swift`
   - `DigmOriginsView.swift`
   - `DigmOriginsRecorder.swift`
   - `Recorder.swift`
   - `SecureEnclaveKey.swift`
   - `RecorderViewModel.swift`
5. Ensure "Copy items if needed" is **unchecked**
6. Ensure "Create groups" is selected
7. Click **"Add"**

### Step 6: Update Info.plist

1. Select `Info.plist` in project navigator
2. Replace its contents with `device-proof-recorder-ios/Info.plist`
3. Or manually configure:
   - Add `NSMicrophoneUsageDescription`
   - Add `UIBackgroundModes` with `audio`
   - Set `UIRequiredDeviceCapabilities` to include `secure-element`

### Step 7: Configure App Entry Point

1. Select `DigmRecorderApp.swift`
2. Ensure it contains `@main` attribute
3. If not, add it DP top of the file

### Step 8: Configure Build Settings

1. Select project **DIGMOrigins** in navigator
2. Select **DIGMOrigins** target
3. Go to **"General"** tab:
   - Set **Deployment Target** to `iOS 15.0`
   - Set **Supported Destinations** to iPhone only

4. Go to **"Signing & Capabilities"**:
   - Select your **Team**
   - Enable **"Automatically manage signing"**
   - Add capability: **"Secure Enclave"** (if available)
   - Add capability: **"Background Modes"**
     - Check **"Audio"**

### Step 9: Clean Up

Remove the default `ContentView.swift` if present:

1. Right-click on `ContentView.swift` (if it exists)
2. Select **"Delete"**
3. Choose **"Move to Trash"**

### Step 10: Build & Test

1. Select a physical device (not simulator - Secure Enclave doesn't work in simulator)
2. Click **"Run"** button (⌘R)
3. Grant microphone permissions when prompted
4. Test recording functionality

## Option 3: Using xcodegen (Automated)

If you have xcodegen installed:

```bash
cd device-proof-recorder-ios

# Install xcodegen (via Homebrew)
brew install xcodegen

# Generate project
xcodegen generate

# Open in Xcode
open DIGMOrigins.xcodeproj
```

## Verification

After creating the project, verify:

1. ✅ All Swift files are added
2. ✅ Info.plist is configured
3. ✅ Build target is iOS 15.0+
4. ✅ Secure Enclave capability is enabled
5. ✅ Team is selected for signing
6. ✅ Physical device selected (not simulator)
7. ✅ Project builds without errors

## Troubleshooting

### "No such module 'CryptoKit'"
- Ensure deployment target is iOS 13+ (using iOS 15.0)

### "Secure Enclave not available"
- Use physical device, not simulator
- Check device has Secure Enclave (iPhone 5s+)

### "Use of unresolved identifier"
- Ensure all files are added to target
- Clean build folder (⌘⇧K)
- Build again (⌘B)

## Next Steps

After project is created:

1. Commit `.xcodeproj` to Git
2. Update GitHub Actions workflow
3. Enable automated builds
4. Configure TestFlight (optional)

## GitHub Actions Integration

Once project is created, uncomment iOS build steps in:
`.github/workflows/build.yml`

```yaml
- name: Build iOS App
  working-directory: device-proof-recorder-ios
  run: |
    xcodebuild -scheme DIGMOrigins \
      -configuration Release \
      -destination 'generic/platform=iOS' \
      clean build
```

