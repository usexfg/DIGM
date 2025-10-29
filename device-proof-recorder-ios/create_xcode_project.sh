#!/bin/bash

# Create Xcode Project for DIGM ◉rigins
# Run this script to create the Xcode project manually

set -e

echo "Creating Xcode project for DIGM ◉rigins..."

# Check if Xcode project already exists
if [ -d "DIGMVoiceMemo.xcodeproj" ]; then
    echo "Xcode project already exists. Remove it first to recreate."
    exit 1
fi

# Method 1: Use xcodegen if available
if command -v xcodegen &> /dev/null; then
    echo "Using xcodegen to create project..."
    xcodegen generate
    echo "✅ Xcode project created successfully!"
    echo "Open DIGMVoiceMemo.xcodeproj in Xcode"
    exit 0
fi

# Method 2: Manual creation instructions
echo ""
echo "xcodegen not found. Please create project manually:"
echo ""
echo "1. Open Xcode"
echo "2. File → New → Project"
echo "3. Choose 'iOS' → 'App'"
echo "4. Fill in:"
echo "   - Product Name: DIGMVoiceMemo"
echo "   - Interface: SwiftUI"
echo "   - Language: Swift"
echo "   - Organization Identifier: org.digm"
echo "   - Bundle Identifier: org.digm.voicememo"
echo "5. Save to: $(pwd)"
echo "6. Add source files:"
echo "   - DigmRecorderApp.swift"
echo "   - VoiceMemoView.swift"
echo "   - VoiceMemoRecorder.swift"
echo "   - Recorder.swift"
echo "   - SecureEnclaveKey.swift"
echo "   - ContentView.swift"
echo "   - RecorderViewModel.swift"
echo "7. Replace Info.plist with existing Info.plist"
echo "8. Configure capabilities:"
echo "   - Add Secure Enclave capability"
echo "   - Enable 'Secure Enclave' in Signing & Capabilities"
echo ""

# Make script executable
chmod +x "$0"

