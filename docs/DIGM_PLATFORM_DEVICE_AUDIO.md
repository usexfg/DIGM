# DIGM Platform: Device-Only Audio Architecture

## Vision

Transform DIGM platform into a **device-first audio ecosystem** where all audio originates from device microphones with cryptographic proof of origin. This creates a new paradigm for audio content creation, ownership, and distribution.

## Core Principle

**All DIGM audio must be recorded on-device with hardware-backed cryptographic signatures.**

### Why Device-Only Audio?

1. **Authenticity Guarantee**: Cryptographic proof that audio came from specific device
2. **Artistic Integrity**: Creator's original recording, not manipulated
3. **Ownership Chain**: Clear provenance from creator to consumer
4. **Fraud Prevention**: Impossible to fake device-recorded content
5. **Legal Compliance**: Court-admissible evidence with device proof

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              DIGM Device Audio Ecosystem                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Recording Layer (iOS/Android)                       │
│     └─ Voice Memo App → .digm Audio                    │
│        ├─ Built-in mic enforcement                      │
│        ├─ Real-time SHA-256 hashing                     │
│        └─ Secure Enclave/Keystore signing              │
│                                                          │
│  2. Storage Layer (Fuego Blockchain + Elderfier)        │
│     ├─ Audio: Encrypted on Elderfier network           │
│     └─ Proof: 0x0B license transaction                  │
│                                                          │
│  3. Platform Layer (DIGM Web/Mobile App)                │
│     ├─ Browse device-recorded albums                   │
│     ├─ Verify proof signatures                          │
│     └─ Stream/download licensed content                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Application Stack

### 1. DIGM Voice Memo (MVP)

**Purpose**: Simple, secure audio recorder  
**Platform**: iOS (with Android to follow)

**Features**:
- ✅ One-tap recording
- ✅ Secure Enclave signing
- ✅ .digm proof generation
- ✅ Local storage of recordings
- ✅ Share recordings with proof
- ✅ Playback of recorded audio

**No Features** (Intentional Simplicity):
- ❌ No cloud sync (local only)
- ❌ No editing (raw recordings only)
- ❌ No effects (authentic audio only)
- ❌ No upload to DIGM (separate app)

### 2. DIGM Platform App

**Purpose**: Browse, purchase, and stream device-recorded albums

**Core Features**:
- ✅ Browse albums (all device-recorded)
- ✅ Verify proof signatures
- ✅ Purchase albums (XFG payments)
- ✅ Stream licensed content
- ✅ Download for offline play
- ✅ View device attestation details

---

## Recording Requirements

### Hardware Requirements

1. **Built-in Microphone Only**
   - No external microphones allowed
   - No USB audio devices
   - No Bluetooth headsets
   - No wired headsets

2. **Hardware Security**
   - Secure Enclave (iOS) or Android Keystore
   - Device attestation available
   - Hardware-backed signatures

### Audio Format

```
Format: PCM16LE
Sample Rate: 48 kHz
Bit Depth: 16-bit
Channels: Mono
Container: .digm with proof
```

### Proof Requirements

Every recording includes:
- ✅ SHA-256 hash of audio
- ✅ Hardware signature over hash
- ✅ Device public key
- ✅ Recording timestamp
- ✅ Device model information
- ✅ .digm proof JSON

---

## Content Upload Flow

### Artist Workflow

```
1. Artist records album using DIGM Voice Memo
   ↓
2. Proof files (.wav + .proof.json) saved locally
   ↓
3. Artist opens DIGM Platform App
   ↓
4. Upload album with proof files
   ↓
5. Platform verifies device signature
   ↓
6. Audio encrypted and uploaded to Elderfier
   ↓
7. 0x0B license transaction created on Fuego
   ↓
8. Album live on platform
```

### Verification Process

```typescript
async function verifyAndUpload(
    audioFile: File,
    proofFile: File
) {
    // 1. Parse proof
    const proof = JSON.parse(await proofFile.text());
    
    // 2. Hash audio
    const audioData = await audioFile.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', audioData);
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    
    // 3. Verify signature
    const valid = await verifyECDSA(
        proof.s,
        proof.h,
        proof.pubKey
    );
    
    if (!valid) {
        throw new Error('Invalid proof signature');
    }
    
    // 4. Verify hash match
    if (proof.h !== hashBase64) {
        throw new Error('Audio hash mismatch');
    }
    
    // 5. Check device attestation
    const deviceValid = verifyDeviceAttestation(proof.device);
    
    if (!deviceValid) {
        throw new Error('Invalid device attestation');
    }
    
    // 6. Upload encrypted audio
    const audioHash = await uploadToEldefier(audioFile);
    
    // 7. Create license transaction
    const txHash = await fuegoBridge.createAlbumLicense({
        albumId: generateAlbumId(),
        audioHash: audioHash,
        deviceKey: proof.pubKey,
        timestamp: proof.timestamp,
        artistKey: artistPublicKey,
        artistSig: artistSignature
    });
    
    return { txHash, audioHash };
}
```

