# DIGM Audio Format Strategy

## Overview
This document outlines the audio format strategy for the DIGM platform, covering both streaming and download formats, storage considerations, and the transition plan from GitHub to decentralized storage.

## Audio Formats

### Streaming/Preview Tracks (Paradio)
- **Format**: Opus
- **Bitrate**: 96kbps VBR (Variable Bit Rate)
- **Container**: OGG
- **Purpose**: Optimized for streaming preview singles on Paradio
- **Benefits**: 
  - ~3x smaller than MP3 at equivalent quality
  - Excellent for voice and music
  - Royalty-free, open standard
  - Supported by all modern browsers

### Album Downloads
- **Format**: FLAC (Free Lossless Audio Codec)
- **Quality**: Lossless (same as source)
- **Purpose**: Full album downloads for purchased content
- **Benefits**:
  - Perfect quality preservation
  - Open source, royalty-free
  - Supports metadata and album art
  - Future-proof format

### Source Files (Artist Upload)
- **Accepted**: WAV, AIFF, FLAC (uncompressed)
- **Maximum size**: 100MB per track
- **Quality**: 44.1kHz/16-bit minimum, 48kHz/24-bit recommended

## Storage Strategy

### Phase 1: GitHub (MVP)
- **Repository structure**: Multiple repos within usexfg organization
- **File limits**: 100MB per file, 1.5GB per album, 5GB per repo
- **Organization**:
  - `digm-audio-1`, `digm-audio-2`, etc.
  - Each album gets dedicated folder
  - Encrypted files stored as Git LFS objects

### Phase 2: IPFS Migration
- **Trigger**: When treasury reaches $10,000 USD equivalent
- **Benefits**: 
  - Permanent, decentralized storage
  - No file size limits
  - Content addressing for integrity
  - Global distribution
- **Transition**: Gradual migration with dual hosting during transition

## File Structure

### Album Storage
```
albums/
├── album-id/
│   ├── metadata.json
│   ├── preview-singles/
│   │   ├── track-1.opus
│   │   ├── track-2.opus
│   │   └── track-3.opus
│   ├── full-tracks/
│   │   ├── track-1.flac
│   │   ├── track-2.flac
│   │   └── track-3.flac
│   └── artwork/
│       ├── cover.jpg
│       ├── track-1.jpg
│       └── track-2.jpg
```

### Encryption Strategy
- **Preview tracks**: Public AES-256-CBC encryption (Elderfiers can decrypt)
- **Full tracks**: Artist-specific AES-256-CBC encryption (requires license)
- **Keys**: Derived from album ID + track ID + artist private key

## Hosting

### GitHub Repositories
- **Primary**: usexfg/digm-platform (code and metadata)
- **Audio**: usexfg/digm-audio-1, digm-audio-2, etc.
- **CDN**: GitHub Pages for metadata, raw.githubusercontent.com for audio
- **Backup**: Multiple geographic mirrors

### DIGM Coin Economy & Market Participants

#### Token Ecosystem
- **XFG (Fuego)**: Primary payment token for album purchases
  - Fixed supply: 18.4 million XFG
  - Used for: Album purchases, Elderfier staking, transaction fees
  - Price discovery: Market-based via DEX listings

- **PARA (Stellar)**: Listener/artist reward token
  - Inflationary: Distributed through Paradio listening rewards
  - Used for: Artist tipping, premium features, governance voting
  - Earning mechanism: 1 PARA per minute of verified listening

- **CURA (Fuego colored-coin)**: Curation & governance token
  - Fixed supply: 100 million CURA (minted once)
  - Used for: Playlist curation incentives, DAO proposals & voting, reputation staking
  - Distribution: Earned by curators for engagement (playlist plays, follows, shares)
  - Utility: Boost playlist visibility, stake in curation markets, delegate voting power

#### Market Participants

**Artists**
- **Revenue streams**:
  - Album sales (XFG payments)
  - PARA tips from listeners
  - Paradio streaming rewards (PARA)
