# Fastlane Configuration for DIGM ◉rigins

## Setup

1. **Install Fastlane**:
   ```bash
   bundle install
   ```

2. **Configure App Store Connect** (for TestFlight/App Store):
   
   Option A: **App Store Connect API Key** (Recommended for CI/CD)
   - Create API key at: https://appstoreconnect.apple.com/access/api
   - Download key and save as `fastlane/api_key.json`
   - Or set environment variables:
     - `APP_STORE_CONNECT_API_KEY_ID`
     - `APP_STORE_CONNECT_API_ISSUER_ID`
     - `APP_STORE_CONNECT_API_KEY_CONTENT` (or `APP_STORE_CONNECT_API_KEY_PATH`)

   Option B: **Apple ID Authentication**
   - Add your Apple ID to `fastlane/Appfile`
   - Fastlane will prompt for credentials

3. **Configure Team ID**:
   - Add your team ID to `fastlane/Appfile`
   - Or set `FASTLANE_TEAM_ID` environment variable

## Available Lanes

### Development
```bash
fastlane build              # Build the app
fastlane build_simulator    # Build for simulator (no signing)
fastlane test               # Run tests
```

### Distribution
```bash
fastlane beta               # Build and upload to TestFlight
fastlane release            # Build and submit to App Store
fastlane archive            # Create archive only
```

### Version Management
```bash
fastlane increment_build    # Auto-increment build number
fastlane increment_version  # Set version (use VERSION_NUMBER="1.0.1")
```

### Utilities
```bash
fastlane clean             # Clean build artifacts
fastlane generate_project  # Regenerate Xcode project
fastlane match             # Sync certificates (if using match)
fastlane ci                # CI/CD lane (for GitHub Actions)
```

## GitHub Actions Integration

Fastlane is already integrated into `.github/workflows/release.yml`

The `ci` lane handles:
- Project generation
- Build number increment from GitHub run number
- Building for simulator (or archive for releases)

## Environment Variables

Set these in GitHub Secrets or locally:

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_API_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_CONTENT` (or `_PATH`)
- `FASTLANE_TEAM_ID`
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` (for 2FA)

## Troubleshooting

### "No such module"
- Run `fastlane generate_project` first

### Code signing errors
- Ensure certificates are set up in Xcode
- Or use `fastlane match` for automatic certificate management

### TestFlight upload fails
- Check API key permissions
- Verify bundle ID matches App Store Connect
- Check app status in App Store Connect