---

## Platform Architecture

### Database Schema

```typescript
interface Album {
    id: string;
    artistId: string;
    title: string;
    coverArt: string;
    
    // Audio tracking
    audioHash: string;
    elderfierUrl: string;
    proofSignature: string;
    deviceKey: string;
    
    // Blockchain
    licenseTxHash: string;
    priceXFG: number;
    purchaseCount: number;
    
    // Metadata
    tracks: Track[];
    createdAt: Date;
    deviceAttestation: DeviceAttestation;
}

interface Track {
    trackNumber: number;
    title: string;
    duration: number;
    audioHash: string;
}

interface DeviceAttestation {
    model: string;
    platform: string;
    version: string;
    recordedAt: string;
    recordingLocation?: string;
}
```

### Verification Layer

```typescript
class DeviceAudioVerifier {
    async verifyUpload(proof: ProofBundle): Promise<VerificationResult> {
        // 1. Verify signature
        const sigValid = await this.verifySignature(proof);
        
        // 2. Verify hash
        const hashValid = await this.verifyHash(proof);
        
        // 3. Verify device
        const deviceValid = await this.verifyDevice(proof);
        
        // 4. Check device reputation
        const reputation = await this.getDeviceReputation(proof.deviceKey);
        
        return {
            valid: sigValid && hashValid && deviceValid,
            signatureValid: sigValid,
            hashValid: hashValid,
            deviceValid: deviceValid,
            reputation: reputation,
            trustLevel: this.calculateTrust(reputation)
        };
    }
    
    private async verifySignature(proof: ProofBundle): Promise<boolean> {
        // ECDSA verification with public key
        const publicKey = await this.importPublicKey(proof.pubKey);
        return await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            publicKey,
            decodeBase64(proof.s),
            decodeBase64(proof.h)
        );
    }
    
    private async verifyHash(height: HashBundle): Promise<boolean> {
        const audioHash = await this.hashAudio(proof.audioData);
        return audioHash === proof.h;
    }
    
    private async verifyDevice(proof: ProofBundle): Promise<boolean> {
        // Verify device is in trusted registry
        const device = await this.db.device.findUnique({
            where: { publicKey: proof.pubKey }
        });
        
        return device !== null && device.verified;
    }
}
```

---

## User Flows

### Artist: Record and Publish Album

```
1. Open DIGM Voice Memo
2. Tap Record for each track
3. Tap Stop after each track
4. Review recordings
5. Export as album folder
6. Open DIGM Platform App
7. Upload album folder
8. Set price in XFG
9. Add cover art and metadata
10. Publish to blockchain
11. Album live on marketplace
```

### Listener: Purchase and Stream

```
1. Browse DIGM Platform
2. Preview 30-second clips
3. Purchase album with XFG
4. 0x0B license transaction created
5. Stream full tracks
6. Download for offline
7. Verify proof signature
8. Play in DIGM player
```

### Curator: Create Playlist

```
1. Browse verified device-recorded albums
2. Add tracks to playlist
3. Share playlist link
4. Listeners can purchase tracks
5. Curator earns PARA tokens
```

---

## Trust Model

### Device Reputation

Every device has a reputation score:

```typescript
interface DeviceReputation {
    publicKey: string;
    recordingsCount: number;
    purchaseCount: number;
    averageRating: number;
    trustScore: number;
    verified: boolean;
    attestationLevel: 'basic' | 'hardware' | 'certified';
}
```

### Trust Levels

1. **Basic**: First upload, no history
2. **Hardware**: Verified device with Secure Enclave attestation
3. **Certified**: High reputation, many verified uploads
4. **Verified Artist**: Official DIGM artist status

### Trust Signals

- ✅ Hardware attestation present
- ✅ Multiple successful uploads
- ✅ Purchases from verified buyers
- ✅ Positive ratings
- ✅ No fraud reports

---

## Monetization

### Pricing Model

Artists set their own prices in XFG:

