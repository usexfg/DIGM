
## DIGM Development Guide: Works-Now MVP and Phased Full Vision

This guide explains how to ship a simplified version of DIGM that works immediately (web-first, album-centric, minimal infra), and a separate phased roadmap to reach the full in-network Fuego + on-chain vision.

### Core assumptions (album-first)
- Albums are the primary marketplace unit. No per-track NFTs.
- Access is at the album level. Tracks inherit album rights.
- Up to two artist-selected tracks per album are marked as previews and can stream freely and be submitted to Paradio.
- DIGM colored coin is the only 'NFT'-like token and is used solely to sign album release transactions (type 0x0A). Required for uploads (limits to 10 releases per coin; updates free). No coin = no uploads.
- Artist addresses: XFG only (no Stellar).
- Purchases: In XFG only. HEAT used for verifiable wallet balance/stake verification.


## Part A — Works-Now MVP (ship in days)

### 0) Repo focus, prerequisites, and one-command run
- Primary app: `frontend-arch`
- Node: v18+ (LTS recommended)
- One-command dev:
```bash
cd frontend-arch
npm ci
npm run dev
```
- One-command prod build:
```bash
cd frontend-arch
npm run build
# preview locally
npx serve -s build
```


### 1) Environment and feature flags
Create `.env` and wire feature flags. Suggested variables:
```
# Feature flags (true/false)
VITE_FEATURE_WEBTORRENT=false
VITE_FEATURE_ENTITLEMENTS=false
VITE_FEATURE_PAYMENTS=true

# Catalog
VITE_CATALOG_URL=/assets/catalog/albums.json

# Optional object storage origin for assets (S3/R2 or static hosting)
VITE_ASSET_ORIGIN=https://your-cdn-or-bucket.example.com

# Wallets (configure as needed)
VITE_STELLAR_NETWORK=testnet
```

Example lightweight `featureFlags.ts` shape (client-only):
```ts
export const featureFlags = {
  webtorrent: import.meta.env.VITE_FEATURE_WEBTORRENT === 'true',
  entitlements: import.meta.env.VITE_FEATURE_ENTITLEMENTS === 'true',
  payments: import.meta.env.VITE_FEATURE_PAYMENTS === 'true',
};
```


### 2) Album-centric catalog (GUN database, P2P)
- **Metadata Storage**: GUN database for real-time album catalog sync
- **Preview Audio**: Short clips (30-60s) stored directly in GUN
- **Full Audio**: WebTorrent with Eldernode guaranteed seeding
- **Cover Art**: Small images in GUN, larger assets via WebTorrent

GUN Schema (P2P database structure):
```typescript
// Albums collection in GUN
gun.get('albums').get('album_001').put({
  albumId: "album_001",
  title: "Album Title", 
  artistName: "Artist",
  artistId: "artist_abc",
  description: "Optional blurb",
  releaseDate: "2025-09-01",
  genre: ["electronic"],
  priceXFG: 1.5,
  coverImage: base64SmallCover, // <50KB optimized image
  paradioPreviewTrackIds: ["track_001", "track_003"],
  payment: {
    paymentCode: "PC01000102a1b2c3...", // BIP47-style
    artistKey: "02a1b2c3..."
  },
  createdAt: 1672531200,
  updatedAt: 1672531200
})

// Tracks with preview audio + WebTorrent references  
gun.get('tracks').get('track_001').put({
  trackId: "track_001",
  albumId: "album_001", 
  title: "Intro",
  durationSec: 122,
  isPreview: true,
  previewAudio: base64_30SecClip, // ~1MB preview stored in GUN
  magnetURI: "magnet:?xt=urn:btih:abc123...", // Full track WebTorrent
  contentHash: "sha256:def456...",
  fileSize: 4194304 // bytes
})

gun.get('tracks').get('track_002').put({
  trackId: "track_002", 
  albumId: "album_001",
  title: "Main",
  durationSec: 284,
  isPreview: false,
  // No previewAudio for non-preview tracks
  magnetURI: "magnet:?xt=urn:btih:xyz789...", 
  contentHash: "sha256:ghi012...",
  fileSize: 10485760
})
```
**Hybrid Storage Architecture**:
- **GUN Database**: Real-time metadata sync across all peers
- **Preview Audio**: 30-60s clips stored directly in GUN (~1MB each)
- **GitHub Vault**: Encrypted full audio files (free, reliable, public but useless)
- **Elderfier Network**: Staked validators provide guaranteed seeding + decryption services
- **WebTorrent Fallback**: P2P distribution when Elderfiers are busy
- **Content Addressing**: SHA256 hashes for integrity verification

