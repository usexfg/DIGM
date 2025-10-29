# Building DIGM ◉rigins Without Xcode GUI

## Prerequisites

1. **xcodegen** (already installed in `/tmp/xcodegen/bin/`)
   - Used to generate the `.xcodeproj` from `project.yml`
   
2. **Xcode** (for building - can be installed but GUI not needed)
   - Or use **GitHub Actions** for automated builds

## Command Line Workflow

### 1. Generate/Regenerate Project
```bash
cd device-proof-recorder-ios
/tmp/xcodegen/bin/xcodegen generate
```

### 2. Build for Simulator (No Signing Needed)
```bash
# Requires Xcode installed (but GUI not needed)
xcodebuild \
  -project "🅞rigins.xcodeproj" \
  -scheme "DIGM_Origins" \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  clean build \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO
```

### 3. Build for Device (Requires Developer Account)
```bash
xcodebuild \
  -project "🅞rigins.xcodeproj" \
  -scheme "DIGM_Origins" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  clean build archive \
  -archivePath "./build/DIGM_Origins.xcarchive" \
  CODE_SIGN_IDENTITY="iPhone Developer" \
  DEVELOPMENT_TEAM="YOUR_TEAM_ID"
```

### 4. List Available Schemes
```bash
xcodebuild -list -project "🅞rigins.xcodeproj"
```

## GitHub Actions (Automated CI/CD)

The project is configured to build automatically on GitHub Actions, which:
- ✅ Doesn't require local Xcode installation
- ✅ Builds on macOS runners with Xcode pre-installed
- ✅ Can archive and upload to TestFlight

See `.github/workflows/build.yml` and `.github/workflows/release.yml`

## Alternative: Use Fastlane

For even more automation:
```bash
# Install fastlane
sudo gem install fastlane

# Initialize (in device-proof-recorder-ios/)
fastlane init

# Build
fastlane build

# Release
fastlane release
```

## Update Project Without Xcode

To modify the project:
1. Edit `project.yml`
2. Run: `/tmp/xcodegen/bin/xcodegen generate`
3. Changes are automatically reflected

