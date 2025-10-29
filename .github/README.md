# GitHub Actions for DIGM Platform

This directory contains GitHub Actions workflows for building, testing, and releasing the DIGM platform components.

## Workflows

### 1. Build Workflow (`build.yml`)

**Triggers**: Push to main/develop, Pull requests

**Jobs**:
- **build-rust**: Builds Rust library and CLI tools on Ubuntu
- **build-ios**: Builds iOS app on macOS (placeholder - needs Xcode project)
- **lint**: Runs Rust clippy and formatting checks
- **test**: Runs all Rust unit tests

**Artifacts**:
- Rust library binaries
- CLI tools (digm-encode, digm-info)
- iOS app build (when project file exists)

### 2. Release Workflow (`release.yml`)

**Triggers**: GitHub release creation

**Jobs**:
- **release-rust**: Builds Rust library for multiple platforms
- **release-ios**: Builds iOS app for TestFlight

**Assets**:
- Pre-built binaries for multiple platforms
- CLI tools
- iOS app archive

## Usage

### Building Locally

**Rust Library**:
```bash
cd digm_ref
cargo build --release
cargo test
```

**iOS App**:
```bash
cd device-proof-recorder-ios
# Open in Xcode
xcodebuild -scheme DIGMVoiceMemo -configuration Release
```

### Running GitHub Actions

#### Automatic Triggers
- Push to `main` or `develop` branches
- Open or update pull requests
- Create a GitHub release

#### Manual Triggers
```bash
# In GitHub, go to Actions tab
# Select workflow
# Click "Run workflow"
```

## Requirements

### Rust Build
- Rust toolchain (stable)
- Cargo cache (configured in workflow)
- Tests: ~2 minutes

### iOS Build
- macOS runner (macos-14)
- Xcode 15.0
- **Note**: Requires Xcode project file to be created first

## Current Status

### ✅ Working
- Rust library builds on Ubuntu
- Rust tests pass
- CLI tools build successfully

### ⏳ In Progress
- iOS app build (needs Xcode project file)
- Cross-platform Rust builds
- TestFlight integration

### 📋 TODO
1. Create Xcode project for iOS app
2. Configure iOS build in GitHub Actions
3. Set up code signing
4. Configure TestFlight upload
5. Add more platform builds (Windows, macOS)

## Troubleshooting

### Rust Build Fails
```bash
# Check Rust version
rustc --version

# Clean build
cd digm_ref
cargo clean
cargo build
```

### iOS Build Fails
```bash
# Check Xcode version
xcodebuild -version

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

## Secrets Required (for releases)

For iOS releases, configure these secrets in GitHub:
- `APP_STORE_ISSUER_ID`
- `APP_STORE_API_KEY_ID`
- `APP_STORE_API_PRIVATE_KEY`

See: https://github.com/apple-actions/upload-testflight-build

## Status

✅ **Rust**: Fully automated  
⏳ **iOS**: Pending Xcode project creation  
✅ **Tests**: Automated  
✅ **Releases**: Configured (pending iOS)  