- **Costs**:
  - Upload/storage fees (minimal, subsidized initially)
  - Elderfier service fees (XFG)

**Listeners**
- **Earning**: PARA tokens for verified listening on Paradio
- **Spending**: XFG for album purchases, PARA for tipping
- **Staking**: PARA for governance participation

**Elderfiers**
- **Role**: Advanced nodes providing P2P audio seeding and decryption
- **Requirements**: 800 XFG stake + technical infrastructure
- **Rewards**:
  - XFG fees for audio decryption services
  - PARA rewards for reliable seeding
  - Network governance rights

**Liquidity Providers**
- **Function**: Provide XFG liquidity for USD price stability
- **Incentives**: Trading fees from DEX pools
- **Risk**: Impermanent loss, smart contract risk

**Record Labels & Producers**
- **Role**: Aggregate rights holders managing multiple artists and releases
- **Revenue sharing**: Smart contracts automatically split XFG (and PARA) according to agreed splits
- **CURA staking**: Labels stake CURA to promote catalog playlists and secure front-page rotation
- **Services**:
  - Bulk catalog uploads & metadata management
  - On-chain royalty tracking and automated payouts
  - Marketing boosts via CURA spend or stake-and-earn campaigns

**Curators / Playlist Creators**
- **Role**: Curating poignant,custom themed playlists & Paradio's Curatioℕation Station takeovers that drive discovery
- **Earnings**:
  - CURA coin owners (Curators) receive 20% tips from listeners
- **Staking**:
  - Curators lock CURA against playlists; higher stake → higher algorithmic visibility
  - Slashing if playlists violate community guidelines (e.g., spam, infringing content)
- **Governance**: Significant CURA holders can propose changes to recommendation algorithms and curation reward formulas

**Arbitrageurs**
- **Opportunity**: Price differences between USD target pricing and market XFG price
- **Mechanism**: Buy/sell pressure maintains artist pricing stability
- **Tools**: Real-time oracle feeds, automated trading

#### Economic Flows
1. **Album Purchase**: Listener → Smart Contract → Artist (XFG)
2. **Streaming Rewards**: Protocol → Listener (PARA) → Artist (PARA tips)
3. **Elderfiers**: Artist/Listener → Elderfier (XFG fees)
4. **Arbitrage**: Market → Price stability → Artist pricing maintained

#### Price Stability Mechanisms
- **USD Target Pricing**: Artist sets USD price, XFG amount adjusts automatically
- **Oracle Integration**: Real-time XFG/USD price feeds
- **Volatility Bands**: ±10% tolerance before price updates
- **Arbitrage Incentives**: Profit opportunities maintain peg

### Migration Timeline
- **Month 1-3**: GitHub hosting with 100MB track limit
- **Month 4-6**: IPFS integration begins with popular albums
- **Month 7-12**: Full IPFS migration, GitHub becomes backup
- **Year 2+**: Permanent IPFS hosting with Filecoin incentives

## Quality Assurance

### Audio Validation
- **Format verification**: Automated checks for correct encoding
- **Quality gates**: Spectral analysis for bitrate compliance
- **Integrity checks**: SHA-256 hashes for all files
- **Preview generation**: Automated Opus conversion with quality validation

### Monitoring
- **Storage usage**: Track repository size growth
- **Access patterns**: Monitor download/streaming metrics
- **Performance**: CDN response times and availability
- **Cost tracking**: Storage and bandwidth expenses

## Future Considerations

### Advanced Features
- **Adaptive bitrate**: Multiple Opus quality levels
- **Spatial audio**: Dolby Atmos/360 Reality Audio support
- **Hi-res streaming**: 96kHz/24-bit for premium tiers
- **AI mastering**: Automated quality enhancement

### Storage Evolution
- **Arweave integration**: Permanent storage for classic albums
- **Filecoin incentives**: Decentralized storage marketplace
- **CDN optimization**: Global edge caching
- **P2P improvements**: Direct artist-to-listener streaming
