# DIGM Proof Recorder - Microphone Validation Checks

## Summary: Device Microphone Verification Checks

**Current Implementation**: **2 active checks**  
**Potential Enhanced Implementation**: **Up to 5 checks** with continuous monitoring

## Current Checks (Implemented)

### 1. Initial Configuration Check

**Location**: `Recorder.swift` → `enforceBuiltInMic()` at recording start

**Process**:
```swift
func enforceBuiltInMic() throws {
    let session = AVAudioSession.sharedInstance()
    
    // Check 1a: Verify built-in microphone exists
    guard let builtInMic = availableInputs.first(where: {
        $0.portType == .builtInMic
    }) else {
        throw RecorderError.noBuiltInMic  // ⚠️ No built-in mic
    }
    
    // Check 1b: Force built-in mic as preferred input
    try session.setPreferredInput(builtInMic)
    
    // Check 1c: Verify current route uses built-in mic
    guard let currentInput = session.currentRoute.inputs.first,
          currentInput.portType == .builtInMic else {
        throw RecorderError.externalMicDetected  // ⚠️ External mic detected
    }
}
```

**Timing**: Before recording starts  
**Frequency**: Once per recording session  
**Result**: Blocks recording if external microphone detected

---

### 2. Route Change Notification (Theoretical)

**Concept**: Monitor for audio route changes during recording

**Not Currently Implemented**:
```swift
// Would go in Recorder.swift
func startRouteChangeMonitoring() {
    NotificationCenter.default.addObserver(
        forName: AVAudioSession.routeChangeNotification,
        object: nil,
        queue: nil
    ) { [weak self] notification in
        // External microphone plugged in during recording
        self?.handleExternalMicDetected()
    }
}
```

**Timing**: During recording  
**Frequency**: Continuous (notification-based)  
**Status**: ❌ Not implemented

---

## Additional Checks (Design Phase)

### 3. Audio Format Verification

**Concept**: Verify audio characteristics match built-in microphone

**Implementation**:
```swift
func verifyMicrophoneCharacteristics() throws {
    let session = AVAudioSession.sharedInstance()
    
    // Check expected sample rate (48kHz for built-in mic)
    if let currentFormat = session.inputAvailableSampleRate {
        if currentFormat < 44100 || currentFormat > 48000 {
            throw RecorderError.unexpectedAudioFormat
        }
    }
    
    // Check channel count (mono for built-in mic)
    if let currentInput = session.currentRoute.inputs.first {
        if currentInput.numberOfChannels > 1 {
            throw RecorderError.unexpectedChannelCount
        }
    }
}
```

**Timing**: During recording setup  
**Frequency**: Once per recording  
**Status**: ❌ Not implemented

---

### 4. Device Attestation

**Concept**: Hardware attestation proving audio came from device

**Implementation**:
```swift
func verifyDeviceAttestation() throws {
    // Generate attestation challenge
    let challenge = generateAttestationChallenge()
    
    // Get attestation from Secure Enclave
    let attestation = try SecureEnclaveKeyManager.shared
        .getAttestation(challenge: challenge)
    
    // Verify attestation signature
    let isValid = try verifyAttestationSignature(attestation)
    
    if !isValid {
        throw RecorderError.attestationFailed
    }
    
    // Store in proof bundle
    proofData["attestation"] = attestation
}
```

**Timing**: After recording, before signing  
**Frequency**: Once per recording  
**Status**: ❌ Not implemented (planned for future)

---

### 5. Continuous Audio Route Monitoring

**Concept**: Periodic checks during recording for route changes

**Implementation**:
```swift
class ContinuousMicMonitor {
    private var timer: Timer?
    private let checkInterval: TimeInterval = 1.0
    
    func startMonitoring() {
        timer = Timer.scheduledTimer(withTimeInterval: checkInterval, repeats: true) { [weak self] _ in
            self?.checkAudioRoute()
        }
    }
    
    func checkAudioRoute() {
        let session = AVAudioSession.sharedInstance()
        
        // Check for external audio sources
        for input in session.currentRoute.inputs {
            if input.portType != .builtInMic {
                // External mic detected during recording
                stopRecording()
                throw RecorderError.externalMicDetected
            }
        }
    }
}
```

**Timing**: During recording (every 1 second)  
**Frequency**: Continuous  
**Status**: ❌ Not implemented

---

## Check Summary Table

