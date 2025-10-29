# DIGM ◉rigins - Android

Android version of DIGM ◉rigins - cryptographic proof-of-device-mic audio recorder.

## Features

- ✅ Built-in microphone only (enforced)
- ✅ Android Keystore signing (hardware-backed)
- ✅ Real-time audio hashing (SHA-256)
- ✅ .digm format output
- ✅ Marble/Greek temple aesthetic UI
- ✅ US Dime-sized record button

## Setup

### Prerequisites

- Android Studio (for development)
- JDK 17+
- Android SDK (API 26+)
- Ruby 3.2+ (for Fastlane)

### Build from Command Line

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build release AAB (for Play Store)
./gradlew bundleRelease
```

### Using Fastlane

```bash
# Install dependencies
bundle install

# Build debug
bundle exec fastlane build

# Build release bundle
bundle exec fastlane build_bundle

# Upload to Google Play Internal Testing
bundle exec fastlane internal

# Upload to Google Play Beta
bundle exec fastlane beta

# Upload to Google Play Production
bundle exec fastlane release
```

## Project Structure

```
device-proof-recorder-android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/org/usexfg/digmorigins/
│   │       │   ├── MainActivity.kt
│   │       │   ├── ui/
│   │       │   │   ├── DigmOriginsScreen.kt
│   │       │   │   └── theme/
│   │       │   └── viewmodel/
│   │       │       └── RecorderViewModel.kt
│   │       ├── res/
│   │       │   ├── values/
│   │       │   └── xml/
│   │       └── AndroidManifest.xml
│   └── build.gradle.kts
├── fastlane/
│   ├── Appfile
│   └── Fastfile
├── build.gradle.kts
└── settings.gradle.kts
```

## Configuration

### Google Play API Key

1. Create service account in Google Cloud Console
2. Enable Google Play Android Developer API
3. Grant service account access in Google Play Console
4. Download JSON key file
5. Set as GitHub secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` or save as `fastlane/google_play_api_key.json`

### Signing

For release builds, configure signing in `app/build.gradle.kts`:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../keystore.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias = "digmorigins"
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
```

## GitHub Actions

The project includes automated builds:
- `.github/workflows/build-android.yml` - Build on every push
- `.github/workflows/release-android.yml` - Release to Play Store

## Troubleshooting

### Gradle Build Fails
- Ensure JDK 17 is installed and JAVA_HOME is set
- Run `./gradlew clean` and rebuild

### Fastlane Upload Fails
- Verify Google Play API key has correct permissions
- Check service account has access in Play Console

### Signing Errors
- Ensure keystore file exists and passwords are correct
- Verify key alias matches configuration

## Documentation

- [Fastlane Setup](./README_FASTLANE.md)
- [Android Development Guide](https://developer.android.com)

