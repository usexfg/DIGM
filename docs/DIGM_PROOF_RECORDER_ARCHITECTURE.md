# DIGM Proof Recorder Architecture

## Overview

DIGM Proof Recorder is a stand-alone audio recording application that exclusively uses the device's built-in microphone with hardware-backed security. All recordings are cryptographically signed using Secure Enclave (iOS) or Android Keystore (Android) to prove authenticity and origin.

## Core Principles

### 1. Device-Only Recording
- **Forces built-in microphone**: No external microphones, USB audio, or Bluetooth audio allowed
- **Hardware attestation**: Uses device attestation keys for signing
- **No external audio sources**: Ensures recordings come directly from the device's physical microphone

### 2. Cryptographic Proof
- **SHA-256 hashing**: Real-time audio hash generation during recording
- **Hardware key signing**: Secure Enclave (iOS) or Android Keystore (Android) signing
- **Proof bundle**: Audio file + JSON metadata with signatures and attestation data

### 3. .digm Encrypted Format
- **AES-256-GCM encryption**: Audio encrypted with device-specific keys
- **Metadata preservation**: Proof data embedded in encrypted container
- **Tamper-proof**: Any modification to audio invalidates signatures

## Architecture Components

### iOS Implementation

```
DeviceProofRecorder-iOS/
├── ContentView.swift          # SwiftUI interface
├── Recorder.swift            # Audio recording engine
├── SecureEnclaveKey.swift    # Hardware key management
├── RecorderViewModel.swift   # State management
├── DigmAudioEncoder.swift    # .digm format encoder
└── Info.plist               # Permissions & capabilities
```

### Android Implementation

```
DeviceProofRecorder-Android/
├── MainActivity.kt           # Main activity
├── Recorder.kt               # Audio recording
├── KeyManager.kt             # Android Keystore management
├── SensorLogger.kt            # Attestation sensors
├── DigmAudioEncoder.kt       # .digm format encoder
└── AndroidManifest.xml       # Permissions
```

## Technical Implementation

### 1. Built-in Microphone Enforcement

#### iOS (AVAudioSession)
```swift
func enforceBuiltInMic() throws {
    let session = AVAudioSession.sharedInstance()
    
    // Get available inputs
    guard let availableInputs = session.availableInputs else {
        throw RecorderError.noInputsAvailable
    }
    
    // Find built-in microphone
    guard let builtInMic = availableInputs.first(where: { 
        $0.portType == .builtInMic 
    }) else {
        throw RecorderError.noBuiltInMic
    }
    
    // Force built-in mic as preferred input
    try session.setPreferredInput(builtInMic)
    
    // Verify current input
    guard let currentInput = session.currentRoute.inputs.first,
          currentInput.portType == .builtInMic else {
        throw RecorderError.externalMicDetected
    }
}
```

#### Android (AudioManager)
```kotlin
fun enforceBuiltInMic(context: Context): Boolean {
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val sources = audioManager.getAvailableInputDevices()
    
    // Check for external microphones
    for (source in sources) {
        val type = source.type
        if (type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
            type == AudioDeviceInfo.TYPE_USB_HEADSET ||
            type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
            type == AudioDeviceInfo.TYPE_AUX_LINE) {
            return false  // External mic detected
        }
    }
    
    return true  // Only built-in mic available
}
```

### 2. Secure Enclave Key Management

#### iOS (Secure Enclave)
```swift
final class SecureEnclaveKeyManager {
    static let shared = SecureEnclaveKeyManager()
    private var key: SecureEnclave.P256.Signing.PrivateKey?
    
    func getKey() throws -> SecureEnclave.P256.Signing.PrivateKey {
        if let k = key { return k }
        
        // Create new key in Secure Enclave
        let k = try SecureEnclave.P256.Signing.PrivateKey(
            accessControl: SecAccessControlCreateWithFlags(
                kCFAllocatorDefault,
                kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                .privateKeyUsage,
                nil
            )
        )
        key = k
        return k
    }
    
    func sign(data: Data) throws -> Data {
        let signature = try getKey().signature(for: data)
        return signature.derRepresentation
    }
    
    func publicKey() throws -> Data {
        return getKey().publicKey.rawRepresentation
    }
}
```

#### Android (Android Keystore)
```kotlin
class KeyManager {
    companion object {
        private const val KEY_ALIAS = "DIGM_PROOF_KEY"
        private const val KEYSTORE_TYPE = "AndroidKeyStore"
        
        fun createOrLoadKey(context: Context): PrivateKey {
            val keyStore = KeyStore.getInstance(KEYSTORE_TYPE)
            keyStore.load(null)
            
            if (!keyStore.containsAlias(KEY_ALIAS)) {
                // Create new key in Android Keystore
                val generator = KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_EC,
                    KEYSTORE_TYPE
                )
                
                val spec = KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_SIGN
                )
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setUserAuthenticationRequired(false)
                    .setAttestationChallenge(ByteArray(32)) // Use for attestation
                    .build()
                
                generator.initialize(spec)
                generator.generateKeyPair()
            }
            
            val keyEntry = keyStore.getEntry(KEY_ALIAS, null) as KeyStore.PrivateKeyEntry
            return keyEntry.privateKey
        }
        
        fun signDigest(digest: ByteArray): ByteArray {
            val keyStore = KeyStore.getInstance(KEYSTORE_TYPE)
            keyStore.load(null)
            val keyEntry = keyStore.getEntry(KEY_ALIAS, null) as KeyStore.PrivateKeyEntry
            val signature = Signature.getInstance("SHA256withECDSA")
            signature.initSign(keyEntry.privateKey)
            signature.update(digest)
            return signature.sign()
        }
    }
}
```

