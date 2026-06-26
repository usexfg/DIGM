# DIGM Implementation Plan

## 1. Project Vision
DIGM is a decentralized music marketplace built as a use-case layer on top of the Fuego network. It empowers artists to maintain 100% ownership and earnings while rewarding listeners and curators through a gamified discovery economy.

## 2. Architectural Foundation
The project follows the guidelines detailed in `DIGM_FUEGO_ARCHITECTURE_GUIDE.md`.

### Core Decisions
- **L1 Base**: Built on Fuego L1 (XFG + CD + Atomic Swaps). No L2/L3 rollups.
- **Sovereign Lite Node**: Every client runs a pruned Fuego node and an I2P router. To prevent mobile resource exhaustion, the system supports **"Sovereign" (Full) vs "Client" (Light)** modes.
- **P2P Distribution**: I2P/$\mu$TP for invisible, garlic-routed audio chunk distribution. Predictive pre-fetching and pinned seeders ensure availability for niche content.
- **Hybrid Anchoring**: App-layer state (PARA, VOX, CURA) is tracked off-chain and periodically anchored to Fuego L1 via Merkle roots. Root computation is deterministic and verifiable by all nodes.
- **Sunk-Cost Identity**: Wallet = User. Sybil resistance is achieved via soulbound state accrual (wallet-age, streaks, reputation) and a minimal XFG/HEAT gate. Social recovery mechanisms are implemented to prevent permanent state loss.

---

## 3. Repository State & Cleanup
The repository has been pruned to remove legacy experiments and non-core components:
- **Removed**: `device-proof-recorder-android/`, `device-proof-recorder-ios/`, `P2P-Radio/` (prototype), and `contracts/COLD-L3-COMPREHENSIVE-MEMORY.md`.
- **Retained**: `fuego-core/` (source of truth for blockchain logic), `frontend-arch/` (legacy TypeScript prototype — deprecated, Elderfier features removed), and `frontend/` (for reference/future shells).
- **Deprecated**: Elderfier node network, CODL3 features. Active codebase uses direct `fuegod` RPC + Rust core instead.

---

## 4. Development Strategy: The Unified Core

To support Desktop, iOS, and Android with a single source of truth, the project uses a **two-layer architecture**: the Fuego SDK for base blockchain communication, and a Rust core for DIGM-specific business logic.

### Layer 1: Fuego SDK (Base Blockchain)
The `fuego_core` Flutter package from `usexfg/fuego-sdk-flutter` provides:
- **`FuegoDaemonClient`**: HTTP JSON-RPC client for `fuegod` (get_info, get_block, get_balance, send_transaction, get_transfers, mining).
- **`FuegoCrypto`**: FFI bindings to `libfuego_crypto` for Ed25519 key generation, signing, mnemonics, address validation.
- **Network constants**: Block time, fees, CD tiers, APY rates, emission parameters.
- **Models**: Block, NetworkInfo, SyncStatus, FuegoTransaction, SendTransactionRequest.

### Layer 2: DIGM Rust Core (`libfuego_core`)
Workspace crates for music-platform-specific logic:
- **`fuego-crypto`**: Low-level primitives (Ed25519, Curve25519, BIP39).
- **`fuego-vault`**: Key management, CD deposits, and atomic swap state machine.
- **`fuego-node`**: Pruned validator, mempool, and chain sync logic (ported from `fuego-core`).
- **`i2p-net`**: I2P router and $\mu$TP transport for private audio streaming.
- **`chunk-store`**: SQLite-backed content-addressed store for encrypted audio chunks.
- **`digm-app`**: High-level business logic — PARA rewards, staking pools, Merkle anchoring, tx_extra tags (0x0A album records, 0x0B listener licenses, 0x0C CURA curation).
- **`ffi-bridge`**: UniFFI/cbindgen bindings for native shell integration.
- **`fuego-audio`**: PCM streaming and audio format handling.

### On-Chain Protocol (tx_extra tags)
DIGM uses custom `tx_extra` tags for on-chain metadata (ported from `fuego-suite` digm-coin branch):
- **`0x0A` DigmAlbumRecord**: Required for posting releases. Contains album_id, content_hash, artist_key, artist_sig. Artist must hold DIGM coin.
- **`0x0B` AlbumLicense**: Listener ownership / listening rights. Pulled from chain after purchase or staking.
- **`0x0C` CuraColoredCoin**: CURA curation colored-coin. Curator signs curation data. Ratio amounts TBD.
- **Deprecated**: `0xEF` Elderfier deposit, CODL3 features.

### The Platform Shells (UI)
- **Flutter App**: Single codebase targeting **Desktop, iOS, and Android**.
- **Connection hierarchy**: Rust API server (DIGM logic) → SDK `FuegoDaemonClient` (direct fuegod) → Mock (offline fallback).

---

## 5. Implementation Roadmap

### Phase A: The Rust Foundation (COMPLETE)
1.  **Initialize `libfuego_core` workspace** — 9 crates, all compile clean.
2.  **Port Fuego Vault** — key management, ring signature logic, atomic swap primitives.
3.  **Implement I2P/$\mu$TP Bridge** — private P2P connectivity and encrypted messaging.
4.  **Build Chunk Store** — SQLite-backed content-addressed system with LRU eviction.
5.  **tx_extra tags** — 0x0A (album record), 0x0B (listener license), 0x0C (CURA curation) structs with serialize/parse/verify in `digm-app/src/tx_extra.rs`.

### Phase B: SDK Integration (IN PROGRESS)
1.  **Fuego SDK adoption** — `fuego_core` package from `usexfg/fuego-sdk-flutter` added as git dependency. Provides `FuegoDaemonClient`, `FuegoCrypto`, network constants, and chain models.
2.  **Provider wiring** — `digm_core.dart` provider tries Rust API server → SDK `FuegoDaemonClient` → mock fallback.
3.  **Real chain queries** — replace hardcoded balances with `FuegoDaemonClient.getBalance()`, `getInfo()`, `getTransactions()`.

### Phase C: Platform Integration (NEXT)
1.  **Merkle Anchoring** — publish app-layer state roots to Fuego L1.
2.  **0x0B license scanning** — wire blockchain scanner to verify listener license ownership.
3.  **Streaming Proofs** — PCM amplitude thresholds and not-a-bot scoring.
4.  **Audio Performance Tuning** — I2P pre-fetching and predictive buffering.
5.  **Mobile FFI** — Swift/Kotlin bridge for iOS and Android.

---

## 6. Key Variables for Resolution
- **CURA curation ratios**: 0x0C tag defined but ratio amounts not yet specified.
- **VOX transmutation curves**: DIGM coin model changed from burn-to-mint to swap pool. 0x0A tag usage unchanged (required for posting releases).
- **Streaming Proofs**: PCM amplitude thresholds and not-a-bot scoring need calibration.
- **Sunk-Cost Parameters**: Wallet-age ramp length and streak multipliers TBD.
- **Merkle Root Auth**: Publisher transaction type and authentication method TBD.
