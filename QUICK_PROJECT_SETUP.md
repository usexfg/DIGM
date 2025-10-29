# Quick Project Setup - DIGM ◉rigins

## Fast Track: Create Xcode Project in 2 Minutes

### Method 1: Using Xcode (Recommended for Beginners)

1. **Open Xcode**
2. **File → New → Project**
3. **iOS → App → Next**
4. **Fill in**:
   - Product Name: `DIGMVoiceMemo`
   - Interface: SwiftUI
   - Language: Swift
   - Organization: `org.digm`
5. **Save** to: `digm-platform/device-proof-recorder-ios/`
6. **Add files**: Drag all `.swift` files from `device-proof-recorder-ios/` into Xcode
7. **Configure**: 
   - Deployment target: iOS 15.0
   - Team: Select your Apple Developer team
   - Capabilities: Add Secure Enclave

**Done!** 🎉

### Method 2: Using Command Line (For Developers)

```bash
# 1. Install xcodegen (if not installed)
brew install xcodegen

# 2. Generate project
cd device-proof-recorder-ios
xcodegen generate

# 3. Open in Xcode
open DIGMVoiceMemo.xcodeproj
```

### Method 3: Manual Script

```bash
cd device-proof-recorder-ios
./create_xcode_project.sh
```

---

## What Files Are Needed?

Make sure these files are in `device-proof-recorder-ios/`:
- ✅ DigmRecorderApp.swift
- ✅ VoiceMemoView.swift
- ✅ VoiceMemoRecorder.swift
- ✅ Recorder.swift
- ✅ SecureEnclaveKey.swift
- ✅ ContentView.swift
- ✅ RecorderViewModel.swift
- ✅ Info.plist

**All files are already present!** ✅

---

## After Creating Project

### Test Build

1. Connect physical iOS device
2. Select device in Xcode
3. Click Run (⌘R)
4. Grant microphone permission
5. Test recording

### Enable GitHub Actions

Once project is created, push to GitHub:

```bash
git add DIGMVoiceMemo.xcodeproj
git commit -m "Add Xcode project for automated builds"
git push
```

GitHub Actions PSA locally build the iOS app automatically!

---

## Help

### Issues?

See detailed instructions in:
- `device-proof-recorder-ios/CREATE_XCODE_PROJECT.md`
- `device-proof-recorder-ios/XCODE_SETUP.md`

### Need Help?

- Xcode crashing? Restart Xcode
- Build errors? Clean build folder (⌘⇧K)
- Missing files? Re-add to project
- Signing issues? Check Team selection

---

## Next: Build on GitHub Actions

Once the Xcode project is committed, GitHub Actions will:
- ✅ Automatically build iOS app on macOS runners
- ✅ Run tests
- ✅ Upload artifacts
- ✅ Enable continuous integration

**You're ready to build!** 🚀