### 3. Real-Time Audio Hashing

#### iOS (CryptoKit)
```swift
final class MicRecorder {
    private let engine = AVAudioEngine()
    private var file: AVAudioFile?
    private var hasher = SHA256()
    
    func start() throws -> URL {
        // Force built-in microphone
        try enforceBuiltInMic()
        
        // Create audio file
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".wav")
        file = try AVAudioFile(forWriting: url, settings: format.settings)
        
        // Install tap for hashing and recording
        let input = engine.inputNode
        input.installTap(onBus: 0, bufferSize: 2048, format: format) { buffer, _ in
            // Hash audio data
            if let data = buffer.int16DataLE() {
                hasher.update(data: data)
            }
            
            // Write to file
            try? self.file?.write(from: buffer)
        }
        
        engine.prepare()
        try engine.start()
        return url
    }
    
    func stop() -> Data {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        return hasher.finalize()
    }
}
```

#### Android (MessageDigest)
```kotlin
class Recorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private val digest = MessageDigest.getInstance("SHA-256")
    private val chunks = mutableListOf<ByteArray>()
    
    fun startRecording(nonce: String): Boolean {
        // Check for external microphones
        if (!enforceBuiltInMic(context)) {
            return false
        }
        
        recorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setOutputFile(getTempFile(nonce))
            prepare()
            start()
        }
        
        // Start hashing audio chunks
        startHashingThread()
        return true
    }
    
    private fun startHashingThread() {
        Thread {
            while (recorder != null && recorder!!.state == MediaRecorderState.RECORDING) {
                val chunk = readAudioChunk()
                if (chunk != null) {
                    digest.update(chunk)
                    chunks.add(chunk)
                }
            }
        }.start()
    }
    
    fun stopRecording(): ByteArray {
        recorder?.apply {
            stop()
            release()
        }
        recorder = null
        return digest.digest()
    }
}
```

### 4. .digm Encrypted Format

```swift
struct DigmAudioFormat {
    // Header
    let magic: String = "DIGM"
    let version: UInt32 = 1
    let encryption: UInt8 = 1  // AES-256-GCM
    
    // Metadata
    let metadataSize: UInt32
    let metadata: [UInt8]
    
    // Encrypted Audio
    let audioSize: UInt64
    let iv: [UInt8]  // 96-bit IV for GCM
    let encryptedAudio: [UInt8]
    let tag: [UInt8]  // 128-bit authentication tag
    
    // Proof Data
    let proofSignature: [UInt8]
    let proofPublicKey: [UInt8]
    let proofNonce: String
    let proofTimestamp: UInt64
}

class DigmAudioEncoder {
    func encode(audioData: Data, proof: ProofData) throws -> Data {
        // 1. Generate AES key from device key
        let aesKey = try deriveAESKey()
        
        // 2. Encrypt audio with AES-256-GCM
        let sealedBox = try AES.GCM.seal(audioData, using: aesKey)
        
        // 3. Create .digm container
        var container = Data()
        
        // Magic
        container.append("DIGM".data(using: .utf8)!)
        
        // Version
        container.append(contentsOf: withUnsafeBytes(of: UInt32(1).littleEndian) { Data($0) })
        
        // Encryption type
        container.append(UInt8(1))  // AES-256-GCM
        
        // Metadata
        let metadata = try JSONEncoder().encode(proof.metadata)
        container.append(contentsOf: withUnsafeBytes(of: UInt32(metadata.count).littleEndian) { Data($0) })
        container.append(metadata)
        
        // Encrypted audio
        container.append(contentsOf: sealedBox.ciphertext)
        
        // Authentication tag
        container.append(sealedBox.tag)
        
        // Proof signature
        container.append(proof.signature)
        
        // Proof public key
        container.append(proof.publicKey)
        
        // Proof nonce
        container.append(proof.nonce.data(using: .utf8)!)
        
        // Proof timestamp
        container.append(contentsOf: withUnsafeBytes(of: proof.timestamp.littleEndian) { Data($0) })
        
        return container
    }
}
```

### 5. Proof Bundle Structure