**Environment Configuration**:
```env
# P2P Network
VITE_GUN_PEERS=wss://gun1.digm.io/gun,wss://gun2.digm.io/gun
VITE_ELDERFIER_TRACKERS=wss://elderfier1.digm.io:8000,wss://elderfier2.digm.io:8000

# Storage
VITE_GITHUB_AUDIO_VAULT=https://github.com/digm/audio-vault/raw/main/
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Feature flags
VITE_FEATURE_WEBTORRENT=true
VITE_FEATURE_GUN_STORAGE=true
VITE_FEATURE_GITHUB_VAULT=true
VITE_FEATURE_ELDERFIER_SEEDING=true
```


### 3) Playback UI and local playlist persistence
- Ensure album list/grid, album detail with tracks, audio player, queue/playlist are wired to the catalog.
- Local persistence file: `frontend-arch/src/utils/playlistStorage.ts` (use `localStorage`).
- Gating (MVP):
  - Guests: Can stream preview tracks only.
  - Premium access: Requires 0.1 XFG or 1M HEAT wallet balance (verifiable, no payment required).
  - Owners (placeholder until licenses): Feature-flag off; for MVP, leave full-album stream disabled by default.
- Components of interest in `frontend-arch/src/components/`:
  - Album list/discovery
  - Album detail (shows tracks and gates non-preview tracks)
  - Player/Queue controls
  - Paradio preview surface


### 4) Minimal upload flow (no backend)
Goal: Allow adding albums to the catalog with minimal friction.
- **DIGM Coin Gate**: Client verifies artist holds a DIGM coin with available release slots before allowing upload.
- Storage options:
  - Easiest: Commit audio/cover to `frontend-arch/public/assets/` during development.
  - Production: Upload to S3/Cloudflare R2 and reference via `VITE_ASSET_ORIGIN`.
- Steps to add an album:
  1) Verify DIGM coin and sign 0x0A txn for the album (consumes 1 release slot).
  2) Place audio at `public/assets/audio/<albumId>/track_*.mp3` and cover art at `public/assets/covers/<albumId>.*` or upload to your bucket and note the URLs.
  3) Hash each audio file with `shasum -a 256`.
  4) Add an album entry to `public/assets/catalog/albums.json` with `isPreview` set on up to two tracks.
  5) Restart dev server or redeploy static site.

Optional: Maintain a small `tools/catalog-validate.js` to validate schema locally.


### 5) Wallet connect and payments (XFG payments, HEAT verification)
- Create a thin service in `frontend-arch/src/services/wallet.ts` that:
  - Connects to Fuego wallet providers for XFG transactions and HEAT balance checks.
  - Exposes `getPublicKey()`, `sendTip({ destination, amount, memo })`, `getHEATBalance()`.
- UI:
  - Add a Connect Wallet button (global header or album page).
  - On album page, show artist XFG address and XFG payment functionality.
  - Display HEAT balance as verifiable wallet status/stake indicator.
  - Check for premium access: 0.1 XFG or 1M HEAT balance gates premium features.
  - After payment, show a link to Fuego block explorer.
- Set `VITE_FEATURE_PAYMENTS=true` to enable payments.
- Note: Artists may optionally list PARA Stellar addresses in their profiles (self-managed), but platform only facilitates XFG payments.

Payment flow (MVP): client constructs an XFG payment transaction and hands off to the wallet for signing/broadcast. HEAT used for verification only. Album purchases create licenses; other payments don't affect access.


