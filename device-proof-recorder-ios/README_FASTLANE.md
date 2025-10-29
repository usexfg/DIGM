# Fastlane Setup for DIGM ◉rigins

Fastlane automates building, testing, and deploying your iOS app.

## Quick Start

### 1. Install Dependencies

```bash
cd device-proof-recorder-ios
bundle install
```

### 2. Build for Simulator (No Signing Needed)

```bash
bundle exec fastlane build_simulator
```

### 3. Build Archive

```bash
bundle exec fastlane archive
```

### 4. Upload to TestFlight

```bash
bundle exec fastlane beta
```

## Available Commands

### Build Commands
- `fastlane build` - Build app
- `fastlane build_simulator` - Build for iOS Simulator (no signing)
- `fastlane archive` - Create distribution archive
- `fastlane test` - Run tests

### Distribution Commands
- `fastlane beta` - Build and upload to TestFlight
- `fastlane release` - Submit to App Store

### Version Management
- `fastlane increment_build` - Auto-increment build number
- `fastlane increment_version` - Set version number

### Utilities
- `fastlane clean` - Clean build artifacts
- `fastlane generate_project` - Regenerate Xcode project
- `fastlane ci` - CI/CD lane (for GitHub Actions)

## Configuration

### App Store Connect API Key (Recommended)

1. Go to https://appstoreconnect.apple.com/access/api
2. Create a new API key
3. Download the key file (`.p8` file)
4. Set environment variables:
   ```bash
   export APP_STORE_CONNECT_API_KEY_ID="your_key_id"
   export APP_STORE_CONNECT_API_ISSUER_ID="your_issuer_id"
   export APP_STORE_CONNECT_API_KEY_CONTENT="$(cat /path/to/AuthKey.p8)"
   ```

Or save as `fastlane/api_key.json`:
```json
{
  "key_id": "your_key_id",
  "issuer_id": "your_issuer_id",
  "key_content": "---BEGIN PRIVATE KEY---\n...\n---END PRIVATE KEY---"
}
```

### Team ID

Add to `fastlane/Appfile` or set environment variable:
```bash
export FASTLANE_TEAM_ID="YOUR_TEAM_ID"
```

## GitHub Actions Integration

Fastlane is integrated into:
- `.github/workflows/build.yml` - Uses `fastlane ci` for builds
- `.github/workflows/release.yml` - Uses `fastlane beta` for TestFlight uploads

## Local Development Workflow

```bash
# 1. Make code changes
# 2. Test locally
bundle exec fastlane test

# 3. Build for testing
bundle exec fastlane build_simulator

# 4. When ready for beta
bundle exec fastlane beta
```

## Troubleshooting

### "Could not find fastlane"
```bash
bundle install
bundle exec fastlane [lane]
```

### Code Signing Issues
- Ensure certificates are set up in Xcode
- Or use `fastlane match` for automatic management

### API Key Issues
- Verify key has App Manager or Admin role
- Check key hasn't expired
- Ensure issuer ID is correct

## Documentation

- Fastlane Docs: https://docs.fastlane.tools
- App Store Connect API: https://developer.apple.com/documentation/appstoreconnectapi