| Check # | Type | Timing | Frequency | Status |
|---------|------|--------|-----------|--------|
| 1a | Built-in mic exists | Before recording | Once | ✅ Implemented |
| 1b | Force built-in mic | Before recording | Once | ✅ Implemented |
| 1c | Verify current route | Before recording | Once | ✅ Implemented |
| 2 | Route change notification | During recording | Event-driven | ❌ Not implemented |
| 3 | Audio format verification | Before recording | Once | ❌ Not implemented |
| 4 | Device attestation | After recording | Once | ❌ Not implemented |
| 5 | Continuous monitoring | During recording | Every 1s | ❌ Not implemented |

**Total Active Checks**: **3 checks** (all part of Check 1)  
**Potential Total Checks**: **7 checks** with enhanced implementation

---

## Detection Capabilities

### External Microphones Detected

| Type | Detection Method | Current Status |
|------|------------------|-----------------|
| USB Headset | Port type check | ✅ Detected at start |
| Bluetooth Headset | Port type check | ✅ Detected at start |
| Wired Headset | Port type check | ✅ Detected at start |
| External Audio Interface | Port type check | ✅ Detected at start |

### Limitations

| Limitation | Description | Impact |
|------------|-------------|-------|
| During recording | No continuous monitoring | External mic can be plugged in mid-recording |
| Bluetooth pairing | May miss quick Bluetooth connection | Short window of vulnerability |
| Audio switching | iOS may switch audio route silently | User may not be notified |

---

## Enhanced Implementation Proposal

### Multi-Layer Verification System

```swift
class EnhancedMicChecker {
    enum VerificationLevel {
        case basic       // Current implementation (3 checks)
        case standard    // + Route monitoring (4 checks)
        case enhanced    // + Format verification (5 checks)
        case maximum     // + Attestation + continuous monitoring (7 checks)
    }
    
    func performVerification(level: VerificationLevel) throws {
        // Level 1: Basic checks (current)
        try enforceBuiltInMic()
        
        if level >= .standard {
            // Level 2: Start route monitoring
            try startRouteChangeMonitoring()
        }
        
        if level >= .enhanced {
            // Level 3: Verify audio format
            try verifyMicrophoneCharacteristics()
        }
        
        if level >= .maximum {
            // Level 4: Device attestation
            try verifyDeviceAttestation()
            
            // Level 5: Continuous monitoring
            startContinuousMonitoring()
        }
    }
}
```

### Recommended Configuration

For **production use**, implement:

- **Level 1** (Basic): Current implementation ✅
- **Level 2** (Standard): Add route monitoring 🔄
- **Level 3** (Enhanced): Add format verification 🔄

**Total**: **5 active checks** per recording

---

## Code Location Reference

### Implemented Checks

**File**: `device-proof-recorder-ios/Recorder.swift`  
**Function**: `enforceBuiltInMic()`  
**Lines**: 24-46  
**Checks**: 3 (existence, configuration, verification)

### Architecture Documentation

**File**: `docs/DIGM_PROOF_RECORDER_ARCHITECTURE.md`  
**Section**: "Built-in Microphone Enforcement"  
**Lines**: 73-110

---

## Security Analysis

### Current Protection Level

- **Static Check**: ✅ Verifies built-in mic at recording start
- **Dynamic Check**: ❌ No continuous monitoring during recording
- **Attestation**: ❌ No hardware attestation proof

### Threat Model

| Threat | Current Protection | Enhanced Protection |
|--------|--------------------|---------------------|
| USB mic plugged in before recording | ✅ Blocked | ✅ Blocked |
| USB mic plugged in during recording | ❌ Not detected | ✅ Blocked |
| Bluetooth pairing before recording | ✅ Blocked | ✅ Blocked |
| Bluetooth pairing during recording | ❌ Not detected | ✅ Blocked |
| Audio route switching | ❌ Not detected | ✅ Blocked |
| Tampered audio device | ❌ Not detected | ✅ Attestation proves device |

---

## Implementation Priority

### High Priority (Add Next)

1. **Route Change Notification** (Check #2)
   - Easiest to implement
   - Addresses mid-recording external mic insertion
   - Minimal performance impact

2. **Continuous Monitoring** (Check #5)
   - Periodic verification during recording
   - Catches edge cases missed by notifications
   - Low overhead (1 second intervals)

### Medium Priority

3. **Audio Format Verification** (Check #3)
   - Validates expected microphone characteristics
   - Adds extra layer of security
   - Requires audio format testing

### Low Priority (Future)

4. **Device Attestation** (Check #4)
   - Hardware attestation with remote verification
   - Most complex to implement
   - Requires server-side verification infrastructure

---

## Conclusion

**Current State**: **3 checks** performed once at recording start  
**Recommended**: **5 checks** with route monitoring and format verification  
**Future**: **7 checks** with attestation and continuous monitoring