### 5a) Private payment addresses (BIP47-style, MVP)
- Do not publish plaintext XFG addresses in catalog or on-chain metadata.
- Use BIP47-style payment codes: Artist publishes a reusable payment code, wallets derive unique addresses per transaction.
- BIP47-style implementation:
  1. **Artist setup**: Generate payment code from master private key: `paymentCode = extendedPubKey(masterKey)`
  2. **Payment derivation**: Wallet generates ephemeral keypair, derives shared secret: `sharedSecret = ECDH(ephemeralPriv, paymentCode)`
  3. **Unique address**: Derive payment address: `paymentAddr = deriveXFGAddress(sharedSecret, paymentIndex)`
  4. **Artist claims**: Artist derives matching private key: `paymentPriv = derivePrivateKey(masterKey, sharedSecret, paymentIndex)`
- Catalog schema: Replace direct addresses with `paymentCode` field
- UI: Show "private payment handle" only; never display the derived payment address
- Privacy: Each payment goes to a different address, unlinkable without the master key
- Future upgrade: Full stealth addresses in Phase 6+ for maximum privacy (no payment code reuse)

### 6) Paradio previews
- Ensure only `isPreview=true` tracks can be added to the Paradio queue/feed.
- The Paradio view should draw from all album previews in the catalog (or the artist’s selected two).


### 7) Optional: WebTorrent streaming (behind flag)
- Implement `frontend-arch/src/utils/webtorrentClient.ts` that can add torrents by magnet or infoHash.
- For each track, optionally include `magnetUri` in the catalog; when `featureFlags.webtorrent` is true, prefer torrent playback, otherwise fallback to `audioUrl`.
- Run one dedicated seeder (container or desktop app) to ensure availability.


### 8) Build, deploy, and monitor
- Build: `npm run build` in `frontend-arch`.
- Deploy: any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront).
- Telemetry (MVP): Console or simple endpoint-free logging (e.g., Logflare endpoint if available). Track: play, tip, errors.
- Backups: Keep `albums.json` and asset backups (nightly snapshot).


### 9) Acceptance criteria for MVP
- App loads and can list albums, view album details, and play preview tracks.
- Tips can be sent to an artist’s Stellar address via a connected wallet.
- Up to two previews per album are streamable and visible to Paradio.
- Optional WebTorrent works when enabled, with seamless fallback.


## Part B — Phased plan to the full DIGM vision

### Phase 1 — DIGM colored coin signing for uploads (1 week; now first as foundation)
- Implement client-side DIGM coin checks in `frontend-arch/src/utils/digmCoin.ts`: Verify coin ownership and available slots (up to 10 releases).
- Use the DIGM colored coin to sign album release transactions (type 0x0A).
- Support up to 10 album releases per coin; 0x0A update transactions do not count against the release limit.
- Include in 0x0A payload: `albumId`, `contentHash`, `paymentCommitment`, optional `resolverPubKey`, and a signature by the colored coin key.
- Client verifies the 0x0A signature when ingesting or displaying album releases; show signer and transaction hash.
- Bind uploads to signed releases: No valid signature = no catalog addition.

Acceptance:
- Artists must hold/sign with DIGM coin to upload; limits enforced, updates free (minus standard txn fee of 0.008 XFG for album update txn).

### Phase 2 — Album license system (0x0B transactions; 1–2 weeks)
- **On-chain licensing**: Use transaction extra type 0x0B for album licenses (no smart contracts needed until C0DL3).
- **Purchase flow**: XFG payment creates 0x0B transaction with license data (albumId, buyer, artist signature, amount).
- **Client implementation**: `frontend-arch/src/utils/licenseCheck.ts` scans blockchain for 0x0B transactions:
  - Query Fuego RPC for transactions containing album licenses
  - Verify artist signature and purchase authenticity
  - Cache license ownership locally for performance
