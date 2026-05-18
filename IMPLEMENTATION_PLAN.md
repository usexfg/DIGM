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
- **Retained**: `fuego-core/` (source of truth for blockchain logic), `sdks/`, and `frontend/` (for reference/future shells).

---

## 4. Development Strategy: The Unified Core

To support Desktop, iOS, and Android with a single source of truth, the project will implement a **Unified Rust Core** (`libfuego_core`).

### The Rust Workspace Structure
The core will be divided into modular crates:
- **`fuego-crypto`**: Low-level primitives (Ed25519, Curve25519, BIP39). Repurposed from `fuego-wallet` native crypto.
- **`fuego-vault`**: Key management, CD deposits, and atomic swap state machine.
- **`fuego-node`**: Pruned validator, mempool, and chain sync logic (ported from `fuego-core`).
- **`i2p-net`**: I2P router and $\mu$TP transport for private audio streaming and encrypted P2P messaging.
- **`chunk-store`**: SQLite-backed content-addressed store for encrypted audio chunks.
- **`digm-app`**: High-level business logic for PARA rewards, staking pools, and Merkle anchoring.
- **`ffi-bridge`**: UniFFI/cbindgen bindings for native shell integration.


### The Platform Shells (UI)
Instead of multiple disparate shells, the project will use a **Single-Shell Architecture** powered by **Flutter**.

- **Flutter App**: A single codebase targeting **Desktop, iOS, and Android**.
- **Native Integration**: The Flutter app will communicate with the Rust core via FFI (using the pattern established in `fuego-wallet`), ensuring native performance and full-node capabilities across all platforms.

---

## 5. Implementation Roadmap

### Phase A: The Rust Foundation
1.  **Initialize `libfuego_core` workspace**.
2.  **Port Fuego Vault**: Establish key management, ring signature logic, and atomic swap primitives.
3.  **Implement I2P/$\mu$TP Bridge**: Enable private P2P connectivity and encrypted messaging.
4.  **Build Chunk Store**: Implement the SQLite-backed content-addressed system with LRU eviction.
5.  **Develop Merkle Anchoring**: Create the mechanism to publish state roots to Fuego L1.
6.  **Pruned Node Integration**: Implement the pruned blockchain sync and header verification.


### Phase B: Platform Integration
1.  **Flutter Desktop MVP**: Connect the Rust core to a Flutter desktop app to validate the end-to-end flow (Wallet $\rightarrow$ Node $\rightarrow$ I2P $\rightarrow$ Audio).
2.  **Audio Performance Tuning**: Implement I2P pre-fetching and predictive buffering.
3.  **Mobile FFI**: Implement the `ffi-bridge` for Swift and Kotlin.
4.  **Mobile Shells**: Build out the native iOS and Android UIs.
5.  **Optimization**: Implement pruning modes, fast-sync snapshots, and background refresh strategies for mobile nodes.

---

## 6. Key Variables for Resolution
The following design gaps are to be resolved during the implementation of the `digm-app` crate:
- **Merkle Root Auth**: Defining the publisher transaction type and authentication method.
- **Streaming Proofs**: Calibrating the PCM amplitude thresholds and not-a-bot scoring.
- **Economic Tuning**: Finalizing the VOX transmutation curves and CURA burn ratios.
- **Sunk-Cost Parameters**: Defining the wallet-age ramp length and streak multipliers.
