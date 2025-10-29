#!/bin/bash
# Build DIGM ◉rigins iOS app from command line
# Usage: ./build.sh [simulator|device]

set -e

PROJECT_NAME="🅞rigins"
SCHEME="DIGM_Origins"
CONFIGURATION="${1:-Debug}"

cd "$(dirname "$0")"

echo "🔨 Building ${PROJECT_NAME}..."

# List available schemes
echo "📋 Available schemes:"
xcodebuild -list -project "${PROJECT_NAME}.xcodeproj" | grep -A 10 "Schemes:"

# Build for iOS Simulator (no signing required)
echo ""
echo "🏗️  Building for iOS Simulator..."
xcodebuild \
  -project "${PROJECT_NAME}.xcodeproj" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  clean build \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO

echo ""
echo "✅ Build complete! Output:"
find . -name "*.app" -type d 2>/dev/null | head -1