- **Gating logic**: License holders stream full album; non-holders see CTA to purchase with XFG.
- **Privacy integration**: Works with BIP47-style payment codes for private purchases.
- **Flags**: `VITE_FEATURE_LICENSES=true` to enable license gating.
- **Migration ready**: Easy upgrade path to C0DL3 smart contracts when available.

Acceptance:
- Users can purchase albums with XFG, creating verifiable 0x0B license transactions on Fuego blockchain.
- Client correctly identifies license ownership and gates content accordingly.

### Phase 3 — Content addressing and hybrid distribution (1–2 weeks)
- Add `contentHash` for all assets (already in catalog).
- Introduce torrent metadata (magnet/infoHash) for each track and seed from a managed node.
- Playback order: Torrent if available → CDN/object-store fallback.
- Ensure catalog entries contain both `audioUrl` and `magnetUri` for smooth migration.

Acceptance:
- Majority of playback served via P2P when flag is on; fallback remains seamless.

### Phase 4 — Electron app + bridge to Fuego core (2–4 weeks, iterative)
- Package the app using the `renderer/` + `src/main/` Electron setup.
- Implement thin bridges in `dist/main/fuego-bridge.js` to communicate with `fuego-core`.
- Start by exposing read-only APIs (e.g., content discovery cache) and progress to streaming coordination.

Acceptance:
- Desktop app builds on macOS/Windows/Linux; bridge calls work behind a feature flag.

### Phase 5 — P2P audio features and incentives (multi-sprint)
- Reputation and seeding incentives for nodes contributing bandwidth.
- Session keys and QoS routing per `docs/P2P_Audio_Architecture.md`.
- Payments: expand from tips/vouchers to splits, recurring memberships, and automated artist payouts.

Acceptance:
- Basic incentive signals in place; measurable contribution and QoS improvements.

### Phase 6 — Stealth addresses and multi-chain bridging (multi-sprint)
- **Stealth addresses**: Upgrade from BIP47-style to full stealth addresses for maximum privacy
  - Artist publishes view key and spend key (no reusable payment codes)
  - Each payment generates completely unique, unlinkable addresses
  - Requires blockchain scanning but provides perfect privacy
- Bridge vouchers and, where relevant, colored-coin recognition/attestation across chains (when required), using `dist/main/para-bridge.js` as the interface.
- Robust accounting and audit trails for entitlements and payouts.

Acceptance:
- Full stealth address implementation provides maximum payment privacy
- Cross-chain voucher recognition and colored coin attestation work; accounting matches on-chain events.

### Phase 7 — Observability, moderation, and ops hardening (continuous)
- Telemetry dashboards (errors, play-through, tip/purchase success, torrent availability).
- Content moderation workflow for uploads and preview selection.
- Automated backups and disaster recovery for catalog and media.


## Checklists

### MVP engineering checklist
- [ ] `frontend-arch` runs locally with one command
- [ ] `.env` prepared; feature flags read at runtime
- [ ] `albums.json` populated; preview tracks marked
- [ ] Album list/detail + player wired to catalog
- [ ] Gating: only previews stream without premium access (0.1 XFG or 1M HEAT)
- [ ] Wallet connect + XFG payment functionality working
- [ ] Paradio view shows only preview tracks
- [ ] Optional WebTorrent behind flag with fallback
- [ ] Production build deployed to static host

### Album Licenses (Phase 2) checklist
- [ ] Implement `licenseCheck.ts` with blockchain scanning for 0x0B transactions
- [ ] Album purchase flow creating 0x0B license transactions
- [ ] Artist signature verification for license authenticity
- [ ] License ownership caching and performance optimization
- [ ] Gating toggled by `VITE_FEATURE_LICENSES`
- [ ] Integration with BIP47-style private payment codes


## Appendix: Practical tips
- Keep catalog small and cache-friendly; version it with a `version` field.
- Prefer `.mp3` or `.m4a` for broad browser support in MVP; introduce lossless later for owners.
- Store `contentHash` now to ease future migration to pure content-addressed storage.
- Use feature flags to merge work early without blocking the MVP.