```json
{
  "sha256": "base64_encoded_audio_hash",
  "signature": "base64_encoded_signature",
  "pubKey": "base64_encoded_public_key",
  "nonce": "unique_proof_nonce",
  "timestamp": "2024-01-15T10:30:00Z",
  "device": {
    "model": "iPhone 14 Pro",
    "platform": "iOS",
    "version": "17.2"
  },
  "attestation": {
    "keyStoreType": "SecureEnclave",
    "attestationChallenge": "base64_encoded_challenge"
  },
  "recording": {
    "sampleRate": 48000,
    "channels": 1,
    "duration": 120,
    "format": "PCM16LE"
  }
}
```

## Application Flow

### Recording Process

```
1. User taps "Record"
   ↓
2. Check for external microphones (FAIL if detected)
   ↓
3. Initialize Secure Enclave/Keystore key
   ↓
4. Start audio recording + real-time hashing
   ↓
5. User taps "Stop"
   ↓
6. Generate final SHA-256 hash
   ↓
7. Sign hash with device key
   ↓
8. Create proof bundle (audio + JSON)
   ↓
9. Encrypt as .digm format
   ↓
10. Export/share proof bundle
```

### Verification Process

```
1. Load .digm file
   ↓
2. Parse encrypted container
   ↓
3. Extract proof data and signature
   ↓
4. Decrypt audio with device key
   ↓
5. Rehash decrypted audio
   ↓
6. Verify signature against hash
   ↓
7. Verify attestation (optional)
   ↓
8. Verify metadata integrity
```

## Security Features

### 1. Built-in Microphone Enforcement
- **iOS**: Detects and blocks external audio sources via AVAudioSession
- **Android**: Scans AudioDeviceInfo and rejects external devices
- **Real-time monitoring**: Continuously checks for external microphone insertion

### 2. Hardware-Backed Keys
- **iOS**: Secure Enclave with .privateKeyUsage access control
- **Android**: Android Keystore with hardware-backed attestation
- **Key isolation**: Private keys never leave secure hardware

### 3. Cryptographic Proof
- **SHA-256**: Real-time audio hashing during recording
- **ECDSA signatures**: Hardware-signed proof of authenticity
- **Tamper-proof**: Any modification invalidates signature

### 4. .digm Encryption
- **AES-256-GCM**: Authenticated encryption
- **Device-specific keys**: Derived from device attestation
- **Metadata preservation**: Proof data embedded in container

## Export Structure

### iOS App Bundle
```
DeviceProofRecorder-iOS/
├── ContentView.swift              # Main UI
├── Recorder.swift                 # Audio capture + hashing
├── SecureEnclaveKey.swift         # Hardware key management
├── RecorderViewModel.swift        # State management
├── DigmAudioEncoder.swift         # .digm format encoding
├── MicChecker.swift               # External mic detection
├── ProofData.swift                # Proof bundle structure
├── DigmAudioDecoder.swift         # .digm format decoding
├── Info.plist                     # Permissions
└── README.md                      # Usage instructions
```

### Android App Bundle
```
DeviceProofRecorder-Android/
├── MainActivity.kt                 # Main activity
├── Recorder.kt                    # Audio capture + hashing
├── KeyManager.kt                  # Keystore management
├── SensorLogger.kt                # Attestation sensors
├── DigmAudioEncoder.kt            # .digm format encoding
├── MicChecker.kt                  # External mic detection
├── ProofData.kt                   # Proof bundle structure
├── DigmAudioDecoder.kt            # .digm format decoding
├── AndroidManifest.xml             # Permissions
└── README.md                       # Usage instructions
```

## Integration with DIGM Platform

### Upload to DIGM
```typescript
async function uploadProofBundle(bundle: ProofBundle) {
  // 1. Verify proof signature
  const isValid = await verifyProofSignature(bundle);
  
  if (!isValid) {
    throw new Error('Invalid proof signature');
  }
  
  // 2. Check for built-in microphone
  const micCheck = verifyBuiltInMic(bundle.attestation);
  
  if (!micCheck) {
    throw new Error('Recording not from built-in microphone');
  }
  
  // 3. Upload to Fuego blockchain
  const txHash = await fuegoBridge.createAlbumLicense({
    albumId: bundle.albumId,
    buyerKey: bundle.publicKey,
    purchaseAmount: bundle.price,
    timestamp: bundle.timestamp,
    artistKey: bundle.artistKey,
    artistSig: bundle.artistSignature,
    version: 1
  });
  
  // 4. Store encrypted audio on Eldefier network
  await uploadToEldefier(bundle.audioFile);
  
  return txHash;
}
```

## Status

### Implemented
- Hardware-backed key management (Secure Enclave/Android Keystore)
- Real-time audio hashing (SHA-256)
- Proof bundle generation
- .digm encrypted format specification

### In Progress
- External microphone detection
- Attestation challenge generation
- Complete iOS implementation
- Complete Android implementation

### Next Steps
1. Finalize .digm format encoder/decoder
2. Complete external mic detection
3. Implement attestation verification
4. Build iOS app in Xcode
5. Build Android app in Android Studio
6. Test on physical devices