```typescript
interface AlbumPricing {
    priceXFG: number;
    currency: 'XFG';
    conversionRate?: number;  // To USD for display
    dynamicPricing: boolean;  // Adjust based on demand
}
```

### Revenue Distribution

- **Artist**: 85% of sales
- **Platform**: 10% (infrastructure)
- **Curators**: 5% (discovery, playlists)

### PARA Token Rewards

- **Artists**: Earn PARA for each stream
- **Listeners**: Earn PARA for listening
- **Curators**: Earn PARA for playlist streams
- **Elder Nodes**: Earn PARA for hosting

---

## Technical Implementation

### .digm Format Integration

Use the Rust reference implementation:

```typescript
// Upload .digm file
async function uploadDigmFile(file: File) {
    // Parse .digm container
    const digmData = await parseDigmFile(file);
    
    // Extract audio and proof
    const { audio, header, signature, publicKey } = digmData;
    
    // Verify
    const isValid = await verifyDigmProof(digmData);
    
    if (!isValid) {
        throw new Error('Invalid .digm proof');
    }
    
    // Upload to platform
    return await uploadToPlatform(audio, proof);
}
```

### Elderfier Integration

```typescript
async function uploadToEldefier(audio: File) {
    // Encrypt audio
    const encrypted = await encryptAudio(audio);
    
    // Upload encrypted chunks
    const chunks = splitIntoChunks(encrypted);
    const chunkHashes = [];
    
    for (const chunk of chunks) {
        const hash = await uploadToIPFS(chunk);
        chunkHashes.push(hash);
    }
    
    // Store on Elderfier network
    const contentHash = await elderfier.storeChunks(chunkHashes);
    
    return contentHash;
}
```

---

## Content Discovery

### Search Features

- Search by artist name
- Search by album title
- Search by device model
- Search by recording date
- Search by location (if provided)
- Search by genre tags

### Curated Content

- Featured albums
- New releases
- Best sellers
- Editor picks
- Community favorites

### Filters

- Verified artists only
- Recent recordings
- Price range
- Device type
- Geographic region

---

## Security Considerations

### Attack Vectors

1. **Fake Proofs**: Signatures from non-device sources
   - **Mitigation**: Hardware attestation verification

2. **Audio Manipulation**: Edited audio with valid proof
   - **Mitigation**: Hash verification catches modifications

3. **Device Cloning**: Stolen device keys
   - **Mitigation**: Device registry tracks unusual activity

4. **Replay Attacks**: Re-using old proofs
   - **Mitigation**: Timestamp verification, nonce tracking

### Verification Chain

```
Audio → SHA-256 → Signature (Secure Enclave) → Public Key → Device Registry → Trust Score
```

---

## Migration Path

### Phase 1: MVP Launch (Week 1-2)

- ✅ DIGM Voice Memo app
- ✅ Basic .digm recording
- ✅ Local storage only

### Phase 2: Platform Integration (Week 3-4)

- ✅ Upload to platform
- ✅ Proof verification
- ✅ Album publishing
- ✅ Basic marketplace

### Phase 3: Blockchain Integration (Week 5-6)

- ✅ 0x0B license transactions
- ✅ Fuego integration
- ✅ XFG payments
- ✅ License verification

### Phase 4: Distribution (Week 7-8)

- ✅ Elderfier network integration
- ✅ Encrypted streaming
- ✅ Download functionality
- ✅ Mobile app release

---

## Success Metrics

### User Engagement

- Recordings per day
- Albums uploaded per week
- Tracks purchased per month
- Active listeners

### Platform Health

- Proof verification success rate
- Average album price
- Conversion rate (preview → purchase)
- Platform revenue (XFG)

### Technical Quality

- Proof signature validity rate
- Upload success rate
- Streaming uptime
- Download completion rate

---

## Future Enhancements

### Short Term

- Android version of Voice Memo
- Desktop recording app
- Advanced audio settings
- Cloud backup (optional)

### Medium Term

- Collaborative recording (remote)
- Live streaming support
- Voice effects (post-verification)
- Audio fingerprinting

### Long Term

- AI-powered music generation
- Virtual studio integration
- NFT minting from recordings
- DAO governance for platform

---

## Conclusion

The DIGM platform becomes a **trust-first audio ecosystem** where device-recorded content provides cryptographic guarantees of authenticity. This creates new economic models, legal frameworks, and artistic possibilities in the music industry.

**Key Advantage**: Every piece of audio on DIGM has provable origins, creating unprecedented trust and authenticity in digital music.

